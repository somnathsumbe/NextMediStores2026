export type PurchaseOrderLineItemLike = {
  quantity: number;
  sellRate: number;
  discountPercentage: number;
  gst: number;
};

export function roundCurrency(value: number) {
  return Number(Math.round((value + Number.EPSILON) * 100) / 100);
}

export function calculatePurchaseItemAmount(item: PurchaseOrderLineItemLike) {
  const quantity = Number(item.quantity ?? 0);
  const sellRate = Number(item.sellRate ?? 0);
  const discountPercentage = Number(item.discountPercentage ?? 0);
  const gst = Number(item.gst ?? 0);

  const grossAmount = roundCurrency(quantity * sellRate);
  const discountAmount = roundCurrency(grossAmount * (discountPercentage / 100));
  const taxableAmount = roundCurrency(Math.max(grossAmount - discountAmount, 0));
  const cgstPercentage = roundCurrency(gst / 2);
  const sgstPercentage = roundCurrency(gst / 2);
  const cgstAmount = roundCurrency(taxableAmount * (cgstPercentage / 100));
  const sgstAmount = roundCurrency(taxableAmount * (sgstPercentage / 100));
  const taxAmount = roundCurrency(cgstAmount + sgstAmount);
  const amount = roundCurrency(taxableAmount + taxAmount);

  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    cgstPercentage,
    sgstPercentage,
    cgstAmount,
    sgstAmount,
    taxAmount,
    amount,
  };
}

export function calculatePurchaseOrderSummary(items: PurchaseOrderLineItemLike[]) {
  const subtotal = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).grossAmount, 0),
  );

  const discount = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).discountAmount, 0),
  );

  const taxableAmount = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).taxableAmount, 0),
  );
  const taxAmount = roundCurrency(
    items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).taxAmount, 0),
  );

  const cgst = roundCurrency(items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).cgstAmount, 0));
  const sgst = roundCurrency(items.reduce((sum, item) => sum + calculatePurchaseItemAmount(item).sgstAmount, 0));
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
