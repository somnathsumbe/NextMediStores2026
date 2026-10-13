import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type SupplierDocument = {
  firmName?: string;
  customerType?: string;
  openingBalance?: number;
  openingBalanceType?: string;
};

type PurchaseDocument = {
  _id: ObjectId;
  supplierId?: string | ObjectId;
  voucherNumber?: number | string;
  purchaseOrderNumber?: number | string;
  billNumber?: string;
  billDate?: string;
  orderDate?: string;
  grandTotal?: number;
  payments?: Array<{ paymentId?: string; paymentDate?: string; amount?: number; paymentMode?: string; referenceNumber?: string; remarks?: string }>;
};

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!ObjectId.isValid(params.id)) return NextResponse.json({ error: "Supplier was not found." }, { status: 404 });
  try {
    const db = await getMongoDb();
    const supplierId = new ObjectId(params.id);
    const supplier = await db.collection<SupplierDocument>("parties").findOne({ _id: supplierId, customerType: "Supplier" });
    if (!supplier) return NextResponse.json({ error: "Supplier was not found." }, { status: 404 });

    const purchases = await db.collection<PurchaseDocument>("purchase").find({
      supplierId: { $in: [params.id, supplierId] },
      status: { $nin: ["Draft", "Cancelled"] },
    }).sort({ billDate: 1, voucherNumber: 1 }).toArray();

    const openingBalance = supplier.openingBalanceType === "Credit" ? Number(supplier.openingBalance ?? 0) : 0;
    const entries: Array<{ date: string; voucher: string; particular: string; debit: number; credit: number; sortOrder: number }> = [];
    if (openingBalance > 0) entries.push({ date: "", voucher: "OPENING", particular: "Opening Payable", debit: openingBalance, credit: 0, sortOrder: 0 });

    for (const purchase of purchases) {
      const voucher = String(purchase.voucherNumber ?? purchase.purchaseOrderNumber ?? purchase._id);
      entries.push({
        date: String(purchase.billDate ?? purchase.orderDate ?? ""),
        voucher,
        particular: `Purchase Bill ${purchase.billNumber ?? ""}`.trim(),
        debit: Number(purchase.grandTotal ?? 0),
        credit: 0,
        sortOrder: 1,
      });
      for (const payment of purchase.payments ?? []) entries.push({
        date: String(payment.paymentDate ?? ""),
        voucher: String(payment.referenceNumber || payment.paymentId || voucher),
        particular: `${payment.paymentMode ?? "Payment"} · Bill ${purchase.billNumber ?? voucher}${payment.remarks ? ` · ${payment.remarks}` : ""}`,
        debit: 0,
        credit: Number(payment.amount ?? 0),
        sortOrder: 2,
      });
    }

    entries.sort((left, right) => left.date.localeCompare(right.date) || left.sortOrder - right.sortOrder || left.voucher.localeCompare(right.voucher));
    let balance = 0;
    const ledger = entries.map(({ sortOrder: _sortOrder, ...entry }) => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });
    const totalDebit = purchases.reduce((sum, purchase) => sum + Number(purchase.grandTotal ?? 0), 0);
    const totalCredit = purchases.reduce((sum, purchase) => sum + (purchase.payments ?? []).reduce((paid, payment) => paid + Number(payment.amount ?? 0), 0), 0);

    return NextResponse.json({
      supplier: { id: supplierId.toString(), firmName: supplier.firmName ?? "Supplier" },
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance: balance,
      entries: ledger,
    });
  } catch (error) {
    console.error("Supplier payable ledger fetch failed:", error);
    return NextResponse.json({ error: "Unable to load supplier ledger." }, { status: 503 });
  }
}
