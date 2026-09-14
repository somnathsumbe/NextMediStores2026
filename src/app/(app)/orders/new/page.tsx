"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import productsData from "@/data/products.json";
import customersData from "@/data/customers.json";
import transportationData from "@/data/transportation.json";

type ProductRecord = {
  id: number;
  productName: string;
  scientificName: string;
  batchNumber: string;
  mrp: number;
  sellRate: number;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  availableQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  drugGroup: string;
  unit: string;
  categoryId: string;
  hsn: string;
};

type CustomerRecord = {
  id: number;
  customerName: string;
  mobile: string;
  email?: string;
  gstn?: string;
  address: string;
  city?: string;
  state?: string;
};

type TransportRecord = {
  id: number;
  name: string;
  vehicleNumber: string;
  contactNumber: string;
};

type OrderForm = {
  productId: string;
  batchNumber: string;
  customerId: string;
  orderDate: string;
  orderQuantity: string;
  deliveryAddress: string;
  billNumber: string;
  billDate: string;
  paymentMethod: "Cash" | "Cheque" | "Other";
  scheme: "Scheme 1" | "Scheme 2" | "No Scheme";
  unitOfMeasure: "Numbers" | "Transportation";
  transportation: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  gstAmount: string;
  saleRate: string;
  mrp: string;
};

type OrderErrors = Partial<Record<keyof OrderForm, string>> & { general?: string };

type ProductFilter = "all" | "in-stock" | "low-stock" | "out-of-stock" | "valid" | "expiring-30" | "expiring-90" | "expired";

const products = productsData as ProductRecord[];
const customers = customersData as CustomerRecord[];
const transportation = transportationData as TransportRecord[];

const initialForm: OrderForm = {
  productId: "",
  batchNumber: "",
  customerId: "",
  orderDate: "",
  orderQuantity: "1",
  deliveryAddress: "",
  billNumber: "",
  billDate: "",
  paymentMethod: "Cash",
  scheme: "No Scheme",
  unitOfMeasure: "Numbers",
  transportation: "",
  discountType: "fixed",
  discountValue: "0",
  gstAmount: "0",
  saleRate: "0",
  mrp: "0",
};

const productFilterLabels: Array<{ label: string; value: ProductFilter }> = [
  { label: "All", value: "all" },
  { label: "In Stock", value: "in-stock" },
  { label: "Low Stock", value: "low-stock" },
  { label: "Out of Stock", value: "out-of-stock" },
  { label: "Valid", value: "valid" },
  { label: "Expiring ≤ 30 Days", value: "expiring-30" },
  { label: "Expiring ≤ 90 Days", value: "expiring-90" },
  { label: "Expired", value: "expired" },
];

function money(value: number | string) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysLeft(dateString: string) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const expiry = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
  const difference = expiry.getTime() - Date.now();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function getProductState(product: ProductRecord | undefined) {
  if (!product) return { label: "Unavailable", className: "badge bg-secondary" };
  const remainingDays = daysLeft(product.expiryDate);
  if (product.availableQuantity <= 0) return { label: "Out of Stock", className: "badge bg-danger" };
  if (product.availableQuantity <= product.minQuantity) return { label: "Low Stock", className: "badge bg-warning text-dark" };
  if (remainingDays < 0) return { label: "Expired", className: "badge bg-danger" };
  if (remainingDays <= 30) return { label: "Expiring Soon", className: "badge bg-warning text-dark" };
  return { label: "Available", className: "badge bg-success" };
}

function getExpiryState(product: ProductRecord | undefined) {
  if (!product) return { label: "—", className: "badge bg-secondary" };
  const remainingDays = daysLeft(product.expiryDate);
  if (remainingDays < 0) return { label: "Expired", className: "badge bg-danger" };
  if (remainingDays <= 30) return { label: "Expiring Soon", className: "badge bg-warning text-dark" };
  if (remainingDays <= 90) return { label: "Valid", className: "badge bg-success" };
  return { label: "Valid", className: "badge bg-success" };
}

function getSelectedProduct(productId: string) {
  if (!productId) return undefined;
  return products.find((item) => String(item.id) === productId);
}

function getSelectedCustomer(customerId: string) {
  if (!customerId) return undefined;
  return customers.find((item) => String(item.id) === customerId);
}

function isProductSelectable(product: ProductRecord | undefined) {
  if (!product) return false;
  return daysLeft(product.expiryDate) >= 0;
}

export default function NewOrderPage() {
  const [form, setForm] = useState<OrderForm>(initialForm);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("in-stock");
  const [errors, setErrors] = useState<OrderErrors>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const selectedProduct = useMemo(() => getSelectedProduct(form.productId), [form.productId]);
  const selectedCustomer = useMemo(() => getSelectedCustomer(form.customerId), [form.customerId]);

  const productOptions = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      const searchValue = [
        product.productName,
        product.batchNumber,
        product.manufacturer,
        product.scientificName,
        product.drugGroup,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchValue.includes(query);
      const remainingDays = daysLeft(product.expiryDate);

      const matchesFilter = (() => {
        if (productFilter === "all") return true;
        if (productFilter === "in-stock") return product.availableQuantity > 0 && product.availableQuantity > product.minQuantity && remainingDays >= 0;
        if (productFilter === "low-stock") return product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity && remainingDays >= 0;
        if (productFilter === "out-of-stock") return product.availableQuantity <= 0;
        if (productFilter === "valid") return remainingDays > 30;
        if (productFilter === "expiring-30") return remainingDays > 0 && remainingDays <= 30;
        if (productFilter === "expiring-90") return remainingDays > 0 && remainingDays <= 90;
        if (productFilter === "expired") return remainingDays < 0;
        return true;
      })();

      return matchesSearch && matchesFilter;
    });
  }, [productFilter, productSearch]);

  const customerOptions = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.customerName, customer.mobile, customer.gstn ?? "", customer.address].join(" ").toLowerCase().includes(query),
    );
  }, [customerSearch]);

  const orderQuantity = Number(form.orderQuantity || 0);
  const saleRate = Number(form.saleRate || selectedProduct?.sellRate || 0);
  const gstAmount = Number(form.gstAmount || 0);
  const discountValue = Number(form.discountValue || 0);
  const subtotal = saleRate * orderQuantity;
  const computedGst = gstAmount;
  const computedDiscount = form.discountType === "percentage"
    ? (subtotal * discountValue) / 100
    : discountValue;
  const total = Math.max(0, subtotal + computedGst - computedDiscount);

  useEffect(() => {
    if (!selectedProduct) {
      setForm((current) => ({ ...current, batchNumber: "", mrp: "0", saleRate: "0", gstAmount: "0" }));
      return;
    }

    setForm((current) => ({
      ...current,
      batchNumber: current.batchNumber || selectedProduct.batchNumber,
      mrp: String(selectedProduct.mrp),
      saleRate: String(selectedProduct.sellRate),
      gstAmount: String((selectedProduct.mrp * 0.12).toFixed(2)),
    }));
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedCustomer && !form.deliveryAddress.trim()) {
      setForm((current) => ({ ...current, deliveryAddress: selectedCustomer.address }));
    }
  }, [selectedCustomer, form.deliveryAddress]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSubmit();
      }
      if (event.key === "Escape") {
        setToast(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function updateField<K extends keyof OrderForm>(field: K, value: OrderForm[K]) {
    setHasChanges(true);
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, general: undefined }));
  }

  function resetForm() {
    setForm(initialForm);
    setProductSearch("");
    setCustomerSearch("");
    setErrors({});
    setHasChanges(false);
    setToast(null);
  }

  function validateForm(): OrderErrors {
    const nextErrors: OrderErrors = {};

    if (!form.productId) nextErrors.productId = "Product is required.";
    if (!form.customerId) nextErrors.customerId = "Customer is required.";
    if (!form.orderDate) nextErrors.orderDate = "Order date is required.";
    if (!form.orderQuantity || Number(form.orderQuantity) <= 0) nextErrors.orderQuantity = "Order quantity must be greater than 0.";
    if (!form.deliveryAddress.trim()) nextErrors.deliveryAddress = "Delivery address is required.";
    if (!form.paymentMethod) nextErrors.paymentMethod = "Payment method is required.";
    if (!form.unitOfMeasure) nextErrors.unitOfMeasure = "Unit of measure is required.";
    if (form.billDate && form.orderDate && new Date(`${form.billDate}T00:00:00`) > new Date(`${form.orderDate}T00:00:00`)) {
      nextErrors.billDate = "Bill date cannot be after order date.";
    }
    if (selectedProduct && daysLeft(selectedProduct.expiryDate) < 0) {
      nextErrors.productId = "Expired product cannot be selected.";
    }
    if (selectedProduct && Number(form.orderQuantity || 0) > selectedProduct.availableQuantity) {
      nextErrors.orderQuantity = "Insufficient stock.";
    }
    if (Number(form.gstAmount || 0) < 0) nextErrors.gstAmount = "GST amount cannot be negative.";
    if (Number(form.discountValue || 0) < 0) nextErrors.discountValue = "Discount cannot be negative.";
    if (Number(form.saleRate || 0) < 0 || Number(form.mrp || 0) < 0) {
      nextErrors.saleRate = "Prices cannot be negative.";
      nextErrors.mrp = "Prices cannot be negative.";
    }
    if (Number(form.orderQuantity || 0) > 0 && selectedProduct && Number(form.orderQuantity || 0) > selectedProduct.availableQuantity) {
      nextErrors.general = "Insufficient stock.";
    }

    return nextErrors;
  }

  function handleSubmit() {
    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast({ type: "error", message: nextErrors.general || "Please fix the highlighted fields before saving the order." });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setToast({ type: "success", message: "Order created successfully." });
      setIsSubmitting(false);
      setHasChanges(false);
      resetForm();
    }, 500);
  }

  const isLowStock = selectedProduct ? selectedProduct.availableQuantity > 0 && selectedProduct.availableQuantity <= selectedProduct.minQuantity : false;
  const hasInsufficientStock = selectedProduct ? Number(form.orderQuantity || 0) > selectedProduct.availableQuantity : false;
  const selectedProductState = getProductState(selectedProduct);
  const expiryState = getExpiryState(selectedProduct);

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none">Dashboard</Link></li>
                <li className="breadcrumb-item active" aria-current="page">New Order</li>
              </ol>
            </nav>
            <h1 className="h2 mb-1">Order Details</h1>
            <p className="text-secondary mb-0">Create new pharmacy order entry</p>
          </div>
          <Link href="/dashboard" className="btn btn-outline-secondary" type="button">Back</Link>
        </div>

        {toast && (
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} shadow-sm mt-2`} role="alert">
            <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-triangle"} me-2`} aria-hidden="true" />
            {toast.message}
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 38, height: 38 }}>
                    <i className="bi bi-box-seam" aria-hidden="true" />
                  </span>
                  <h2 className="h4 mb-0">Order Information</h2>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Product Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.productId ? "is-invalid" : ""}`}
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Search product, batch, manufacturer..."
                    />
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {productFilterLabels.map((filter) => (
                        <button
                          key={filter.value}
                          type="button"
                          className={`btn btn-sm ${productFilter === filter.value ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => setProductFilter(filter.value)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    {productOptions.length > 0 ? (
                      <div className="list-group mt-3 small" style={{ maxHeight: 220, overflow: "auto" }}>
                        {productOptions.map((product) => {
                          const productState = getProductState(product);
                          const expired = daysLeft(product.expiryDate) < 0;
                          return (
                            <button
                              key={product.id}
                              type="button"
                              className={`list-group-item list-group-item-action ${form.productId === String(product.id) ? "active" : ""}`}
                              onClick={() => {
                                if (expired) {
                                  setToast({ type: "error", message: "Expired product cannot be selected." });
                                  return;
                                }
                                updateField("productId", String(product.id));
                                updateField("batchNumber", product.batchNumber);
                              }}
                            >
                              <div className="d-flex justify-content-between gap-3 align-items-center">
                                <div>
                                  <div className="fw-semibold">{product.productName}</div>
                                  <small className="text-muted">{product.batchNumber} · {product.manufacturer}</small>
                                </div>
                                <span className={productState.className}>{productState.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="alert alert-light border mt-3 mb-0">No matching products found.</div>
                    )}
                    {errors.productId && <div className="invalid-feedback d-block">{errors.productId}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Customer Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.customerId ? "is-invalid" : ""}`}
                      value={customerSearch}
                      onChange={(event) => setCustomerSearch(event.target.value)}
                      placeholder="Search by name, mobile or GSTN"
                    />
                    {customerOptions.length > 0 && (
                      <div className="list-group mt-3 small" style={{ maxHeight: 180, overflow: "auto" }}>
                        {customerOptions.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            className={`list-group-item list-group-item-action ${form.customerId === String(customer.id) ? "active" : ""}`}
                            onClick={() => {
                              updateField("customerId", String(customer.id));
                              updateField("deliveryAddress", customer.address);
                              setCustomerSearch(customer.customerName);
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center gap-3">
                              <div>
                                <div className="fw-semibold">{customer.customerName}</div>
                                <small className="text-muted">{customer.mobile} · {customer.gstn || "GST not available"}</small>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.customerId && <div className="invalid-feedback d-block">{errors.customerId}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Order Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className={`form-control ${errors.orderDate ? "is-invalid" : ""}`}
                      value={form.orderDate}
                      onChange={(event) => updateField("orderDate", event.target.value)}
                    />
                    {errors.orderDate && <div className="invalid-feedback d-block">{errors.orderDate}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Order Quantity <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      min="1"
                      className={`form-control ${errors.orderQuantity ? "is-invalid" : ""}`}
                      value={form.orderQuantity}
                      onChange={(event) => updateField("orderQuantity", event.target.value)}
                    />
                    {selectedProduct && (
                      <small className="text-muted d-block mt-1">Available: {selectedProduct.availableQuantity} units</small>
                    )}
                    {errors.orderQuantity && <div className="invalid-feedback d-block">{errors.orderQuantity}</div>}
                    {isLowStock && !hasInsufficientStock && (
                      <div className="alert alert-warning mt-2 mb-0 py-2 small">Low stock warning: quantity is within available stock, but stock is running low.</div>
                    )}
                    {hasInsufficientStock && <div className="alert alert-danger mt-2 mb-0 py-2 small">Insufficient stock.</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-info-subtle text-info" style={{ width: 38, height: 38 }}>
                    <i className="bi bi-truck" aria-hidden="true" />
                  </span>
                  <h2 className="h4 mb-0">Delivery &amp; Billing</h2>
                </div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Delivery Address <span className="text-danger">*</span></label>
                    <textarea
                      rows={3}
                      className={`form-control ${errors.deliveryAddress ? "is-invalid" : ""}`}
                      value={form.deliveryAddress}
                      onChange={(event) => updateField("deliveryAddress", event.target.value)}
                    />
                    {errors.deliveryAddress && <div className="invalid-feedback d-block">{errors.deliveryAddress}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Bill Number</label>
                    <input type="text" className="form-control" value={form.billNumber} onChange={(event) => updateField("billNumber", event.target.value)} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Bill Date</label>
                    <input type="date" className={`form-control ${errors.billDate ? "is-invalid" : ""}`} value={form.billDate} onChange={(event) => updateField("billDate", event.target.value)} />
                    {errors.billDate && <div className="invalid-feedback d-block">{errors.billDate}</div>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-warning-subtle text-warning" style={{ width: 38, height: 38 }}>
                    <i className="bi bi-currency-rupee" aria-hidden="true" />
                  </span>
                  <h2 className="h4 mb-0">Price &amp; Tax</h2>
                </div>

                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label">Product MRP</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className="form-control" value={form.mrp} readOnly />
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Product Sale Rate</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className={`form-control ${errors.saleRate ? "is-invalid" : ""}`} value={form.saleRate} min="0" step="0.01" onChange={(event) => updateField("saleRate", event.target.value)} />
                    </div>
                    {errors.saleRate && <div className="invalid-feedback d-block">{errors.saleRate}</div>}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">GST Amount</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className={`form-control ${errors.gstAmount ? "is-invalid" : ""}`} value={form.gstAmount} min="0" step="0.01" onChange={(event) => updateField("gstAmount", event.target.value)} />
                    </div>
                    {errors.gstAmount && <div className="invalid-feedback d-block">{errors.gstAmount}</div>}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Discount Type</label>
                    <select className="form-select" value={form.discountType} onChange={(event) => updateField("discountType", event.target.value as "percentage" | "fixed")}>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Applicable Discount</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="number" className={`form-control ${errors.discountValue ? "is-invalid" : ""}`} value={form.discountValue} min="0" step="0.01" onChange={(event) => updateField("discountValue", event.target.value)} />
                    </div>
                    {errors.discountValue && <div className="invalid-feedback d-block">{errors.discountValue}</div>}
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Subtotal</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="text" className="form-control" value={money(subtotal)} readOnly />
                    </div>
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">Total Amount</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input type="text" className="form-control" value={money(total)} readOnly />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-success-subtle text-success" style={{ width: 38, height: 38 }}>
                    <i className="bi bi-wallet2" aria-hidden="true" />
                  </span>
                  <h2 className="h4 mb-0">Payment &amp; Options</h2>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Payment Method <span className="text-danger">*</span></label>
                    <select className={`form-select ${errors.paymentMethod ? "is-invalid" : ""}`} value={form.paymentMethod} onChange={(event) => updateField("paymentMethod", event.target.value as OrderForm["paymentMethod"])}>
                      <option value="Cash">By Cash</option>
                      <option value="Cheque">By Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.paymentMethod && <div className="invalid-feedback d-block">{errors.paymentMethod}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Scheme</label>
                    <select className="form-select" value={form.scheme} onChange={(event) => updateField("scheme", event.target.value as OrderForm["scheme"])}>
                      <option value="No Scheme">No Scheme</option>
                      <option value="Scheme 1">Scheme 1</option>
                      <option value="Scheme 2">Scheme 2</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Unit Of Measure <span className="text-danger">*</span></label>
                    <select className={`form-select ${errors.unitOfMeasure ? "is-invalid" : ""}`} value={form.unitOfMeasure} onChange={(event) => updateField("unitOfMeasure", event.target.value as OrderForm["unitOfMeasure"])}>
                      <option value="Numbers">Numbers</option>
                      <option value="Transportation">Transportation</option>
                    </select>
                    {errors.unitOfMeasure && <div className="invalid-feedback d-block">{errors.unitOfMeasure}</div>}
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Transportation</label>
                    <select className="form-select" value={form.transportation} onChange={(event) => updateField("transportation", event.target.value)}>
                      <option value="">Select transportation</option>
                      {transportation.map((item) => (
                        <option key={item.id} value={item.name}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: 20 }}>
              <div className="card-body p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <h2 className="h5 mb-0">Order Summary</h2>
                  {selectedProduct && (
                    <span className={selectedProductState.className}>{selectedProductState.label}</span>
                  )}
                </div>

                <div className="border rounded-3 p-3 mb-3 bg-light-subtle">
                  <div className="d-flex justify-content-between small text-secondary">
                    <span>Product</span>
                    <span className="fw-semibold text-dark">{selectedProduct?.productName || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mt-2">
                    <span>Batch</span>
                    <span className="fw-semibold text-dark">{selectedProduct?.batchNumber || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mt-2">
                    <span>Customer</span>
                    <span className="fw-semibold text-dark">{selectedCustomer?.customerName || "—"}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mt-2">
                    <span>Quantity</span>
                    <span className="fw-semibold text-dark">{form.orderQuantity || 0}</span>
                  </div>
                </div>

                {selectedProduct && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small text-secondary mb-2">
                      <span>Available</span>
                      <span className="fw-semibold text-dark">{selectedProduct.availableQuantity}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-secondary mb-2">
                      <span>Expiry</span>
                      <span className={expiryState.className}>{formatDate(selectedProduct.expiryDate)}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-secondary mb-2">
                      <span>MRP</span>
                      <span className="fw-semibold text-dark">{money(selectedProduct.mrp)}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-secondary mb-2">
                      <span>Sale Rate</span>
                      <span className="fw-semibold text-dark">{money(selectedProduct.sellRate)}</span>
                    </div>
                  </div>
                )}

                <div className="border-top pt-3 mt-3">
                  <div className="d-flex justify-content-between small text-secondary mb-2">
                    <span>Subtotal</span>
                    <span className="fw-semibold text-dark">{money(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mb-2">
                    <span>GST</span>
                    <span className="fw-semibold text-dark">{money(computedGst)}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mb-2">
                    <span>Discount</span>
                    <span className="fw-semibold text-dark">{money(computedDiscount)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mt-2">
                    <span>Payment</span>
                    <span>{form.paymentMethod}</span>
                  </div>
                </div>

                <div className="d-grid gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>Reset Order</button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting || hasInsufficientStock || !!selectedProduct && daysLeft(selectedProduct.expiryDate) < 0}
                  >
                    {isSubmitting ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />Saving...</> : "Create Order"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
