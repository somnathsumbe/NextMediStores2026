"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mockService } from "@/lib/mock-service";
import { partyService } from "@/lib/party-service";
import transportData from "@/data/transport-details.json";
import schemesData from "@/data/schemes.json";
import type { Party } from "@/types/party";
import { calculatePurchaseItemAmount, calculatePurchaseOrderSummary } from "@/utils/purchase-order";

type ProductRecord = {
  id: number | string;
  productName?: string;
  name?: string;
  manufacturer?: string;
  brand?: string;
  scientificName?: string;
  batchNumber?: string;
  batch?: string;
  expiryDate?: string;
  expiry?: string;
  unit?: string;
  mrp?: number;
  gst?: number;
  gstPercentage?: number;
  salePrice?: number;
  sellRate?: number;
  ptrSellRate?: number;
  availableQuantity?: number;
  stock?: number;
  category?: string;
  categoryId?: string;
  drugGroup?: string;
  hsn?: string;
  hsnCode?: string;
  unitType?: string;
  manufactureDate?: string;
  packingDescription?: string;
};

type PurchaseOrderItem = {
  id: number | string;
  productId: number | string;
  productName: string;
  manufacturer?: string;
  hsn?: string;
  packageDescription?: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  scheme: string;
  sellRate: number;
  mrp: number;
  gst: number;
  discountPercentage: number;
  amount: number;
  holdSale?: boolean;
};

type TransportRecord = {
  id: number | string;
  name: string;
  status?: string;
};

type PurchaseOrder = {
  id: number | string;
  voucherNumber: number;
  orderDate: string;
  supplierId: number | string;
  purchaseType: string;
  billNumber: string;
  billDate: string;
  billDueDate: string;
  lrNumber: string;
  dispatchDate: string;
  totalBoxes: number;
  godown: string;
  paymentMethod: string;
  paymentTerms: string;
  deliveryAddress: string;
  transporterId: number | string;
  remarks: string;
  items: PurchaseOrderItem[];
  status: "Draft" | "Completed" | "Cancelled";
};

type ToastState = { type: "success" | "error"; message: string } | null;

type FormErrors = Record<string, string>;

const paymentMethods = ["Cash", "Cheque", "Bank Transfer", "UPI", "Other"];
const paymentTermsOptions = ["Immediate", "Net 7 Days", "Net 15 Days", "Net 30 Days", "Credit"];
const purchaseTypes = ["Cash Purchase", "Credit Purchase", "Purchase Return"];
const schemes = schemesData as Array<{ id: number; name: string }>;

function formatCurrency(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function todayISO() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowISO(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function storedVoucherNumber(order: any) {
  const value = Number(order.voucherNumber ?? order.purchaseOrderNumber);
  if (Number.isFinite(value)) return value;
  const legacyMatch = String(order.purchaseOrderNumber ?? order.id ?? "").match(/(\d+)$/);
  return legacyMatch ? Number(legacyMatch[1]) : Number.NaN;
}

function nextVoucherNumber() {
  const existing = mockService.get<any>("purchaseOrders");
  const numbers = existing.map(storedVoucherNumber).filter((value) => Number.isFinite(value));
  return (numbers.length ? Math.max(...numbers) : 0) + 1;
}

function formatLongDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function normalizeProduct(product: any): ProductRecord {
  return {
    id: product.id,
    productName: product.productName || product.name || "",
    name: product.name || product.productName || "",
    manufacturer: product.manufacturer || product.brand || "",
    brand: product.brand || product.manufacturer || "",
    batchNumber: product.batchNumber || product.batch || "",
    batch: product.batch || product.batchNumber || "",
    expiryDate: product.expiryDate || product.expiry || "",
    expiry: product.expiry || product.expiryDate || "",
    unit: product.unit || product.unitType || "",
    mrp: Number(product.mrp ?? product.salePrice ?? product.purchasePrice ?? 0),
    gst: Number(product.gst ?? product.gstPercentage ?? 0),
    gstPercentage: Number(product.gstPercentage ?? product.gst ?? 0),
    salePrice: Number(product.salePrice ?? product.sellRate ?? product.ptrSellRate ?? 0),
    sellRate: Number(product.sellRate ?? product.ptrSellRate ?? product.salePrice ?? 0),
    ptrSellRate: Number(product.ptrSellRate ?? product.sellRate ?? product.salePrice ?? 0),
    availableQuantity: Number(product.availableQuantity ?? product.stock ?? 0),
    stock: Number(product.stock ?? product.availableQuantity ?? 0),
    category: product.category || "General",
    categoryId: product.categoryId || "",
    drugGroup: product.drugGroup || product.category || "General",
    hsn: product.hsn || product.hsnCode || "",
    manufactureDate: product.manufactureDate || "",
    packingDescription: product.packingDescription || "",
  };
}

function buildItemFromProduct(product: ProductRecord): PurchaseOrderItem {
  const productName = product.productName || product.name || "Unnamed Product";
  const mrp = Number(product.mrp ?? 0);
  const sellRate = Number(product.sellRate ?? product.ptrSellRate ?? product.salePrice ?? 0);
  const gst = Number(product.gst ?? product.gstPercentage ?? 0);
  const item = {
    id: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    productId: product.id,
    productName,
    manufacturer: product.manufacturer || product.brand || "",
    hsn: product.hsn || product.hsnCode || "",
    packageDescription: product.packingDescription || "",
    batchNumber: product.batchNumber || product.batch || "",
    manufactureDate: product.manufactureDate || "",
    expiryDate: product.expiryDate || product.expiry || "",
    quantity: 1,
    freeQuantity: 0,
    unit: product.unit || product.unitType || "",
    scheme: "No Scheme",
    sellRate,
    mrp,
    gst,
    discountPercentage: 0,
    amount: 0,
  };
  return { ...item, amount: calculatePurchaseItemAmount(item).amount };
}

function emptyOrder(): PurchaseOrder {
  return {
    id: `PO-${Date.now()}`,
    voucherNumber: nextVoucherNumber(),
    orderDate: todayISO(),
    supplierId: "",
    purchaseType: "Cash Purchase",
    billNumber: "",
    billDate: "",
    billDueDate: "",
    lrNumber: "",
    dispatchDate: "",
    totalBoxes: 0,
    godown: "",
    paymentMethod: "Cash",
    paymentTerms: "Immediate",
    deliveryAddress: "",
    transporterId: "",
    remarks: "",
    items: [],
    status: "Draft",
  };
}

function productMatchesSearch(product: ProductRecord, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;

  const haystack = [
    product.productName,
    product.name,
    product.manufacturer,
    product.brand,
    product.scientificName,
    product.batchNumber,
    product.batch,
  ].join(" ").toLowerCase();

  return haystack.includes(value);
}

export default function OrdersNewPage() {
  const router = useRouter();
  const toastTimeoutRef = useRef<number | null>(null);

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [transporters, setTransporters] = useState<TransportRecord[]>([]);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder>(emptyOrder());
  const [showSelector, setShowSelector] = useState(false);
  const [selectorQuery, setSelectorQuery] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<Array<number | string>>([]);
  const [expandedProductId, setExpandedProductId] = useState<number | string | null>(null);
  const [editingDraft, setEditingDraft] = useState<PurchaseOrderItem | null>(null);
  const [viewProduct, setViewProduct] = useState<PurchaseOrderItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrderItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [headerErrors, setHeaderErrors] = useState<FormErrors>({});
  const [rowErrors, setRowErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const allProducts = mockService.get<any>("products").map(normalizeProduct);
    setProducts(allProducts);
    setSuppliers(partyService.list().filter((party) => party.customerType === "Retailer" && party.active));
    setTransporters(transportData.records as TransportRecord[]);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 5000);
  };

  const summary = useMemo(() => {
    const calculationItems = purchaseOrder.items.map((item) => editingDraft?.id === item.id ? editingDraft : item);
    const items = calculationItems.map((item) => ({
      ...item,
      ...calculatePurchaseItemAmount(item),
    }));

    return {
      totalItems: purchaseOrder.items.length,
      totalQuantity: calculationItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      freeQuantity: calculationItems.reduce((sum, item) => sum + Number(item.freeQuantity || 0), 0),
      ...calculatePurchaseOrderSummary(
        calculationItems.map((item) => ({
          quantity: Number(item.quantity || 0),
          sellRate: Number(item.sellRate || 0),
          discountPercentage: Number(item.discountPercentage || 0),
          gst: Number(item.gst || 0),
        })),
      ),
      lineItems: items,
    };
  }, [editingDraft, purchaseOrder.items]);

  const filteredProducts = useMemo(() => {
    const query = selectorQuery.trim();
    return products.filter((product) => {
      const alreadyAdded = purchaseOrder.items.some((item) => String(item.productId) === String(product.id));
      if (alreadyAdded) return false;
      return productMatchesSearch(product, query);
    });
  }, [products, purchaseOrder.items, selectorQuery]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();
    return suppliers.filter((supplier) => [supplier.firmName, supplier.ownerName, supplier.phone, supplier.city].join(" ").toLowerCase().includes(query));
  }, [supplierSearch, suppliers]);

  const updateHeaderField = (field: keyof PurchaseOrder, value: string | number) => {
    setPurchaseOrder((current) => ({ ...current, [field]: value }));
    setHeaderErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleToggleProductSelection = (productId: number | string) => {
    setSelectedProductIds((current) => 
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };

  const handleAddSelectedProducts = () => {
    if (selectedProductIds.length === 0) {
      showToast("error", "Please select at least one product to add.");
      return;
    }

    const productsToAdd = products.filter((product) => selectedProductIds.includes(product.id));
    const additions: PurchaseOrderItem[] = [];
    const duplicateNames: string[] = [];

    productsToAdd.forEach((product) => {
      const alreadyPresent = purchaseOrder.items.some((item) => String(item.productId) === String(product.id));
      if (alreadyPresent) {
        duplicateNames.push(product.productName || product.name || "Product");
        return;
      }
      additions.push(buildItemFromProduct(product));
    });

    if (additions.length === 0) {
      const duplicateText = duplicateNames[0] || "Selected product";
      showToast("error", `${duplicateText} is already in the purchase order.`);
      return;
    }

    setPurchaseOrder((current) => ({
      ...current,
      items: [...current.items, ...additions],
    }));

    setShowSelector(false);
    setSelectorQuery("");
    setSelectedProductIds([]);

    if (duplicateNames.length > 0) {
      showToast("error", `${duplicateNames[0]} is already present in the purchase order.`);
    } else {
      showToast("success", `${additions.length} product(s) added successfully.`);
    }
  };

  const handleInlineEdit = (item: PurchaseOrderItem) => {
    if (expandedProductId !== null && expandedProductId !== item.id && editingDraft) {
      const currentItem = purchaseOrder.items.find((entry) => entry.id === expandedProductId);
      const hasChanges = currentItem ? JSON.stringify(editingDraft) !== JSON.stringify(currentItem) : false;
      if (hasChanges) {
        const shouldDiscard = window.confirm("You have unsaved changes. Do you want to discard them?");
        if (!shouldDiscard) return;
      }
    }

    setExpandedProductId(item.id);
    setEditingDraft({ ...item });
    setRowErrors({});
  };

  const handleInlineCancel = () => {
    setExpandedProductId(null);
    setEditingDraft(null);
    setRowErrors({});
  };

  const handleInlineSave = () => {
    if (!editingDraft) return;

    const nextErrors: FormErrors = {};

    if (!editingDraft.batchNumber?.trim()) nextErrors.batchNumber = "Batch number is required.";
    if (!editingDraft.hsn?.trim()) nextErrors.hsn = "HSN is required from Product Master.";
    if (!editingDraft.expiryDate) nextErrors.expiryDate = "Expiry date is required.";
    if (!Number.isFinite(Number(editingDraft.quantity)) || Number(editingDraft.quantity) < 0) nextErrors.quantity = "Quantity must be zero or greater.";
    if (Number(editingDraft.freeQuantity) < 0) nextErrors.freeQuantity = "Free quantity cannot be negative.";
    if (!editingDraft.unit?.trim()) nextErrors.unit = "Unit is required.";
    if (!Number.isFinite(Number(editingDraft.sellRate)) || Number(editingDraft.sellRate) < 0) nextErrors.sellRate = "Sell rate is required and cannot be negative.";
    if (Number(editingDraft.mrp) < 0) nextErrors.mrp = "MRP cannot be negative.";
    if (Number(editingDraft.gst) < 0) nextErrors.gst = "GST cannot be negative.";
    if (Number(editingDraft.discountPercentage) < 0 || Number(editingDraft.discountPercentage) > 100) nextErrors.discountPercentage = "Discount must be between 0 and 100%.";

    if (editingDraft.manufactureDate && editingDraft.expiryDate) {
      const manufactureDate = new Date(`${editingDraft.manufactureDate}T00:00:00`);
      const expiryDate = new Date(`${editingDraft.expiryDate}T00:00:00`);
      if (!Number.isNaN(manufactureDate.getTime()) && !Number.isNaN(expiryDate.getTime()) && expiryDate <= manufactureDate) {
        nextErrors.expiryDate = "Expiry date must be after manufacture date.";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setRowErrors(nextErrors);
      return;
    }

    const updatedItem: PurchaseOrderItem = {
      ...editingDraft,
      amount: calculatePurchaseItemAmount(editingDraft).amount,
    };

    setPurchaseOrder((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    }));

    setExpandedProductId(null);
    setEditingDraft(null);
    setRowErrors({});
    showToast("success", "Product details updated successfully");
  };

  const handleDeleteProduct = () => {
    if (!deleteTarget) return;

    setPurchaseOrder((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== deleteTarget.id),
    }));

    if (expandedProductId === deleteTarget.id) {
      setExpandedProductId(null);
      setEditingDraft(null);
    }

    setDeleteTarget(null);
    showToast("success", "Product removed successfully");
  };

  const validateHeader = () => {
    const errors: FormErrors = {};
    const existingOrders = mockService.get<any>("purchaseOrders");
    if (!Number.isInteger(Number(purchaseOrder.voucherNumber)) || Number(purchaseOrder.voucherNumber) <= 0) errors.voucherNumber = "Voucher number is required.";
    if (existingOrders.some((order) => storedVoucherNumber(order) === Number(purchaseOrder.voucherNumber))) errors.voucherNumber = "Voucher number must be unique.";
    if (!purchaseOrder.orderDate) errors.orderDate = "Order date is required.";
    if (purchaseOrder.orderDate && purchaseOrder.orderDate > todayISO()) errors.orderDate = "Order date cannot be in the future.";
    if (!String(purchaseOrder.supplierId).trim()) errors.supplierId = "Supplier is required.";
    if (!purchaseOrder.purchaseType) errors.purchaseType = "Purchase type is required.";
    if (!purchaseOrder.billNumber.trim()) errors.billNumber = "Bill number is required.";
    if (!purchaseOrder.billDate) errors.billDate = "Bill date is required.";
    if (purchaseOrder.billDate && purchaseOrder.billDate > todayISO()) errors.billDate = "Bill date cannot be in the future.";
    if (!purchaseOrder.billDueDate) errors.billDueDate = "Bill due date is required.";
    if (purchaseOrder.billDate && purchaseOrder.billDueDate && purchaseOrder.billDueDate <= purchaseOrder.billDate) errors.billDueDate = "Bill Due Date must be after Bill Date.";
    if (!purchaseOrder.lrNumber.trim()) errors.lrNumber = "LR number is required.";
    if (!purchaseOrder.dispatchDate) errors.dispatchDate = "Dispatch date is required.";
    if (purchaseOrder.dispatchDate && purchaseOrder.dispatchDate > todayISO()) errors.dispatchDate = "Dispatch date cannot be in the future.";
    if (!Number.isFinite(Number(purchaseOrder.totalBoxes)) || Number(purchaseOrder.totalBoxes) < 0) errors.totalBoxes = "Total boxes cannot be negative.";
    if (purchaseOrder.items.length === 0) errors.items = "At least one product is required.";

    purchaseOrder.items.forEach((item, index) => {
      if (!item.hsn?.trim()) errors[`item-${index}-hsn`] = "HSN is required from Product Master.";
      if (!item.batchNumber?.trim()) errors[`item-${index}-batchNumber`] = "Batch number is required.";
      if (!item.expiryDate) errors[`item-${index}-expiryDate`] = "Expiry date is required.";
      if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0) errors[`item-${index}-quantity`] = "Quantity must be zero or greater.";
      if (!item.unit?.trim()) errors[`item-${index}-unit`] = "Unit is required.";
      if (!Number.isFinite(Number(item.sellRate)) || Number(item.sellRate) < 0) errors[`item-${index}-sellRate`] = "Sell rate is required and cannot be negative.";
      if (Number(item.freeQuantity) < 0) errors[`item-${index}-freeQuantity`] = "Free quantity cannot be negative.";
      if (Number(item.discountPercentage) < 0 || Number(item.discountPercentage) > 100) errors[`item-${index}-discountPercentage`] = "Discount must be between 0 and 100%.";
    });

    return errors;
  };

  const handleSavePurchaseOrder = (status: "Draft" | "Completed") => {
    const errors = validateHeader();
    setHeaderErrors(errors);

    if (Object.keys(errors).length > 0) {
      showToast("error", "Please correct the highlighted fields before saving.");
      return;
    }

    setIsSaving(true);

    const payload = {
      ...purchaseOrder,
      status,
      items: purchaseOrder.items.map((item) => {
        const itemToSave = editingDraft?.id === item.id ? editingDraft : item;
        return {
          ...itemToSave,
          amount: calculatePurchaseItemAmount(itemToSave).amount,
        };
      }),
      subtotal: summary.subtotal,
      discount: summary.discount,
      taxableAmount: summary.taxableAmount,
      cgst: summary.cgst,
      sgst: summary.sgst,
      igst: summary.igst,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
    };

    mockService.save("purchaseOrders", payload);
    setIsSaving(false);
    showToast("success", status === "Draft" ? "Purchase Order saved as draft" : "Purchase Order created successfully");
    router.push("/orders");
  };

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none">Dashboard</Link></li>
                <li className="breadcrumb-item active" aria-current="page">Order Details</li>
              </ol>
            </nav>
            <h1 className="h2 mb-1">Purchase Order Details</h1>
            <p className="text-secondary mb-0">Create a new Purchase order with product, supplier, pricing, delivery and payment details.</p>
          </div>
        </div>

        {toast && (
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} shadow-sm mb-4 d-flex align-items-center`} role="status">
            <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-triangle"} me-2`} aria-hidden="true" />
            {toast.message}
          </div>
        )}

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3 p-lg-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 38, height: 38 }}>
                <i className="bi bi-bag-check" aria-hidden="true" />
              </span>
              <h2 className="h5 mb-0">Order Details</h2>
            </div>

            <div className="row g-3">
              <div className="col-md-6 col-xl-3">
                <label className="form-label">Voucher Number <span className="text-danger">*</span></label>
                <input
                  type="number"
                  className={`form-control ${headerErrors.voucherNumber ? "is-invalid" : ""}`}
                  value={purchaseOrder.voucherNumber}
                  readOnly
                />
                {headerErrors.voucherNumber && <div className="invalid-feedback d-block">{headerErrors.voucherNumber}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Order Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  max={todayISO()}
                  className={`form-control ${headerErrors.orderDate ? "is-invalid" : ""}`}
                  value={purchaseOrder.orderDate}
                  onChange={(event) => updateHeaderField("orderDate", event.target.value)}
                />
                {headerErrors.orderDate && <div className="invalid-feedback d-block">{headerErrors.orderDate}</div>}
                {purchaseOrder.orderDate && <div className="form-text">{formatLongDate(purchaseOrder.orderDate)}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Supplier <span className="text-danger">*</span></label>
                <input
                  list="supplier-list"
                  className={`form-select ${headerErrors.supplierId ? "is-invalid" : ""}`}
                  value={supplierSearch}
                  onChange={(event) => {
                    const selected = suppliers.find((supplier) => supplier.firmName === event.target.value);
                    setSupplierSearch(event.target.value);
                    updateHeaderField("supplierId", selected ? String(selected.id) : "");
                  }}
                  placeholder="Search supplier"
                />
                <datalist id="supplier-list">
                  {filteredSuppliers.map((supplier) => <option key={supplier.id} value={supplier.firmName} />)}
                </datalist>
                <div className="list-group mt-2" style={{ maxHeight: 260, overflowY: "auto" }}>
                  {filteredSuppliers.map((supplier) => (
                    <button key={supplier.id} type="button" className={`list-group-item list-group-item-action small ${String(purchaseOrder.supplierId) === String(supplier.id) ? "active" : ""}`} onClick={() => {
                      setSupplierSearch(supplier.firmName);
                      updateHeaderField("supplierId", String(supplier.id));
                    }}>
                      <span className="fw-semibold">{supplier.firmName}</span><span className="text-muted">{supplier.city ? ` · ${supplier.city}` : ""}</span>
                    </button>
                  ))}
                  {!filteredSuppliers.length && <div className="list-group-item small text-muted">No Supplier records found in Party Master.</div>}
                </div>
                {headerErrors.supplierId && <div className="invalid-feedback d-block">{headerErrors.supplierId}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Purchase Type <span className="text-danger">*</span></label>
                <select
                  className={`form-select ${headerErrors.purchaseType ? "is-invalid" : ""}`}
                  value={purchaseOrder.purchaseType}
                  onChange={(event) => updateHeaderField("purchaseType", event.target.value)}
                >
                  <option value="">Select purchase type</option>
                  {purchaseTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {headerErrors.purchaseType && <div className="invalid-feedback d-block">{headerErrors.purchaseType}</div>}
              </div>

              <div className="col-12 mt-4"><h3 className="h6 mb-0">Bill Details</h3></div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Bill Number <span className="text-danger">*</span></label>
                <input
                  className={`form-control ${headerErrors.billNumber ? "is-invalid" : ""}`}
                  value={purchaseOrder.billNumber}
                  onChange={(event) => updateHeaderField("billNumber", event.target.value)}
                />
                {headerErrors.billNumber && <div className="invalid-feedback d-block">{headerErrors.billNumber}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Bill Date <span className="text-danger">*</span></label>
                <input type="date" max={todayISO()} className={`form-control ${headerErrors.billDate ? "is-invalid" : ""}`} value={purchaseOrder.billDate} onChange={(event) => updateHeaderField("billDate", event.target.value)} />
                {headerErrors.billDate && <div className="invalid-feedback d-block">{headerErrors.billDate}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Bill Due Date <span className="text-danger">*</span></label>
                <input type="date" min={tomorrowISO(purchaseOrder.billDate)} className={`form-control ${headerErrors.billDueDate ? "is-invalid" : ""}`} value={purchaseOrder.billDueDate} onChange={(event) => updateHeaderField("billDueDate", event.target.value)} />
                {headerErrors.billDueDate && <div className="invalid-feedback d-block">{headerErrors.billDueDate}</div>}
              </div>

              <div className="col-12 mt-4"><h3 className="h6 mb-0">Dispatch / Transport Details</h3></div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">LR Number <span className="text-danger">*</span></label>
                <input className={`form-control ${headerErrors.lrNumber ? "is-invalid" : ""}`} value={purchaseOrder.lrNumber} onChange={(event) => updateHeaderField("lrNumber", event.target.value)} placeholder="Lorry Receipt Number" />
                {headerErrors.lrNumber && <div className="invalid-feedback d-block">{headerErrors.lrNumber}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Dispatch Date <span className="text-danger">*</span></label>
                <input type="date" max={todayISO()} className={`form-control ${headerErrors.dispatchDate ? "is-invalid" : ""}`} value={purchaseOrder.dispatchDate} onChange={(event) => updateHeaderField("dispatchDate", event.target.value)} />
                {headerErrors.dispatchDate && <div className="invalid-feedback d-block">{headerErrors.dispatchDate}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Total Boxes / Cases Received</label>
                <input type="number" min="0" step="1" className={`form-control ${headerErrors.totalBoxes ? "is-invalid" : ""}`} value={purchaseOrder.totalBoxes} onChange={(event) => updateHeaderField("totalBoxes", Number(event.target.value || 0))} />
                {headerErrors.totalBoxes && <div className="invalid-feedback d-block">{headerErrors.totalBoxes}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Godown</label>
                <input className="form-control" value={purchaseOrder.godown} onChange={(event) => updateHeaderField("godown", event.target.value)} placeholder="Optional storage location" />
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={purchaseOrder.paymentMethod}
                  onChange={(event) => updateHeaderField("paymentMethod", event.target.value)}
                >
                  {paymentMethods.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Payment Terms</label>
                <select
                  className="form-select"
                  value={purchaseOrder.paymentTerms}
                  onChange={(event) => updateHeaderField("paymentTerms", event.target.value)}
                >
                  {paymentTermsOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Transporter</label>
                <select
                  className="form-select"
                  value={purchaseOrder.transporterId}
                  onChange={(event) => updateHeaderField("transporterId", event.target.value)}
                >
                  <option value="">Select transporter</option>
                  {transporters.map((transporter) => (
                    <option key={transporter.id} value={String(transporter.id)}>{transporter.name}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 mt-4"><h3 className="h6 mb-0">Additional Details</h3></div>

              <div className="col-12">
                <label className="form-label">Delivery Address</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={purchaseOrder.deliveryAddress}
                  onChange={(event) => updateHeaderField("deliveryAddress", event.target.value)}
                  placeholder="Warehouse / Branch / Store address"
                />
              </div>

              <div className="col-12">
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={purchaseOrder.remarks}
                  onChange={(event) => updateHeaderField("remarks", event.target.value)}
                  placeholder="Any special note or instructions"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3 p-lg-4">
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <div className="d-flex align-items-center gap-2">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-warning-subtle text-warning" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-bag-plus" aria-hidden="true" />
                </span>
                <h2 className="h5 mb-0">Products</h2>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setShowSelector(true)}>
                <i className="bi bi-plus-lg me-2" aria-hidden="true" />Add Products
              </button>
            </div>

            {purchaseOrder.items.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th rowSpan={2}>HSN</th>
                      <th rowSpan={2}>Product</th>
                      <th rowSpan={2}>Package Description</th>
                      <th rowSpan={2}>Quantity</th>
                      <th rowSpan={2}>Scheme</th>
                      <th rowSpan={2}>Batch Number</th>
                      <th rowSpan={2}>Expiry Date</th>
                      <th rowSpan={2}>MRP</th>
                      <th rowSpan={2}>Sale Rate</th>
                      <th rowSpan={2}>Discount %</th>
                      <th rowSpan={2}>Taxable</th>
                      <th colSpan={2} className="text-center">GST %</th>
                      <th rowSpan={2}>Amount</th>
                      <th rowSpan={2}>Actions</th>
                    </tr>
                    <tr>
                      <th>CGST %</th>
                      <th>SGST %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item) => (
                      <Fragment key={String(item.id)}>
                        <tr>
                          <td>{item.hsn || "—"}</td>
                          <td className="fw-semibold">{item.productName}</td>
                          <td>{item.packageDescription || "—"}</td>
                          <td>{item.quantity}</td>
                          <td>{item.scheme || "No Scheme"}</td>
                          <td>{item.batchNumber || "—"}</td>
                          <td>{item.expiryDate || "—"}</td>
                          <td>{formatCurrency(item.mrp)}</td>
                          <td>{formatCurrency(item.sellRate)}</td>
                          <td>{item.discountPercentage}%</td>
                          <td>{formatCurrency(editingDraft?.id === item.id ? calculatePurchaseItemAmount(editingDraft).taxableAmount : calculatePurchaseItemAmount(item).taxableAmount)}</td>
                          <td>{calculatePurchaseItemAmount(editingDraft?.id === item.id ? editingDraft : item).cgstPercentage}%</td>
                          <td>{calculatePurchaseItemAmount(editingDraft?.id === item.id ? editingDraft : item).sgstPercentage}%</td>
                          <td>{formatCurrency(editingDraft?.id === item.id ? calculatePurchaseItemAmount(editingDraft).amount : calculatePurchaseItemAmount(item).amount)}</td>
                          <td>
                            <div className="d-flex gap-2 flex-wrap">
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleInlineEdit(item)}>Edit</button>
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setViewProduct(item)}>View</button>
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(item)}>Delete</button>
                            </div>
                          </td>
                        </tr>

                        {expandedProductId === item.id && editingDraft && (
                          <tr>
                            <td colSpan={15} className="p-0">
                              <div className="p-3 bg-light-subtle border-top">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <div className="fw-semibold">Product Details</div>
                                  <span className="small text-muted">{item.productName}</span>
                                </div>

                                <div className="row g-3">
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Product Name</label>
                                    <input className="form-control" value={editingDraft.productName} readOnly />
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Manufacturer</label>
                                    <input className="form-control" value={editingDraft.manufacturer || ""} readOnly />
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">HSN</label>
                                    <input className={`form-control ${rowErrors.hsn ? "is-invalid" : ""}`} value={editingDraft.hsn || ""} readOnly />
                                    {rowErrors.hsn && <div className="invalid-feedback d-block">{rowErrors.hsn}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Package Description</label>
                                    <input className="form-control" value={editingDraft.packageDescription || ""} readOnly />
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Batch Number <span className="text-danger">*</span></label>
                                    <input
                                      className={`form-control ${rowErrors.batchNumber ? "is-invalid" : ""}`}
                                      value={editingDraft.batchNumber}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, batchNumber: event.target.value } : current)}
                                    />
                                    {rowErrors.batchNumber && <div className="invalid-feedback d-block">{rowErrors.batchNumber}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Manufacture Date</label>
                                    <input
                                      type="date"
                                      className="form-control"
                                      value={editingDraft.manufactureDate || ""}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, manufactureDate: event.target.value } : current)}
                                    />
                                  </div>
                                  <div className="col-md-6 col-xl-4">
                                    <label className="form-label">Expiry Date <span className="text-danger">*</span></label>
                                    <input
                                      type="date"
                                      className={`form-control ${rowErrors.expiryDate ? "is-invalid" : ""}`}
                                      value={editingDraft.expiryDate}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, expiryDate: event.target.value } : current)}
                                    />
                                    {rowErrors.expiryDate && <div className="invalid-feedback d-block">{rowErrors.expiryDate}</div>}
                                  </div>

                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Quantity <span className="text-danger">*</span></label>
                                    <input
                                      type="number"
                                      min="0"
                                      className={`form-control ${rowErrors.quantity ? "is-invalid" : ""}`}
                                      value={editingDraft.quantity}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, quantity: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.quantity && <div className="invalid-feedback d-block">{rowErrors.quantity}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Scheme</label>
                                    <select className="form-select" value={editingDraft.scheme} onChange={(event) => setEditingDraft((current) => current ? { ...current, scheme: event.target.value } : current)}>
                                      {schemes.map((scheme) => <option key={scheme.id} value={scheme.name}>{scheme.name}</option>)}
                                    </select>
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Unit <span className="text-danger">*</span></label>
                                    <input
                                      className={`form-control ${rowErrors.unit ? "is-invalid" : ""}`}
                                      value={editingDraft.unit}
                                      readOnly={Boolean(editingDraft.unit)}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, unit: event.target.value } : current)}
                                    />
                                    {rowErrors.unit && <div className="invalid-feedback d-block">{rowErrors.unit}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Sell Rate <span className="text-danger">*</span></label>
                                    <input type="number" min="0" step="0.01" className={`form-control ${rowErrors.sellRate ? "is-invalid" : ""}`} value={editingDraft.sellRate} onChange={(event) => setEditingDraft((current) => current ? { ...current, sellRate: Number(event.target.value || 0) } : current)} />
                                    {rowErrors.sellRate && <div className="invalid-feedback d-block">{rowErrors.sellRate}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">MRP</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={`form-control ${rowErrors.mrp ? "is-invalid" : ""}`}
                                      value={editingDraft.mrp}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, mrp: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.mrp && <div className="invalid-feedback d-block">{rowErrors.mrp}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Discount %</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className={`form-control ${rowErrors.discountPercentage ? "is-invalid" : ""}`}
                                      value={editingDraft.discountPercentage}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, discountPercentage: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.discountPercentage && <div className="invalid-feedback d-block">{rowErrors.discountPercentage}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Taxable</label>
                                    <input className="form-control" value={formatCurrency(calculatePurchaseItemAmount(editingDraft).taxableAmount)} readOnly />
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">GST %</label>
                                    <input type="number" min="0" step="0.01" className={`form-control ${rowErrors.gst ? "is-invalid" : ""}`} value={editingDraft.gst} onChange={(event) => setEditingDraft((current) => current ? { ...current, gst: Number(event.target.value || 0) } : current)} />
                                    {rowErrors.gst && <div className="invalid-feedback d-block">{rowErrors.gst}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Amount</label>
                                    <input className="form-control" value={formatCurrency(calculatePurchaseItemAmount(editingDraft).amount)} readOnly />
                                  </div>

                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-4">
                                  <button type="button" className="btn btn-outline-secondary" onClick={handleInlineCancel}>Cancel</button>
                                  <button type="button" className="btn btn-primary" onClick={handleInlineSave}>Save</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 border rounded-4 bg-light-subtle text-muted">
                No products added yet. Click <strong>Add Products</strong> to begin.
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3 p-lg-4">
            <h2 className="h5 mb-4">Order Summary</h2>
            <div className="row g-3">
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Total Items</div><div className="fs-5 fw-semibold">{summary.totalItems}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Total Quantity</div><div className="fs-5 fw-semibold">{summary.totalQuantity}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Grand Total</div><div className="fs-5 fw-semibold text-primary">{formatCurrency(summary.grandTotal)}</div></div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-md-6 col-xl-4"><div className="small text-muted">Gross Amount</div><div className="fw-semibold">{formatCurrency(summary.subtotal)}</div></div>
              <div className="col-md-6 col-xl-4"><div className="small text-muted">Discount</div><div className="fw-semibold">{formatCurrency(summary.discount)}</div></div>
              <div className="col-md-6 col-xl-4"><div className="small text-muted">Taxable Amount</div><div className="fw-semibold">{formatCurrency(summary.taxableAmount)}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">CGST</div><div className="fw-semibold">{formatCurrency(summary.cgst)}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">SGST</div><div className="fw-semibold">{formatCurrency(summary.sgst)}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">IGST</div><div className="fw-semibold">{formatCurrency(summary.igst)}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Round Off</div><div className="fw-semibold">{formatCurrency(summary.roundOff)}</div></div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mb-5">
          <Link href="/orders" className="btn btn-outline-secondary">Cancel</Link>
          <button type="button" className="btn btn-outline-primary" onClick={() => handleSavePurchaseOrder("Draft")} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save as Draft"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => handleSavePurchaseOrder("Completed")} disabled={isSaving}>
                {isSaving ? "Saving..." : "Complete Purchase Order"}
          </button>
        </div>
      </div>

      {showSelector && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Add Products</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowSelector(false)} />
              </div>
              <div className="modal-body">
                <div className="input-group mb-3">
                  <span className="input-group-text"><i className="bi bi-search" aria-hidden="true" /></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search product..."
                    value={selectorQuery}
                    onChange={(event) => setSelectorQuery(event.target.value)}
                  />
                </div>

                <div className="small text-muted mb-2">{selectedProductIds.length} products selected</div>
                <div className="list-group" style={{ maxHeight: 420, overflowY: "auto" }}>
                  {filteredProducts.length > 0 ? filteredProducts.map((product) => {
                    const selected = selectedProductIds.includes(product.id);
                    const productName = product.productName || product.name || "Unnamed Product";
                    return (
                      <label key={String(product.id)} className="list-group-item list-group-item-action d-flex align-items-start gap-3">
                        <input
                          type="checkbox"
                          className="form-check-input mt-2"
                          checked={selected}
                          onChange={() => handleToggleProductSelection(product.id)}
                        />
                        <div>
                          <div className="fw-semibold">{productName}</div>
                          <div className="small text-secondary">
                            {product.manufacturer || product.brand || ""} | {product.unit || product.unitType || ""} | MRP {formatCurrency(product.mrp ?? 0)} | GST {product.gst ?? product.gstPercentage ?? 0}%
                          </div>
                        </div>
                      </label>
                    );
                  }) : (
                    <div className="text-center py-4 text-muted">No matching products found.</div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowSelector(false)}>Cancel</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSelector(false)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={handleAddSelectedProducts}>Add Selected Products</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Product Details</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setViewProduct(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><div className="small text-muted">Product Name</div><div className="fw-semibold">{viewProduct.productName}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Manufacturer</div><div className="fw-semibold">{viewProduct.manufacturer || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">HSN</div><div className="fw-semibold">{viewProduct.hsn || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Batch Number</div><div className="fw-semibold">{viewProduct.batchNumber || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Manufacture Date</div><div className="fw-semibold">{viewProduct.manufactureDate || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Expiry Date</div><div className="fw-semibold">{viewProduct.expiryDate || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Quantity</div><div className="fw-semibold">{viewProduct.quantity}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Unit</div><div className="fw-semibold">{viewProduct.unit}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Sell Rate</div><div className="fw-semibold">{formatCurrency(viewProduct.sellRate)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">MRP</div><div className="fw-semibold">{formatCurrency(viewProduct.mrp)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">GST</div><div className="fw-semibold">{viewProduct.gst}%</div></div>
                  <div className="col-md-6"><div className="small text-muted">Discount %</div><div className="fw-semibold">{viewProduct.discountPercentage}%</div></div>
                  <div className="col-md-6"><div className="small text-muted">Amount</div><div className="fw-semibold">{formatCurrency(viewProduct.amount)}</div></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setViewProduct(null)}>Close</button>
                <button type="button" className="btn btn-primary" onClick={() => {
                  setViewProduct(null);
                  handleInlineEdit(viewProduct);
                }}>Edit Product</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Remove Product?</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                Are you sure you want to remove this product from the Purchase Order?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteProduct}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
