import { NextResponse } from "next/server";
import type { ObjectId, WithId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type PurchaseDocument = {
  _id?: ObjectId;
  id?: string | number;
  voucherNumber?: number;
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  status?: string;
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

    const collection = (await getMongoDb()).collection<PurchaseDocument>("purchase");
    const existing = await collection.findOne({ voucherNumber });
    if (existing) {
      return NextResponse.json({ error: "Voucher number must be unique." }, { status: 409 });
    }

    const result = await collection.insertOne(document);
    const saved = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ record: saved ? serialize(saved) : null }, { status: 201 });
  } catch (error) {
    console.error("Purchase create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
