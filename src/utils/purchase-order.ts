export type PurchaseOrderLineItemLike = {
  quantity: number;
  purchaseRate: number;
  discount: number;
  gst: number;
};

export function roundCurrency(value: number) {
  return Number(Math.round((value + Number.EPSILON) * 100) / 100);
}

export function calculatePurchaseItemAmount(item: PurchaseOrderLineItemLike) {
  const quantity = Number(item.quantity ?? 0);
  const purchaseRate = Number(item.purchaseRate ?? 0);
  const discount = Number(item.discount ?? 0);
  const gst = Number(item.gst ?? 0);

  const baseAmount = roundCurrency(quantity * purchaseRate);
  const discountedAmount = roundCurrency(Math.max(baseAmount - discount, 0));
  const taxAmount = roundCurrency(discountedAmount * (gst / 100));
  const amount = roundCurrency(discountedAmount + taxAmount);

  return {
    baseAmount,
    discountedAmount,
    taxAmount,
    amount,
  };
}

export function calculatePurchaseOrderSummary(items: PurchaseOrderLineItemLike[]) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).baseAmount, 0),
  );

  const discount = roundCurrency(
    items.reduce((sum, item) => sum + Math.max(Number(item.discount ?? 0), 0), 0),
  );

  const taxableAmount = roundCurrency(Math.max(subtotal - discount, 0));
  const taxAmount = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).taxAmount, 0),
  );

  const cgst = roundCurrency(taxAmount / 2);
  const sgst = roundCurrency(taxAmount / 2);
  const igst = 0;
  const roundOff = 0;
  const grandTotal = roundCurrency(taxableAmount + taxAmount + roundOff);

  return {
    subtotal,
    discount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    roundOff,
    grandTotal,
    totalTax: taxAmount,
  };
}

export function generatePurchaseOrderNumber() {
  const today = new Date();
  const padded = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear()).slice(-2);
  const random = String(Math.floor(Math.random() * 9000) + 1000);
  return `PO-${year}${month}${padded}-${random}`;
}
