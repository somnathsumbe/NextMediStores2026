import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type PurchaseDocument = { _id: ObjectId; status?: string };
type RouteContext = { params: { id: string } };

function getObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const body = await request.json();
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    if (!status) return NextResponse.json({ error: "Purchase status is required." }, { status: 400 });

    const collection = (await getMongoDb()).collection<PurchaseDocument>("purchase");
    const result = await collection.updateOne({ _id }, { $set: { status } });
    if (!result.matchedCount) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const result = await (await getMongoDb()).collection<PurchaseDocument>("purchase").deleteOne({ _id });
    if (!result.deletedCount) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
