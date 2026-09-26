import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { HsnStatus } from "@/types/hsn";

export const dynamic = "force-dynamic";

const collectionName = "hsn";

type RouteContext = { params: { id: string } };
type HsnDocument = { _id: ObjectId; hsnCode: string; category: string; status: HsnStatus };

function getObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid HSN record id.");
  return new ObjectId(id);
}

function normalizePayload(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const hsnCode = String(value.hsnCode ?? "").trim();
  const category = String(value.category ?? "").trim();
  const status = value.status === "Inactive" ? "Inactive" : "Active";

  if (!/^\d{4}$/.test(hsnCode)) throw new Error("HSN Code must contain exactly four digits.");
  if (!category) throw new Error("HSN Category is required.");

  return { hsnCode, category, status: status as HsnStatus };
}

function serialize(record: { _id: { toString(): string }; hsnCode: string; category: string; status: HsnStatus }) {
  return { _id: record._id.toString(), hsnCode: record.hsnCode, category: record.category, status: record.status };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    const payload = normalizePayload(await request.json());
    const collection = (await getMongoDb()).collection<HsnDocument>(collectionName);
    if (await collection.findOne({ hsnCode: payload.hsnCode, _id: { $ne: _id } })) {
      return NextResponse.json({ error: "This HSN Code already exists." }, { status: 409 });
    }
    const result = await collection.updateOne({ _id }, { $set: payload });
    if (!result.matchedCount) return NextResponse.json({ error: "HSN record not found." }, { status: 404 });
    const record = await collection.findOne({ _id });
    return NextResponse.json({ record: serialize(record!) });
  } catch (error) {
    console.error("HSN update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update HSN record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    const result = await (await getMongoDb()).collection<HsnDocument>(collectionName).deleteOne({ _id });
    if (!result.deletedCount) return NextResponse.json({ error: "HSN record not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("HSN delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete HSN record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
