export function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

export function calculatePTR(mrp: number, gst: number, retailerMargin: number): number {
  if (!Number.isFinite(mrp) || !Number.isFinite(gst) || !Number.isFinite(retailerMargin)) {
    return Number.NaN;
  }

  if (mrp <= 0) {
    return Number.NaN;
  }

  if (gst < 0) {
    return Number.NaN;
  }

  if (retailerMargin < 0 || retailerMargin > 100) {
    return Number.NaN;
  }

  const netMrp = (mrp * 100) / (100 + gst);
  const ptr = netMrp * ((100 - retailerMargin) / 100);

  return roundCurrency(ptr);
}
