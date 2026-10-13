import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const PAYMENT_STATUSES = ["All", "Overdue", "Due Today", "Due This Week", "Partially Paid", "Paid"];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function integerParam(value: string | null, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = integerParam(searchParams.get("page"), 1, 1, 1_000_000);
    const requestedSize = Number(searchParams.get("pageSize"));
    const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize) ? requestedSize : 10;
    const search = (searchParams.get("search") ?? "").trim();
    const supplierId = (searchParams.get("supplierId") ?? "").trim();
    const status = searchParams.get("status") ?? "All";
    const dateBy = searchParams.get("dateBy") ?? "Bill Date";
    const fromDate = searchParams.get("from") ?? "";
    const toDate = searchParams.get("to") ?? "";
    const match: Record<string, unknown> = { status: { $nin: ["Draft", "Cancelled"] } };

    if ((fromDate && !isValidDateOnly(fromDate)) || (toDate && !isValidDateOnly(toDate))) {
      return NextResponse.json({ error: "Enter valid From and To dates." }, { status: 400 });
    }
    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json({ error: "From Date cannot be after To Date." }, { status: 400 });
    }

    if (supplierId) {
      if (!ObjectId.isValid(supplierId)) {
        return NextResponse.json({ records: [], totalRecords: 0, summary: {}, supplierSummary: [], suppliers: [], page, pageSize });
      }
      match.supplierId = { $in: [supplierId, new ObjectId(supplierId)] };
    }

    if (fromDate || toDate) {
      const dateRange: Record<string, string> = {};
      if (fromDate) dateRange.$gte = fromDate;
      if (toDate) dateRange.$lte = toDate;
      if (dateBy === "Payment Date") match["payments.paymentDate"] = dateRange;
      else match[dateBy === "Due Date" ? "billDueDate" : "billDate"] = dateRange;
    }

    const today = new Date().toISOString().slice(0, 10);
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const weekEnd = endOfWeek.toISOString().slice(0, 10);

    const pipeline: object[] = [
      { $match: match },
      {
        $lookup: {
          from: "parties",
          let: { partyId: { $convert: { input: "$supplierId", to: "objectId", onError: null, onNull: null } } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$partyId"] }, customerType: "Supplier" } },
            { $project: { firmName: 1, ownerName: 1, customerType: 1, phone: 1, email: 1, address: 1, city: 1, state: 1, pincode: 1, gstnNumber: 1, registeredGSTN: 1, openingBalance: 1, openingBalanceType: 1 } },
          ],
          as: "supplierRecord",
        },
      },
      { $addFields: { supplier: { $ifNull: [{ $arrayElemAt: ["$supplierRecord", 0] }, null] } } },
      { $addFields: { totalPaid: { $ifNull: ["$totalPaid", { $sum: { $ifNull: ["$payments.amount", []] } }] } } },
      { $addFields: { outstandingAmount: { $max: [0, { $subtract: [{ $ifNull: ["$grandTotal", 0] }, "$totalPaid"] }] } } },
      {
        $addFields: {
          paymentStatus: {
            $switch: {
              branches: [
                { case: { $lte: ["$outstandingAmount", 0] }, then: "Paid" },
                { case: { $gt: ["$totalPaid", 0] }, then: "Partially Paid" },
                { case: { $and: [{ $ne: [{ $ifNull: ["$billDueDate", ""] }, ""] }, { $lt: ["$billDueDate", today] }] }, then: "Overdue" },
                { case: { $eq: ["$billDueDate", today] }, then: "Due Today" },
                { case: { $and: [{ $gt: [{ $ifNull: ["$billDueDate", ""] }, today] }, { $lte: ["$billDueDate", weekEnd] }] }, then: "Due This Week" },
              ],
              default: "Due",
            },
          },
        },
      },
    ];

    if (search) {
      const regex = escapeRegex(search);
      pipeline.push({
        $match: {
          $or: [
            { billNumber: { $regex: regex, $options: "i" } },
            { lrNumber: { $regex: regex, $options: "i" } },
            { "supplier.firmName": { $regex: regex, $options: "i" } },
            { $expr: { $regexMatch: { input: { $toString: { $ifNull: ["$voucherNumber", "$purchaseOrderNumber"] } }, regex, options: "i" } } },
            { $expr: { $regexMatch: { input: { $toString: "$_id" }, regex, options: "i" } } },
          ],
        },
      });
    }

    const statusStages = PAYMENT_STATUSES.includes(status) && status !== "All" ? [{ $match: { paymentStatus: status } }] : [];

    pipeline.push({
      $facet: {
        records: [
          ...statusStages,
          { $sort: { billDate: -1, voucherNumber: -1, _id: -1 } },
          { $skip: (page - 1) * pageSize },
          { $limit: pageSize },
        ],
        total: [...statusStages, { $count: "count" }],
        summary: [{
          $group: {
            _id: null,
            totalPayable: { $sum: "$outstandingAmount" },
            totalBills: { $sum: 1 },
            overdueAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Overdue"] }, "$outstandingAmount", 0] } },
            overdueBills: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Overdue"] }, 1, 0] } },
            dueTodayAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Due Today"] }, "$outstandingAmount", 0] } },
            dueTodayBills: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Due Today"] }, 1, 0] } },
            dueWeekAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Due This Week"] }, "$outstandingAmount", 0] } },
            dueWeekBills: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Due This Week"] }, 1, 0] } },
            partiallyPaidAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Partially Paid"] }, "$outstandingAmount", 0] } },
            partiallyPaidBills: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Partially Paid"] }, 1, 0] } },
            paidAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, { $ifNull: ["$grandTotal", 0] }, 0] } },
            paidBills: { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
          },
        }],
        supplierSummary: [{
          $group: {
            _id: "$supplierId",
            supplierName: { $first: { $ifNull: ["$supplier.firmName", "Unknown Supplier"] } },
            openingPayable: { $first: { $cond: [{ $eq: ["$supplier.openingBalanceType", "Credit"] }, { $ifNull: ["$supplier.openingBalance", 0] }, 0] } },
            purchaseAmount: { $sum: { $ifNull: ["$grandTotal", 0] } },
            paidAmount: { $sum: "$totalPaid" },
            billOutstanding: { $sum: "$outstandingAmount" },
            bills: { $sum: 1 },
          },
        },
        { $project: { _id: 0, supplierId: { $toString: "$_id" }, supplierName: 1, openingPayable: 1, purchaseAmount: 1, paidAmount: 1, outstanding: { $subtract: [{ $add: ["$openingPayable", "$purchaseAmount"] }, "$paidAmount"] }, bills: 1 } },
        { $sort: { outstanding: -1, supplierName: 1 } }],
      },
    });

    const database = await getMongoDb();
    const [result] = await database.collection("purchase").aggregate(pipeline).toArray();
    const suppliers = await database.collection("parties").find({ customerType: "Supplier" }).sort({ firmName: 1 }).project({ firmName: 1, _id: 1 }).toArray();
    const records = (result?.records ?? []).map((record: Record<string, any>) => ({
      ...record,
      _id: record._id?.toString?.() ?? "",
      id: record._id?.toString?.() ?? "",
      supplierId: record.supplierId?.toString?.() ?? "",
      supplier: record.supplier ? { ...record.supplier, id: record.supplier._id?.toString?.() ?? "", _id: record.supplier._id?.toString?.() ?? "" } : null,
    }));

    return NextResponse.json({
      records,
      totalRecords: result?.total?.[0]?.count ?? 0,
      summary: result?.summary?.[0] ?? {},
      supplierSummary: result?.supplierSummary ?? [],
      suppliers: suppliers.map((supplier) => ({ id: supplier._id.toString(), firmName: supplier.firmName })),
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Payable fetch failed:", error);
    return NextResponse.json({ error: "Unable to load payable records. Please try again." }, { status: 503 });
  }
}
