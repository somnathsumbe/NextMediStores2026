import { ObjectId, type ClientSession, type Db } from "mongodb";

type PurchaseStockItem = {
  productId?: unknown;
  quantity?: unknown;
  freeQuantity?: unknown;
};

type ProductStockDocument = {
  _id: ObjectId;
  availableQuantity?: number;
};

function addItemsToDeltas(deltas: Map<string, number>, items: PurchaseStockItem[], direction: 1 | -1) {
  for (const item of items) {
    const productId = String(item.productId ?? "");
    const quantity = Number(item.quantity ?? 0);
    const freeQuantity = Number(item.freeQuantity ?? 0);

    if (!ObjectId.isValid(productId)) throw new Error("A purchase item has an invalid product reference.");
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(freeQuantity) || freeQuantity < 0) {
      throw new Error("Purchase and free quantities must be non-negative numbers.");
    }

    const delta = (quantity + freeQuantity) * direction;
    deltas.set(productId, (deltas.get(productId) ?? 0) + delta);
  }
}

export async function applyPurchaseStockChanges(
  db: Db,
  session: ClientSession,
  removeItems: PurchaseStockItem[] = [],
  addItems: PurchaseStockItem[] = [],
) {
  const deltas = new Map<string, number>();
  addItemsToDeltas(deltas, removeItems, -1);
  addItemsToDeltas(deltas, addItems, 1);

  const products = db.collection<ProductStockDocument>("products");
  for (const [productId, delta] of Array.from(deltas.entries())) {
    if (delta === 0) continue;
    const result = await products.updateOne(
      { _id: new ObjectId(productId) },
      { $inc: { availableQuantity: delta } },
      { session },
    );
    if (!result.matchedCount) throw new Error(`Product ${productId} was not found.`);
  }
}
