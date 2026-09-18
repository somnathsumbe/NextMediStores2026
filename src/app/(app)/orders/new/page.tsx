"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mockService } from "@/lib/mock-service";
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
  purchasePrice?: number;
  salePrice?: number;
  availableQuantity?: number;
  stock?: number;
  purchaseRate?: number;
  category?: string;
  categoryId?: string;
  drugGroup?: string;
  hsn?: string;
  manufactureDate?: string;
};

type PurchaseOrderItem = {
  id: number | string;
  productId: number | string;
  productName: string;
  manufacturer?: string;
  scientificName?: string;
  batchNumber: string;
  manufactureDate?: string;
  expiryDate: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  purchaseRate: number;
  mrp: number;
  gst: number;
  discount: number;
  amount: number;
  holdSale: boolean;
};

type PurchaseOrder = {
  id: number | string;
  purchaseOrderNumber: string;
  orderDate: string;
  supplierId: number | string;
  purchaseType: string;
  expectedDeliveryDate: string;
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
  return new Date().toISOString().slice(0, 10);
}

function generatePoNumber() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear()).slice(-2);
  const random = String(Math.floor(Math.random() * 8999) + 1000);
  return `PO-${year}${month}${day}-${random}`;
}

function normalizeProduct(product: any): ProductRecord {
  return {
    id: product.id,
    productName: product.productName || product.name || "",
    name: product.name || product.productName || "",
    manufacturer: product.manufacturer || product.brand || "",
    brand: product.brand || product.manufacturer || "",
    scientificName: product.scientificName || "",
    batchNumber: product.batchNumber || product.batch || "",
    batch: product.batch || product.batchNumber || "",
    expiryDate: product.expiryDate || product.expiry || "",
    expiry: product.expiry || product.expiryDate || "",
    unit: product.unit || "Strip",
    mrp: Number(product.mrp ?? product.salePrice ?? product.purchasePrice ?? 0),
    gst: Number(product.gst ?? product.gstPercentage ?? 12),
    gstPercentage: Number(product.gstPercentage ?? product.gst ?? 12),
    purchasePrice: Number(product.purchasePrice ?? product.purchaseRate ?? product.mrp ?? 0),
    salePrice: Number(product.salePrice ?? product.mrp ?? product.purchasePrice ?? 0),
    availableQuantity: Number(product.availableQuantity ?? product.stock ?? 0),
    stock: Number(product.stock ?? product.availableQuantity ?? 0),
    purchaseRate: Number(product.purchaseRate ?? product.purchasePrice ?? product.mrp ?? 0),
    category: product.category || "General",
    categoryId: product.categoryId || "",
    drugGroup: product.drugGroup || product.category || "General",
    hsn: product.hsn || "3004",
    manufactureDate: product.manufactureDate || "",
  };
}

function buildItemFromProduct(product: ProductRecord): PurchaseOrderItem {
  const productName = product.productName || product.name || "Unnamed Product";
  const purchaseRate = Number(product.purchaseRate ?? product.purchasePrice ?? product.mrp ?? 0);
  const mrp = Number(product.mrp ?? product.salePrice ?? purchaseRate ?? 0);
  const gst = Number(product.gst ?? product.gstPercentage ?? 12);
  const item = {
    id: `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    productId: product.id,
    productName,
    manufacturer: product.manufacturer || product.brand || "",
    scientificName: product.scientificName || "",
    batchNumber: product.batchNumber || product.batch || "",
    manufactureDate: product.manufactureDate || "",
    expiryDate: product.expiryDate || product.expiry || "",
    quantity: 1,
    freeQuantity: 0,
    unit: product.unit || "Strip",
    purchaseRate,
    mrp,
    gst,
    discount: 0,
    amount: 0,
    holdSale: false,
  };
  return { ...item, amount: calculatePurchaseItemAmount(item).amount };
}

function emptyOrder(): PurchaseOrder {
  return {
    id: `PO-${Date.now()}`,
    purchaseOrderNumber: generatePoNumber(),
    orderDate: todayISO(),
    supplierId: "",
    purchaseType: "Cash Purchase",
    expectedDeliveryDate: "",
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
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
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
    const allSuppliers = mockService.get<any>("suppliers");
    const allTransporters = mockService.get<any>("transport");

    setProducts(allProducts);
    setSuppliers(allSuppliers.length ? allSuppliers : [{ id: 1, name: "Cipla Ltd." }, { id: 2, name: "Sun Pharma" }]);
    setTransporters(allTransporters.length ? allTransporters : [{ id: 1, name: "Shree Logistics" }, { id: 2, name: "Express Pharma Transport" }]);
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
    const items = purchaseOrder.items.map((item) => ({
      ...item,
      ...calculatePurchaseItemAmount(item),
    }));

    return {
      totalItems: purchaseOrder.items.length,
      totalQuantity: purchaseOrder.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      freeQuantity: purchaseOrder.items.reduce((sum, item) => sum + Number(item.freeQuantity || 0), 0),
      ...calculatePurchaseOrderSummary(
        purchaseOrder.items.map((item) => ({
          quantity: Number(item.quantity || 0),
          purchaseRate: Number(item.purchaseRate || 0),
          discount: Number(item.discount || 0),
          gst: Number(item.gst || 0),
        })),
      ),
      lineItems: items,
    };
  }, [purchaseOrder.items]);

  const filteredProducts = useMemo(() => {
    const query = selectorQuery.trim();
    return products.filter((product) => {
      const alreadyAdded = purchaseOrder.items.some((item) => String(item.productId) === String(product.id));
      if (alreadyAdded) return false;
      return productMatchesSearch(product, query);
    });
  }, [products, purchaseOrder.items, selectorQuery]);

  const updateHeaderField = (field: keyof PurchaseOrder, value: string) => {
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
    if (!editingDraft.expiryDate) nextErrors.expiryDate = "Expiry date is required.";
    if (!editingDraft.quantity || Number(editingDraft.quantity) <= 0) nextErrors.quantity = "Quantity must be greater than 0.";
    if (Number(editingDraft.freeQuantity) < 0) nextErrors.freeQuantity = "Free quantity cannot be negative.";
    if (!editingDraft.unit?.trim()) nextErrors.unit = "Unit is required.";
    if (Number(editingDraft.purchaseRate) < 0) nextErrors.purchaseRate = "Purchase rate cannot be negative.";
    if (Number(editingDraft.mrp) < 0) nextErrors.mrp = "MRP cannot be negative.";
    if (Number(editingDraft.gst) < 0) nextErrors.gst = "GST cannot be negative.";
    if (Number(editingDraft.discount) < 0) nextErrors.discount = "Discount cannot be negative.";

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
    if (!purchaseOrder.purchaseOrderNumber.trim()) errors.purchaseOrderNumber = "Purchase order number is required.";
    if (!purchaseOrder.orderDate) errors.orderDate = "Order date is required.";
    if (!String(purchaseOrder.supplierId).trim()) errors.supplierId = "Supplier is required.";
    if (purchaseOrder.items.length === 0) errors.items = "At least one product is required.";

    purchaseOrder.items.forEach((item, index) => {
      if (!item.batchNumber?.trim()) errors[`item-${index}-batchNumber`] = "Batch number is required.";
      if (!item.expiryDate) errors[`item-${index}-expiryDate`] = "Expiry date is required.";
      if (!item.quantity || Number(item.quantity) <= 0) errors[`item-${index}-quantity`] = "Quantity must be greater than 0.";
      if (!item.unit?.trim()) errors[`item-${index}-unit`] = "Unit is required.";
      if (Number(item.purchaseRate) < 0) errors[`item-${index}-purchaseRate`] = "Purchase rate cannot be negative.";
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
      items: purchaseOrder.items.map((item) => ({
        ...item,
        amount: calculatePurchaseItemAmount(item).amount,
      })),
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
              <h2 className="h5 mb-0">Purchase Order Header</h2>
            </div>

            <div className="row g-3">
              <div className="col-md-6 col-xl-3">
                <label className="form-label">Purchase Order Number <span className="text-danger">*</span></label>
                <input
                  className={`form-control ${headerErrors.purchaseOrderNumber ? "is-invalid" : ""}`}
                  value={purchaseOrder.purchaseOrderNumber}
                  onChange={(event) => updateHeaderField("purchaseOrderNumber", event.target.value)}
                />
                {headerErrors.purchaseOrderNumber && <div className="invalid-feedback d-block">{headerErrors.purchaseOrderNumber}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Order Date <span className="text-danger">*</span></label>
                <input
                  type="date"
                  className={`form-control ${headerErrors.orderDate ? "is-invalid" : ""}`}
                  value={purchaseOrder.orderDate}
                  onChange={(event) => updateHeaderField("orderDate", event.target.value)}
                />
                {headerErrors.orderDate && <div className="invalid-feedback d-block">{headerErrors.orderDate}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Supplier <span className="text-danger">*</span></label>
                <select
                  className={`form-select ${headerErrors.supplierId ? "is-invalid" : ""}`}
                  value={purchaseOrder.supplierId}
                  onChange={(event) => updateHeaderField("supplierId", event.target.value)}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={String(supplier.id)}>{supplier.name}</option>
                  ))}
                </select>
                {headerErrors.supplierId && <div className="invalid-feedback d-block">{headerErrors.supplierId}</div>}
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Purchase Type</label>
                <select
                  className="form-select"
                  value={purchaseOrder.purchaseType}
                  onChange={(event) => updateHeaderField("purchaseType", event.target.value)}
                >
                  {purchaseTypes.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 col-xl-3">
                <label className="form-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={purchaseOrder.expectedDeliveryDate}
                  onChange={(event) => updateHeaderField("expectedDeliveryDate", event.target.value)}
                />
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
                      <th>Product Name</th>
                      <th>Manufacturer</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Purchase Rate</th>
                      <th>MRP</th>
                      <th>GST %</th>
                      <th>Discount</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item) => (
                      <Fragment key={String(item.id)}>
                        <tr>
                          <td className="fw-semibold">{item.productName}</td>
                          <td>{item.manufacturer || "—"}</td>
                          <td>{item.quantity}</td>
                          <td>{item.unit}</td>
                          <td>{formatCurrency(item.purchaseRate)}</td>
                          <td>{formatCurrency(item.mrp)}</td>
                          <td>{item.gst}%</td>
                          <td>{formatCurrency(item.discount)}</td>
                          <td>{formatCurrency(item.amount)}</td>
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
                            <td colSpan={10} className="p-0">
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
                                    <label className="form-label">Scientific Name</label>
                                    <input className="form-control" value={editingDraft.scientificName || ""} readOnly />
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
                                      min="1"
                                      className={`form-control ${rowErrors.quantity ? "is-invalid" : ""}`}
                                      value={editingDraft.quantity}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, quantity: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.quantity && <div className="invalid-feedback d-block">{rowErrors.quantity}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Free Quantity</label>
                                    <input
                                      type="number"
                                      min="0"
                                      className={`form-control ${rowErrors.freeQuantity ? "is-invalid" : ""}`}
                                      value={editingDraft.freeQuantity}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, freeQuantity: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.freeQuantity && <div className="invalid-feedback d-block">{rowErrors.freeQuantity}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Unit <span className="text-danger">*</span></label>
                                    <input
                                      className={`form-control ${rowErrors.unit ? "is-invalid" : ""}`}
                                      value={editingDraft.unit}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, unit: event.target.value } : current)}
                                    />
                                    {rowErrors.unit && <div className="invalid-feedback d-block">{rowErrors.unit}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Purchase Rate <span className="text-danger">*</span></label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={`form-control ${rowErrors.purchaseRate ? "is-invalid" : ""}`}
                                      value={editingDraft.purchaseRate}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, purchaseRate: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.purchaseRate && <div className="invalid-feedback d-block">{rowErrors.purchaseRate}</div>}
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
                                    <label className="form-label">GST %</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={`form-control ${rowErrors.gst ? "is-invalid" : ""}`}
                                      value={editingDraft.gst}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, gst: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.gst && <div className="invalid-feedback d-block">{rowErrors.gst}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Discount</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className={`form-control ${rowErrors.discount ? "is-invalid" : ""}`}
                                      value={editingDraft.discount}
                                      onChange={(event) => setEditingDraft((current) => current ? { ...current, discount: Number(event.target.value || 0) } : current)}
                                    />
                                    {rowErrors.discount && <div className="invalid-feedback d-block">{rowErrors.discount}</div>}
                                  </div>
                                  <div className="col-md-6 col-xl-3">
                                    <label className="form-label">Amount</label>
                                    <input className="form-control" value={formatCurrency(calculatePurchaseItemAmount(editingDraft).amount)} readOnly />
                                  </div>

                                  <div className="col-md-6 col-xl-3 d-flex align-items-end">
                                    <div className="form-check mb-3">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={editingDraft.holdSale}
                                        onChange={(event) => setEditingDraft((current) => current ? { ...current, holdSale: event.target.checked } : current)}
                                        id={`hold-sale-${item.id}`}
                                      />
                                      <label className="form-check-label" htmlFor={`hold-sale-${item.id}`}>
                                        Hold Sale
                                      </label>
                                    </div>
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
            <div className="row g-3">
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Total Items</div><div className="fs-5 fw-semibold">{summary.totalItems}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Total Quantity</div><div className="fs-5 fw-semibold">{summary.totalQuantity}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Free Quantity</div><div className="fs-5 fw-semibold">{summary.freeQuantity}</div></div>
              <div className="col-md-6 col-xl-3"><div className="small text-muted">Grand Total</div><div className="fs-5 fw-semibold text-primary">{formatCurrency(summary.grandTotal)}</div></div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-md-6 col-xl-4"><div className="small text-muted">Subtotal</div><div className="fw-semibold">{formatCurrency(summary.subtotal)}</div></div>
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
            {isSaving ? "Saving..." : "Save Purchase Order"}
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
                            {product.manufacturer || product.brand || "Unknown Manufacturer"} | {product.unit || "Strip"} | MRP {formatCurrency(product.mrp ?? 0)} | GST {product.gst ?? product.gstPercentage ?? 12}%
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
                  <div className="col-md-6"><div className="small text-muted">Scientific Name</div><div className="fw-semibold">{viewProduct.scientificName || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Batch Number</div><div className="fw-semibold">{viewProduct.batchNumber || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Manufacture Date</div><div className="fw-semibold">{viewProduct.manufactureDate || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Expiry Date</div><div className="fw-semibold">{viewProduct.expiryDate || "—"}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Quantity</div><div className="fw-semibold">{viewProduct.quantity}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Free Quantity</div><div className="fw-semibold">{viewProduct.freeQuantity}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Unit</div><div className="fw-semibold">{viewProduct.unit}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Purchase Rate</div><div className="fw-semibold">{formatCurrency(viewProduct.purchaseRate)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">MRP</div><div className="fw-semibold">{formatCurrency(viewProduct.mrp)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">GST</div><div className="fw-semibold">{viewProduct.gst}%</div></div>
                  <div className="col-md-6"><div className="small text-muted">Discount</div><div className="fw-semibold">{formatCurrency(viewProduct.discount)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Amount</div><div className="fw-semibold">{formatCurrency(viewProduct.amount)}</div></div>
                  <div className="col-md-6"><div className="small text-muted">Hold Sale</div><div className="fw-semibold">{viewProduct.holdSale ? "Yes" : "No"}</div></div>
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
