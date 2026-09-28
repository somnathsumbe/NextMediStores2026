import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { dbName, getMongoClient } from "@/lib/mongodb";
import { applyPurchaseStockChanges } from "@/lib/purchase-inventory";

export const dynamic = "force-dynamic";

type PurchaseDocument = {
  _id: ObjectId;
  id?: string | number;
  voucherNumber?: number;
  status?: string;
  items?: Array<{ productId?: unknown; quantity?: unknown; freeQuantity?: unknown }>;
  stockApplied?: boolean;
  [key: string]: unknown;
};
type RouteContext = { params: { id: string } };

function getObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const record = await (await getMongoClient()).db(dbName).collection<PurchaseDocument>("purchase").findOne({ _id });
    if (!record) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    return NextResponse.json({ record: { ...record, _id: record._id.toString(), id: record._id.toString() } });
  } catch (error) {
    console.error("Purchase fetch by id failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const body = await request.json();
    const status = typeof body?.status === "string" ? body.status.trim() : "";
    if (!status) return NextResponse.json({ error: "Purchase status is required." }, { status: 400 });

    const client = await getMongoClient();
    const db = client.db(dbName);
    const collection = db.collection<PurchaseDocument>("purchase");
    const session = client.startSession();
    let found = false;
    try {
      await session.withTransaction(async () => {
        const current = await collection.findOne({ _id }, { session });
        if (!current) return;
        found = true;

        const wasApplied = current.stockApplied === true;
        const shouldApply = status === "Completed";
        if (wasApplied && !shouldApply) await applyPurchaseStockChanges(db, session, current.items ?? [], []);
        else if (!wasApplied && shouldApply) await applyPurchaseStockChanges(db, session, [], current.items ?? []);

        await collection.updateOne({ _id }, { $set: { status, stockApplied: shouldApply } }, { session });
      });
    } finally {
      await session.endSession();
    }
    if (!found) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : message.includes("Product ") || message.includes("quantity") || message.includes("product reference") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid purchase record." }, { status: 400 });
    }
    const document = { ...(body as Omit<PurchaseDocument, "_id">) };
    delete document._id;
    delete document.id;
    const updatedItems = Array.isArray(document.items) ? document.items as NonNullable<PurchaseDocument["items"]> : [];
    document.items = updatedItems;
    const voucherNumber = Number(document.voucherNumber);
    if (!Number.isInteger(voucherNumber) || voucherNumber <= 0) {
      return NextResponse.json({ error: "Voucher number must be a positive integer." }, { status: 400 });
    }
    document.voucherNumber = voucherNumber;

    const client = await getMongoClient();
    const db = client.db(dbName);
    const collection = db.collection<PurchaseDocument>("purchase");
    const session = client.startSession();
    let found = false;
    let duplicateVoucher = false;
    try {
      await session.withTransaction(async () => {
        const current = await collection.findOne({ _id }, { session });
        if (!current) return;
        found = true;

        const duplicate = await collection.findOne({ voucherNumber, _id: { $ne: _id } }, { session });
        if (duplicate) {
          duplicateVoucher = true;
          return;
        }

        const wasApplied = current.stockApplied === true;
        const shouldApply = document.status === "Completed";
        await applyPurchaseStockChanges(
          db,
          session,
          wasApplied ? current.items ?? [] : [],
          shouldApply ? updatedItems : [],
        );
        document.stockApplied = shouldApply;
        await collection.updateOne({ _id }, { $set: document }, { session });
      });
    } finally {
      await session.endSession();
    }
    if (!found) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    if (duplicateVoucher) return NextResponse.json({ error: "Voucher number must be unique." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase edit failed:", error);
    const message = error instanceof Error ? error.message : "Unable to edit purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : message.includes("must be unique") ? 409 : message.includes("Product ") || message.includes("quantity") || message.includes("product reference") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const _id = getObjectId(params.id);
    if (!_id) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });

    const client = await getMongoClient();
    const db = client.db(dbName);
    const collection = db.collection<PurchaseDocument>("purchase");
    const session = client.startSession();
    let deleted = false;
    try {
      await session.withTransaction(async () => {
        const current = await collection.findOne({ _id }, { session });
        if (!current) return;
        if (current.stockApplied === true) await applyPurchaseStockChanges(db, session, current.items ?? [], []);
        const result = await collection.deleteOne({ _id }, { session });
        deleted = result.deletedCount > 0;
      });
    } finally {
      await session.endSession();
    }
    if (!deleted) return NextResponse.json({ error: "Purchase record not found." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete purchase record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : message.includes("Product ") || message.includes("quantity") || message.includes("product reference") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
