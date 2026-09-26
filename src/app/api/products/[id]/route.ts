import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "products";

type ProductDocument = {
  _id?: ObjectId;
  productName: string;
  batchNumber: string;
  mrp: number;
  gst: number;
  retailerMargin: number;
  ptrSellRate: number;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  replacement: boolean;
  discountAllow: boolean;
  dpcoProduct: boolean;
  availableQuantity: number;
  drugGroup: string;
  unitType: string;
  unitQuantity: number;
  hsn: string;
  hsnCode?: string;
};

function normalizeProduct(body: unknown): ProductDocument {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const hsn = String(value.hsn ?? value.hsnCode ?? "").trim();
  return {
    productName: String(value.productName ?? "").trim(),
    batchNumber: String(value.batchNumber ?? "").trim(),
    mrp: Number(value.mrp ?? 0),
    gst: Number(value.gst ?? value.gstPercentage ?? 0),
    retailerMargin: Number(value.retailerMargin ?? 0),
    ptrSellRate: Number(value.ptrSellRate ?? 0),
    manufacturer: String(value.manufacturer ?? "").trim(),
    manufactureDate: String(value.manufactureDate ?? "").trim(),
    expiryDate: String(value.expiryDate ?? "").trim(),
    drugContent: String(value.drugContent ?? "").trim(),
    packingDescription: String(value.packingDescription ?? "").trim(),
    replacement: Boolean(value.replacement),
    discountAllow: Boolean(value.discountAllow),
    dpcoProduct: Boolean(value.dpcoProduct),
    availableQuantity: Number(value.availableQuantity ?? 0),
    drugGroup: String(value.drugGroup ?? "").trim(),
    unitType: String(value.unitType ?? "").trim(),
    unitQuantity: Number(value.unitQuantity ?? 0),
    hsn,
    hsnCode: hsn,
  };
}

function isValidProduct(value: Partial<ProductDocument>) {
  if (!value.productName || !value.batchNumber || !value.manufacturer || !value.manufactureDate || !value.expiryDate) return false;
  if (!String(value.hsn ?? value.hsnCode ?? "").trim()) return false;
  if (!Number.isFinite(Number(value.mrp)) || Number(value.mrp) < 0) return false;
  if (!Number.isFinite(Number(value.ptrSellRate)) || Number(value.ptrSellRate) < 0) return false;
  if (!Number.isFinite(Number(value.availableQuantity)) || Number(value.availableQuantity) < 0) return false;
  if (!Number.isFinite(Number(value.unitQuantity)) || Number(value.unitQuantity) <= 0) return false;
  if (!Number.isFinite(Number(value.gst)) || Number(value.gst) < 0) return false;
  if (!Number.isFinite(Number(value.retailerMargin)) || Number(value.retailerMargin) < 0) return false;
  return true;
}

function serialize(record: ProductDocument | null) {
  if (!record || !record._id) return null;
  return {
    ...record,
    _id: record._id.toString(),
    id: record._id.toString(),
    hsn: record.hsn ?? record.hsnCode ?? "",
  };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const _id = new ObjectId(id);
    const collection = (await getMongoDb()).collection<ProductDocument>(collectionName);
    const current = await collection.findOne({ _id });

    if (!current) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const payload = normalizeProduct(await request.json());
    const updated = { ...current, ...payload, hsn: payload.hsn || current.hsn || current.hsnCode || "", hsnCode: payload.hsnCode || payload.hsn || current.hsnCode || current.hsn || "" };

    if (!isValidProduct(updated)) {
      return NextResponse.json({ error: "Product validation failed." }, { status: 400 });
    }

    const duplicate = await collection.findOne({
      _id: { $ne: _id },
      productName: { $regex: new RegExp(`^${updated.productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$$`, "i") },
      batchNumber: { $regex: new RegExp(`^${updated.batchNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$$`, "i") },
    });

    if (duplicate) {
      return NextResponse.json({ error: "A product with the same name and batch already exists." }, { status: 409 });
    }

    await collection.updateOne({ _id }, { $set: updated });
    const refreshed = await collection.findOne({ _id });
    return NextResponse.json({ record: serialize(refreshed) });
  } catch (error) {
    console.error("Product update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update product.";
    return NextResponse.json({ error: message }, { status: /already exists/i.test(message) ? 409 : 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    const collection = (await getMongoDb()).collection<ProductDocument>(collectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Product delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}