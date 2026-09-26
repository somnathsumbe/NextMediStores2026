import { NextResponse } from "next/server";
import type { ObjectId, WithId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { HsnStatus } from "@/types/hsn";

export const dynamic = "force-dynamic";

const collectionName = "hsn";
type HsnDocument = { hsnCode: string; category: string; status: HsnStatus };

function normalizePayload(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const hsnCode = String(value.hsnCode ?? "").trim();
  const category = String(value.category ?? "").trim();
  const status = value.status === "Inactive" ? "Inactive" : "Active";

  if (!/^\d{4}$/.test(hsnCode)) throw new Error("HSN Code must contain exactly four digits.");
  if (!category) throw new Error("HSN Category is required.");

  return { hsnCode, category, status: status as HsnStatus };
}

function serialize(record: WithId<HsnDocument>) {
  return { _id: record._id.toString(), hsnCode: record.hsnCode, category: record.category, status: record.status };
}

export async function GET() {
  try {
    const records = await (await getMongoDb()).collection<HsnDocument>(collectionName).find({}).sort({ hsnCode: 1 }).toArray();
    return NextResponse.json({ records: records.map(serialize) });
  } catch (error) {
    console.error("HSN list failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load HSN records.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = normalizePayload(await request.json());
    const collection = (await getMongoDb()).collection<HsnDocument>(collectionName);
    if (await collection.findOne({ hsnCode: payload.hsnCode })) {
      return NextResponse.json({ error: "This HSN Code already exists." }, { status: 409 });
    }
    const result = await collection.insertOne(payload);
    const record = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ record: serialize(record!) }, { status: 201 });
  } catch (error) {
    console.error("HSN create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to create HSN record.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 400 });
  }
}
