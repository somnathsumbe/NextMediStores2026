import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { dbName, getMongoClient } from "@/lib/mongodb";
import { getPayableStatus, numericAmount, PAYMENT_MODES } from "@/lib/payable-utils";

export const dynamic = "force-dynamic";

type PurchaseRecord = {
  _id: ObjectId;
  status?: string;
  supplierId?: string | ObjectId;
  billNumber?: string;
  billDate?: string;
  billDueDate?: string;
  grandTotal?: number;
  totalPaid?: number;
  outstandingAmount?: number;
  paymentStatus?: string;
  payments?: Array<Record<string, unknown>>;
};

type RouteContext = { params: { id: string } };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const purchaseId = ObjectId.isValid(params.id) ? new ObjectId(params.id) : null;
  if (!purchaseId) return errorResponse("Purchase bill was not found.", 404);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return errorResponse("Enter valid payment details.", 400);

  const paymentId = String(body.paymentId ?? "").trim();
  const paymentDate = String(body.paymentDate ?? "").trim().slice(0, 10);
  const paymentMode = String(body.paymentMode ?? "").trim();
  const referenceNumber = String(body.referenceNumber ?? "").trim();
  const remarks = String(body.remarks ?? "").trim();
  const amount = Number(body.amount);
  const today = new Date().toISOString().slice(0, 10);
  const parsedPaymentDate = /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) ? new Date(`${paymentDate}T00:00:00Z`) : null;

  if (!paymentId || !/^[a-zA-Z0-9-]{8,80}$/.test(paymentId)) return errorResponse("Unable to verify this payment request. Please try again.", 400);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse("Payment Amount must be greater than zero.", 400);
  if (!parsedPaymentDate || Number.isNaN(parsedPaymentDate.getTime()) || parsedPaymentDate.toISOString().slice(0, 10) !== paymentDate) return errorResponse("Enter a valid Payment Date.", 400);
  if (paymentDate > today) return errorResponse("Payment Date cannot be in the future.", 400);
  if (!PAYMENT_MODES.includes(paymentMode as typeof PAYMENT_MODES[number])) return errorResponse("Select a valid Payment Mode.", 400);

  const client = await getMongoClient();
  const db = client.db(dbName);
  const purchases = db.collection<PurchaseRecord>("purchase");
  const parties = db.collection("parties");
  const session = client.startSession();
  let responseRecord: Record<string, unknown> | null = null;
  let responseError: string | null = null;
  let responseStatus = 400;

  try {
    await session.withTransaction(async () => {
      responseRecord = null;
      responseError = null;
      const purchase = await purchases.findOne({ _id: purchaseId }, { session });
      if (!purchase) {
        responseError = "Purchase bill was not found.";
        responseStatus = 404;
        return;
      }

      const payments = Array.isArray(purchase.payments) ? purchase.payments : [];
      if (payments.some((payment) => payment.paymentId === paymentId)) {
        responseRecord = { id: purchase._id.toString(), totalPaid: numericAmount(purchase.totalPaid), outstandingAmount: numericAmount(purchase.outstandingAmount), paymentStatus: purchase.paymentStatus ?? "Paid", payments };
        return;
      }
      if (!purchase.billNumber?.trim()) {
        responseError = "This purchase entry has no bill number and cannot accept payment.";
        return;
      }
      if (!purchase.supplierId || !ObjectId.isValid(String(purchase.supplierId))) {
        responseError = "This purchase entry has no valid supplier. Update its supplier before recording payment.";
        return;
      }
      const supplier = await parties.findOne({ _id: new ObjectId(String(purchase.supplierId)), customerType: "Supplier" }, { session, projection: { _id: 1 } });
      if (!supplier) {
        responseError = "The supplier linked to this purchase entry was not found.";
        responseStatus = 404;
        return;
      }
      if (purchase.status === "Draft" || purchase.status === "Cancelled") {
        responseError = "Only completed purchase bills can accept payment.";
        return;
      }
      if (purchase.billDate && purchase.billDueDate && purchase.billDueDate < purchase.billDate) {
        responseError = "Bill Due Date cannot be before Bill Date.";
        return;
      }

      const billAmount = numericAmount(purchase.grandTotal);
      const totalPaid = numericAmount(purchase.totalPaid ?? payments.reduce((sum, payment) => sum + numericAmount(payment.amount), 0));
      const outstanding = Math.max(0, billAmount - totalPaid);
      if (outstanding <= 0) {
        responseError = "This bill is already fully paid.";
        return;
      }
      if (amount > outstanding) {
        responseError = "Payment Amount cannot exceed the outstanding amount.";
        return;
      }

      const nextTotalPaid = totalPaid + amount;
      const nextOutstanding = Math.max(0, billAmount - nextTotalPaid);
      const nextStatus = getPayableStatus(billAmount, nextTotalPaid, purchase.billDueDate);
      const payment = {
        paymentId,
        paymentDate,
        amount,
        paymentMode,
        referenceNumber,
        remarks,
        createdAt: new Date().toISOString(),
      };

      await purchases.updateOne({ _id: purchaseId }, {
        $push: { payments: payment },
        $set: {
          totalPaid: nextTotalPaid,
          outstandingAmount: nextOutstanding,
          paymentStatus: nextStatus,
        },
      }, { session });
      responseRecord = { id: purchase._id.toString(), billAmount, totalPaid: nextTotalPaid, outstandingAmount: nextOutstanding, paymentStatus: nextStatus, payments: [...payments, payment] };
    });
  } catch (error) {
    console.error("Payable payment save failed:", error);
    return errorResponse("Unable to save payment. Please try again.", 503);
  } finally {
    await session.endSession();
  }

  if (responseError) return errorResponse(responseError, responseStatus);
  return NextResponse.json({ record: responseRecord });
}
