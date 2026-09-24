import { promises as fs } from "fs";
import path from "path";
import type { Product } from "@/types/product";

const productsFilePath = path.join(process.cwd(), "src", "data", "products.json");
export const dynamic = "force-static";

async function readProducts(): Promise<Product[]> {
  try {
    const file = await fs.readFile(productsFilePath, "utf-8");
    const parsed = JSON.parse(file);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as Product[];
  } catch {
    return [];
  }
}

async function writeProducts(products: Product[]) {
  await fs.writeFile(productsFilePath, `${JSON.stringify(products, null, 2)}\n`, "utf-8");
}

function isProductRecord(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    typeof record.id === "number" &&
    typeof record.productName === "string" &&
    typeof record.batchNumber === "string" &&
    typeof record.mrp === "number" &&
    typeof record.gst === "number" &&
    typeof record.retailerMargin === "number" &&
    typeof record.ptrSellRate === "number" &&
    typeof record.manufacturer === "string" &&
    typeof record.manufactureDate === "string" &&
    typeof record.expiryDate === "string" &&
    typeof record.drugContent === "string" &&
    typeof record.packingDescription === "string" &&
    typeof record.replacement === "boolean" &&
    typeof record.discountAllow === "boolean" &&
    typeof record.dpcoProduct === "boolean" &&
    typeof record.availableQuantity === "number" &&
    typeof record.drugGroup === "string" &&
    typeof record.unitType === "string" &&
    typeof record.unitQuantity === "number" &&
    typeof record.hsn === "string"
  );
}

export async function GET() {
  try {
    const products = await readProducts();
    return Response.json(products);
  } catch {
    return Response.json({ error: "Unable to load products." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid product data." }, { status: 400 });
    }

    const product = body as Record<string, unknown>;
    const trimmedProductName = String(product.productName ?? "").trim();
    const trimmedBatchNumber = String(product.batchNumber ?? "").trim();
    const trimmedManufacturer = String(product.manufacturer ?? "").trim();
    const manufactureDate = String(product.manufactureDate ?? "").trim();
    const expiryDate = String(product.expiryDate ?? "").trim();
    const availableQuantity = Number(product.availableQuantity ?? 0);
    const unitQuantity = Number(product.unitQuantity ?? 0);

    if (!trimmedProductName || !trimmedBatchNumber || !trimmedManufacturer || !manufactureDate || !expiryDate || Number.isNaN(Number(product.mrp)) || Number(product.mrp) < 0 || Number.isNaN(Number(product.ptrSellRate)) || Number(product.ptrSellRate) < 0 || !Number.isFinite(availableQuantity) || availableQuantity < 0 || !Number.isFinite(unitQuantity) || unitQuantity <= 0) {
      return Response.json({ error: "Product validation failed." }, { status: 400 });
    }

    const sanitizedProduct: Product = {
      id: Number(product.id ?? 0),
      productName: trimmedProductName,
      batchNumber: trimmedBatchNumber,
      mrp: Number(product.mrp ?? 0),
      gst: Number(product.gst ?? 0),
      retailerMargin: Number(product.retailerMargin ?? 0),
      ptrSellRate: Number(product.ptrSellRate ?? 0),
      manufacturer: trimmedManufacturer,
      manufactureDate,
      expiryDate,
      drugContent: String(product.drugContent ?? "").trim(),
      packingDescription: String(product.packingDescription ?? "").trim(),
      replacement: Boolean(product.replacement),
      discountAllow: Boolean(product.discountAllow),
      dpcoProduct: Boolean(product.dpcoProduct),
      availableQuantity,
      drugGroup: String(product.drugGroup ?? "").trim(),
      unitType: String(product.unitType ?? "").trim(),
      unitQuantity,
      hsn: String(product.hsn ?? product.hsnCode ?? "").trim(),
      hsnCode: String(product.hsnCode ?? product.hsn ?? "").trim(),
    };

    if (!isProductRecord(sanitizedProduct)) {
      return Response.json({ error: "Invalid product data." }, { status: 400 });
    }

    const products = await readProducts();
    const normalizedName = sanitizedProduct.productName.toLowerCase();
    const normalizedBatch = sanitizedProduct.batchNumber.toLowerCase();

    const duplicate = products.some((product) => {
      return (
        product.productName.trim().toLowerCase() === normalizedName &&
        product.batchNumber.trim().toLowerCase() === normalizedBatch
      );
    });

    if (duplicate) {
      return Response.json({ error: "A product with the same name and batch already exists." }, { status: 409 });
    }

    const maxId = products.reduce((max, product) => Math.max(max, Number(product.id) || 0), 0);
    const nextProduct: Product = {
      ...sanitizedProduct,
      id: maxId + 1,
    };

    const nextProducts = [...products, nextProduct];
    await writeProducts(nextProducts);
    return Response.json(nextProduct, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to save product." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const products = await readProducts();
    await writeProducts(products);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Unable to update product data." }, { status: 500 });
  }
}
