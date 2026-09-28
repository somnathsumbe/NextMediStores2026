import { NextResponse } from "next/server";
import type { ObjectId, WithId } from "mongodb";
import { dbName, getMongoClient, getMongoDb } from "@/lib/mongodb";
import { applyPurchaseStockChanges } from "@/lib/purchase-inventory";

export const dynamic = "force-dynamic";

type PurchaseItemDocument = {
  id?: string | number;
  productId?: string | number;
  productName?: string;
  manufacturer?: string;
  hsn?: string;
  packageDescription?: string;
  batchNumber?: string;
  manufactureDate?: string;
  expiryDate?: string;
  quantity?: number;
  freeQuantity?: number;
  unit?: number;
  scheme?: string;
  sellRate?: number;
  mrp?: number;
  gst?: number;
  discountPercentage?: number;
  holdSale?: boolean;
  grossAmount?: number;
  discountAmount?: number;
  taxableAmount?: number;
  cgstPercentage?: number;
  sgstPercentage?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  taxAmount?: number;
  amount?: number;
};

type PurchaseDocument = {
  _id?: ObjectId;
  id?: string | number;
  voucherNumber?: number;
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  status?: string;
  items?: PurchaseItemDocument[];
  stockApplied?: boolean;
  totalItems?: number;
  totalQuantity?: number;
  freeQuantity?: number;
  subtotal?: number;
  discount?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalTax?: number;
  roundOff?: number;
  grandTotal?: number;
  [key: string]: unknown;
};

function serialize(record: WithId<PurchaseDocument>) {
  return { ...record, _id: record._id.toString(), id: record._id.toString() };
}

export async function GET() {
  try {
    const collection = (await getMongoDb()).collection<PurchaseDocument>("purchase");
    const records = await collection.find({}).sort({ orderDate: -1, voucherNumber: -1 }).toArray();
    return NextResponse.json({ records: records.map(serialize) });
  } catch (error) {
    console.error("Purchase fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load purchase records.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid purchase record." }, { status: 400 });
    }

    const document = { ...(body as PurchaseDocument) };
    delete document._id;
    delete document.id;
    const voucherNumber = Number(document.voucherNumber);
    if (!Number.isInteger(voucherNumber) || voucherNumber <= 0) {
      return NextResponse.json({ error: "Voucher number must be a positive integer." }, { status: 400 });
    }
    document.voucherNumber = voucherNumber;

    const client = await getMongoClient();
    const db = client.db(dbName);
    const collection = db.collection<PurchaseDocument>("purchase");
    const session = client.startSession();
    let saved: WithId<PurchaseDocument> | null = null;

    try {
      await session.withTransaction(async () => {
        const existing = await collection.findOne({ voucherNumber }, { session });
        if (existing) throw new Error("Voucher number must be unique.");

        const completed = document.status === "Completed";
        document.stockApplied = completed;
        if (completed) await applyPurchaseStockChanges(db, session, [], document.items ?? []);

        const result = await collection.insertOne(document, { session });
        saved = await collection.findOne({ _id: result.insertedId }, { session });
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ record: saved ? serialize(saved) : null }, { status: 201 });
  } catch (error) {
    console.error("Purchase create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : message.includes("already exists") || message.includes("must be unique") ? 409 : message.includes("quantity") || message.includes("product reference") || message.includes("Product ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
