import { NextResponse } from "next/server";
import type { ObjectId, WithId } from "mongodb";
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
  const productName = String(value.productName ?? "").trim();
  const batchNumber = String(value.batchNumber ?? "").trim();
  const manufacturer = String(value.manufacturer ?? "").trim();
  const manufactureDate = String(value.manufactureDate ?? "").trim();
  const expiryDate = String(value.expiryDate ?? "").trim();
  const drugContent = String(value.drugContent ?? "").trim();
  const packingDescription = String(value.packingDescription ?? "").trim();
  const hsn = String(value.hsn ?? value.hsnCode ?? "").trim();

  return {
    productName,
    batchNumber,
    mrp: Number(value.mrp ?? 0),
    gst: Number(value.gst ?? value.gstPercentage ?? 0),
    retailerMargin: Number(value.retailerMargin ?? 0),
    ptrSellRate: Number(value.ptrSellRate ?? 0),
    manufacturer,
    manufactureDate,
    expiryDate,
    drugContent,
    packingDescription,
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

function serialize(record: WithId<ProductDocument>) {
  return {
    ...record,
    _id: record._id.toString(),
    id: record._id.toString(),
    hsn: record.hsn ?? record.hsnCode ?? "",
  };
}

export async function GET() {
  try {
    const collection = (await getMongoDb()).collection<ProductDocument>(collectionName);
    const records = await collection.find({}).sort({ productName: 1, batchNumber: 1 }).toArray();
    return NextResponse.json({ records: records.map((record) => serialize(record)) });
  } catch (error) {
    console.error("Product fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load products.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = normalizeProduct(body);

    if (!isValidProduct(product)) {
      return NextResponse.json({ error: "Product validation failed." }, { status: 400 });
    }

    const collection = (await getMongoDb()).collection<ProductDocument>(collectionName);
    const duplicate = await collection.findOne({
      productName: { $regex: new RegExp(`^${product.productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$$`, "i") },
      batchNumber: { $regex: new RegExp(`^${product.batchNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$$`, "i") },
    });

    if (duplicate) {
      return NextResponse.json({ error: "A product with the same name and batch already exists." }, { status: 409 });
    }

    const result = await collection.insertOne(product);
    const saved = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ record: saved ? serialize(saved) : null }, { status: 201 });
  } catch (error) {
    console.error("Product create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save product.";
    return NextResponse.json({ error: message }, { status: message.includes("already exists") ? 409 : 400 });
  }
}
