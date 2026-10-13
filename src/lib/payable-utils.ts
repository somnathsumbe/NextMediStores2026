export type PayableStatus = "Paid" | "Partially Paid" | "Due" | "Due Today" | "Due This Week" | "Overdue";

export type PayablePayment = {
  paymentId: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string;
  remarks: string;
};

export type PayablePurchase = {
  id: string;
  voucherNumber?: number | string;
  purchaseOrderNumber?: string | number;
  orderDate?: string;
  billDate?: string;
  billDueDate?: string;
  billNumber?: string;
  lrNumber?: string;
  supplierId?: string;
  grandTotal?: number;
  totalPaid?: number;
  outstandingAmount?: number;
  paymentStatus?: PayableStatus;
  payments?: PayablePayment[];
  items?: Array<{
    productId?: string;
    productName?: string;
    manufacturer?: string;
    batchNumber?: string;
    hsn?: string;
    quantity?: number;
    freeQuantity?: number;
    sellRate?: number;
    discountPercentage?: number;
    gst?: number;
    amount?: number;
  }>;
  supplier?: {
    firmName?: string;
    ownerName?: string;
    customerType?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    gstnNumber?: string;
    registeredGSTN?: boolean;
    openingBalance?: number;
    openingBalanceType?: "Debit" | "Credit";
  } | null;
};

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Bank Transfer", "NEFT", "RTGS", "Cheque"] as const;

export const formatCurrency = (value: number | string | null | undefined): string => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0.00";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

export function numericAmount(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function getPayableStatus(total: number, paid: number, dueDate: string | undefined, today = new Date()) : PayableStatus {
  const outstanding = Math.max(0, total - paid);
  if (outstanding <= 0) return "Paid";
  if (paid > 0) return "Partially Paid";
  if (!dueDate) return "Due";

  const due = new Date(`${dueDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return "Due";
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  if (dueDay < current) return "Overdue";
  if (dueDay.getTime() === current.getTime()) return "Due Today";

  const weekEnd = new Date(current);
  weekEnd.setDate(weekEnd.getDate() + 7);
  if (dueDay <= weekEnd) return "Due This Week";
  return "Due";
}

export function normalizePaymentDate(value: string) {
  return value.slice(0, 10);
}
