import { promises as fs } from "fs";
import path from "path";
import type { Product } from "@/types/product";

const productsFilePath = path.join(process.cwd(), "src", "data", "products.json");
export const dynamic = "force-static";

async function readProducts(): Promise<Product[]> {
  const file = await fs.readFile(productsFilePath, "utf-8");
  const parsed = JSON.parse(file);
  return Array.isArray(parsed) ? parsed as Product[] : [];
}

async function writeProducts(products: Product[]) {
  await fs.writeFile(productsFilePath, `${JSON.stringify(products, null, 2)}\n`, "utf-8");
}

export async function generateStaticParams() {
  const products = await readProducts();
  return products.map((product) => ({ id: String(product.id) }));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const productId = Number(params.id);
    const body = await request.json() as Partial<Product>;
    const products = await readProducts();
    const productIndex = products.findIndex((product) => product.id === productId);

    if (!Number.isInteger(productId) || productIndex < 0) {
      return Response.json({ error: "Product not found." }, { status: 404 });
    }

    const currentProduct = products[productIndex];
    const updatedProduct: Product = {
      id: productId,
      productName: String(body.productName ?? currentProduct.productName).trim(),
      batchNumber: String(body.batchNumber ?? currentProduct.batchNumber).trim(),
      mrp: Number(body.mrp ?? currentProduct.mrp),
      gst: Number(body.gst ?? currentProduct.gst),
      retailerMargin: Number(body.retailerMargin ?? currentProduct.retailerMargin),
      ptrSellRate: Number(body.ptrSellRate ?? currentProduct.ptrSellRate),
      manufacturer: String(body.manufacturer ?? currentProduct.manufacturer).trim(),
      manufactureDate: String(body.manufactureDate ?? currentProduct.manufactureDate).trim(),
      expiryDate: String(body.expiryDate ?? currentProduct.expiryDate).trim(),
      drugContent: String(body.drugContent ?? currentProduct.drugContent).trim(),
      packingDescription: String(body.packingDescription ?? currentProduct.packingDescription).trim(),
      replacement: Boolean(body.replacement ?? currentProduct.replacement),
      discountAllow: Boolean(body.discountAllow ?? currentProduct.discountAllow),
      dpcoProduct: Boolean(body.dpcoProduct ?? currentProduct.dpcoProduct),
      availableQuantity: Number(body.availableQuantity ?? currentProduct.availableQuantity),
      drugGroup: String(body.drugGroup ?? currentProduct.drugGroup).trim(),
      unitType: String(body.unitType ?? currentProduct.unitType).trim(),
      unitQuantity: Number(body.unitQuantity ?? currentProduct.unitQuantity),
      hsn: String(body.hsn ?? currentProduct.hsn).trim(),
    };

    if (!Number.isFinite(updatedProduct.ptrSellRate) || updatedProduct.ptrSellRate < 0) {
      return Response.json({ error: "Product validation failed." }, { status: 400 });
    }

    products[productIndex] = updatedProduct;
    await writeProducts(products);
    return Response.json(updatedProduct);
  } catch {
    return Response.json({ error: "Unable to update product." }, { status: 500 });
  }
}