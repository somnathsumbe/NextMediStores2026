"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import productsData from "@/data/products.json";
import customersData from "@/data/customers.json";
import transportationData from "@/data/transportation.json";
import schemesData from "@/data/schemes.json";

type Mode = "order" | "purchase";

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
  quantity?: number;
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
  gstn?: string;
  address: string;
  city?: string;
  state?: string;
  email?: string;
};

type TransportRecord = {
  id: number;
  name: string;
  vehicleNumber: string;
  contactNumber: string;
};

type SchemeRecord = {
  id: number;
  name: string;
  description: string;
};

type FormState = {
  productId: string;
  partnerId: string;
  orderDate: string;
  quantity: string;
  deliveryAddress: string;
  billNumber: string;
  billDate: string;
  paymentMethod: "Cash" | "Cheque" | "Other";
  scheme: string;
  unitOfMeasure: string;
  transportation: string;
  mrp: string;
  rate: string;
  gstAmount: string;
  discountAmount: string;
  remarks: string;
};

type FormErrors = Partial<Record<keyof FormState, string>> & { general?: string };

type ProductFilter = "all" | "in-stock" | "low-stock" | "out-of-stock" | "valid" | "expiring-30" | "expiring-90" | "expired";

const products = productsData as ProductRecord[];
const customers = customersData as CustomerRecord[];
const transports = transportationData as TransportRecord[];
const schemes = schemesData as SchemeRecord[];
const PAYMENT_OPTIONS = ["Cash", "Cheque", "Other"];
const UOM_OPTIONS = ["Numbers", "Bottle", "Box", "Strip", "Pack", "Carton"];

const emptyForm = (): FormState => ({
  productId: "",
  partnerId: "",
  orderDate: "",
  quantity: "1",
  deliveryAddress: "",
  billNumber: "",
  billDate: "",
  paymentMethod: "Cash",
  scheme: "No Scheme",
  unitOfMeasure: "Numbers",
  transportation: "",
  mrp: "0",
  rate: "0",
  gstAmount: "0",
  discountAmount: "0",
  remarks: "",
});

function money(value: number | string) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function daysToExpiry(dateString: string) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const expiry = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getProductStatus(product?: ProductRecord) {
  if (!product) return { label: "Unavailable", className: "badge bg-secondary" };
  const remainingDays = daysToExpiry(product.expiryDate);
  if (product.availableQuantity <= 0) return { label: "Out of Stock", className: "badge bg-danger" };
  if (product.availableQuantity <= product.minQuantity) return { label: "Low Stock", className: "badge bg-warning text-dark" };
  if (remainingDays < 0) return { label: "Expired", className: "badge bg-danger" };
  if (remainingDays <= 30) return { label: "Expiring Soon", className: "badge bg-warning text-dark" };
  return { label: "Available", className: "badge bg-success" };
}

function buildValidation(mode: Mode, form: FormState, selectedProduct?: ProductRecord, selectedPartner?: CustomerRecord) {
  const errors: FormErrors = {};

  if (!form.productId) errors.productId = "Please select a product.";
  if (!form.partnerId) errors.partnerId = mode === "order" ? "Please select a customer." : "Please select a supplier.";
  if (!form.orderDate) errors.orderDate = `${mode === "order" ? "Order" : "Purchase"} date is required.`;
  if (!form.deliveryAddress.trim()) errors.deliveryAddress = "Delivery address is required.";
  if (!form.quantity || Number(form.quantity) <= 0) errors.quantity = "Quantity must be greater than zero.";
  if (selectedProduct) {
    if (daysToExpiry(selectedProduct.expiryDate) < 0) errors.productId = "Expired product cannot be selected.";
    if (mode === "order" && Number(form.quantity) > selectedProduct.availableQuantity) {
      errors.quantity = `Only ${selectedProduct.availableQuantity} units are available in stock.`;
    }
  }
  if (Number(form.mrp || 0) <= 0) errors.mrp = "MRP must be greater than zero.";
  if (Number(form.rate || 0) <= 0) errors.rate = "Rate must be greater than zero.";
  if (Number(form.gstAmount || 0) < 0) errors.gstAmount = "GST amount cannot be negative.";
  if (Number(form.discountAmount || 0) < 0) errors.discountAmount = "Discount cannot be negative.";
  if (form.billDate && form.orderDate && new Date(`${form.billDate}T00:00:00`) < new Date(`${form.orderDate}T00:00:00`)) {
    errors.billDate = "Bill date cannot be earlier than order date.";
  }
  if (selectedPartner && !selectedPartner.address && !form.deliveryAddress.trim()) {
    errors.deliveryAddress = "Address is required for this partner.";
  }

  return errors;
}

export default function OrderPurchaseForm({ mode, title, subtitle }: { mode: Mode; title: string; subtitle: string }) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [productSearch, setProductSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("in-stock");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === form.productId),
    [form.productId],
  );
  const selectedPartner = useMemo(
    () => customers.find((customer) => String(customer.id) === form.partnerId),
    [form.partnerId],
  );

  useEffect(() => {
    const id = window.setTimeout(() => setIsLoading(false), 350);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setForm((current) => ({ ...current, mrp: "0", rate: "0", gstAmount: "0", unitOfMeasure: "Numbers" }));
      return;
    }

    setForm((current) => ({
      ...current,
      mrp: String(selectedProduct.mrp),
      rate: mode === "order" ? String(selectedProduct.sellRate) : String(selectedProduct.mrp),
      gstAmount: String((Number(selectedProduct.mrp || 0) * 0.12).toFixed(2)),
      unitOfMeasure: selectedProduct.unit || "Numbers",
      deliveryAddress: current.deliveryAddress || selectedPartner?.address || "",
    }));
  }, [mode, selectedProduct, selectedPartner]);

  useEffect(() => {
    if (selectedPartner && !form.deliveryAddress.trim()) {
      setForm((current) => ({ ...current, deliveryAddress: selectedPartner.address }));
    }
  }, [selectedPartner, form.deliveryAddress]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const haystack = [
        product.productName,
        product.batchNumber,
        product.manufacturer,
        product.scientificName,
        product.drugGroup,
      ].join(" ").toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      const remainingDays = daysToExpiry(product.expiryDate);
      const matchesFilter = (() => {
        if (productFilter === "all") return true;
        if (productFilter === "in-stock") return product.availableQuantity > 0 && remainingDays >= 0;
        if (productFilter === "low-stock") return product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity && remainingDays >= 0;
        if (productFilter === "out-of-stock") return product.availableQuantity <= 0;
        if (productFilter === "valid") return remainingDays > 30;
        if (productFilter === "expiring-30") return remainingDays > 0 && remainingDays <= 30;
        if (productFilter === "expiring-90") return remainingDays > 0 && remainingDays <= 90;
        if (productFilter === "expired") return remainingDays < 0;
        return true;
      })();

      return matchesQuery && matchesFilter;
    });
  }, [productFilter, productSearch]);

  const filteredPartners = useMemo(() => {
    const query = partnerSearch.trim().toLowerCase();
    return customers.filter((customer) =>
      !query || [customer.customerName, customer.mobile, customer.address, customer.gstn ?? ""].join(" ").toLowerCase().includes(query),
    );
  }, [partnerSearch]);

  const subtotal = Number(form.rate || 0) * Number(form.quantity || 0);
  const gstValue = Number(form.gstAmount || 0);
  const discountValue = Number(form.discountAmount || 0);
  const total = Math.max(0, subtotal + gstValue - discountValue);

  const partnerLabel = mode === "order" ? "Customer" : "Supplier";
  const titleText = mode === "order" ? "Order Details" : "Purchase Details";
  const dateLabel = mode === "order" ? "Order Date" : "Purchase Date";

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateAndSubmit = () => {
    const validation = buildValidation(mode, form, selectedProduct, selectedPartner);
    setErrors(validation);

    if (Object.keys(validation).length > 0) {
      setToast({ type: "error", message: "Please correct the highlighted validation errors before saving." });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    if (!validateAndSubmit()) return;

    setIsSaving(true);
    setToast(null);

    await new Promise((resolve) => window.setTimeout(resolve, 500));

    setIsSaving(false);
    setToast({ type: "success", message: `${titleText} saved successfully.` });
    setForm(emptyForm());
    setProductSearch("");
    setPartnerSearch("");
  };

  const handleReset = () => {
    setForm(emptyForm());
    setErrors({});
    setToast(null);
    setProductSearch("");
    setPartnerSearch("");
  };

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none">Dashboard</Link></li>
                <li className="breadcrumb-item active" aria-current="page">{titleText}</li>
              </ol>
            </nav>
            <h1 className="h2 mb-1">{title}</h1>
            <p className="text-secondary mb-0">{subtitle}</p>
          </div>
          <Link href="/orders" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />Back to List
          </Link>
        </div>

        {toast && (
          <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} d-flex align-items-center mb-4`} role="alert">
            <i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-triangle"} me-2`} aria-hidden="true" />
            {toast.message}
          </div>
        )}

        {isLoading ? (
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center text-muted">Loading entry form...</div>
        ) : (
          <div className="row g-4">
            <div className="col-xl-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-3 p-lg-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Product</label>
                      <input
                        list="product-list"
                        className={`form-control ${errors.productId ? "is-invalid" : ""}`}
                        value={productSearch || products.find((product) => String(product.id) === form.productId)?.productName || ""}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Search product, batch, manufacturer"
                      />
                      <datalist id="product-list">
                        {filteredProducts.map((product) => (
                          <option key={product.id} value={product.productName} />
                        ))}
                      </datalist>
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {[
                          { label: "All", value: "all" },
                          { label: "In Stock", value: "in-stock" },
                          { label: "Low Stock", value: "low-stock" },
                          { label: "Out of Stock", value: "out-of-stock" },
                          { label: "Valid", value: "valid" },
                          { label: "Expiring ≤30d", value: "expiring-30" },
                          { label: "Expiring ≤90d", value: "expiring-90" },
                          { label: "Expired", value: "expired" },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            className={`btn btn-sm ${productFilter === item.value ? "btn-primary" : "btn-outline-secondary"}`}
                            onClick={() => setProductFilter(item.value as ProductFilter)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      {errors.productId && <div className="invalid-feedback d-block">{errors.productId}</div>}
                      <div className="mt-3">
                        <div className="list-group small">
                          {filteredProducts.slice(0, 5).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              className={`list-group-item list-group-item-action ${form.productId === String(product.id) ? "active" : ""}`}
                              onClick={() => {
                                setForm((current) => ({ ...current, productId: String(product.id) }));
                                setProductSearch(product.productName);
                              }}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-3">
                                <div>
                                  <div className="fw-semibold">{product.productName}</div>
                                  <div className="text-muted">Batch: {product.batchNumber} · {product.manufacturer}</div>
                                </div>
                                <div className="text-end">
                                  <div>{getProductStatus(product).label}</div>
                                  <small className="text-muted">Stock: {product.availableQuantity}</small>
                                </div>
                              </div>
                            </button>
                          ))}
                          {!filteredProducts.length && <div className="list-group-item text-muted">No products match the selected filters.</div>}
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">{partnerLabel}</label>
                      <input
                        list="partner-list"
                        className={`form-control ${errors.partnerId ? "is-invalid" : ""}`}
                        value={partnerSearch || customers.find((customer) => String(customer.id) === form.partnerId)?.customerName || ""}
                        onChange={(event) => setPartnerSearch(event.target.value)}
                        placeholder={`Search ${partnerLabel.toLowerCase()}`}
                      />
                      <datalist id="partner-list">
                        {filteredPartners.map((customer) => (
                          <option key={customer.id} value={customer.customerName} />
                        ))}
                      </datalist>
                      <div className="mt-3">
                        <div className="list-group small">
                          {filteredPartners.slice(0, 6).map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              className={`list-group-item list-group-item-action ${form.partnerId === String(customer.id) ? "active" : ""}`}
                              onClick={() => {
                                setForm((current) => ({ ...current, partnerId: String(customer.id), deliveryAddress: current.deliveryAddress || customer.address }));
                                setPartnerSearch(customer.customerName);
                              }}
                            >
                              <div className="fw-semibold">{customer.customerName}</div>
                              <div className="text-muted">{customer.mobile} · {customer.address}</div>
                            </button>
                          ))}
                          {!filteredPartners.length && <div className="list-group-item text-muted">No matching {partnerLabel.toLowerCase()} found.</div>}
                        </div>
                      </div>
                      {errors.partnerId && <div className="invalid-feedback d-block">{errors.partnerId}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">{dateLabel}</label>
                      <input type="date" className={`form-control ${errors.orderDate ? "is-invalid" : ""}`} value={form.orderDate} onChange={(event) => handleFieldChange("orderDate", event.target.value)} />
                      {errors.orderDate && <div className="invalid-feedback d-block">{errors.orderDate}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Quantity</label>
                      <input type="number" min="1" className={`form-control ${errors.quantity ? "is-invalid" : ""}`} value={form.quantity} onChange={(event) => handleFieldChange("quantity", event.target.value)} />
                      {errors.quantity && <div className="invalid-feedback d-block">{errors.quantity}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Payment Method</label>
                      <select className="form-select" value={form.paymentMethod} onChange={(event) => handleFieldChange("paymentMethod", event.target.value)}>
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Scheme</label>
                      <select className="form-select" value={form.scheme} onChange={(event) => handleFieldChange("scheme", event.target.value)}>
                        {schemes.map((scheme) => (
                          <option key={scheme.id} value={scheme.name}>{scheme.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Delivery Address</label>
                      <textarea className={`form-control ${errors.deliveryAddress ? "is-invalid" : ""}`} rows={3} value={form.deliveryAddress} onChange={(event) => handleFieldChange("deliveryAddress", event.target.value)} />
                      {errors.deliveryAddress && <div className="invalid-feedback d-block">{errors.deliveryAddress}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Bill Number</label>
                      <input className="form-control" value={form.billNumber} onChange={(event) => handleFieldChange("billNumber", event.target.value)} placeholder="BILL-1001" />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Bill Date</label>
                      <input type="date" className={`form-control ${errors.billDate ? "is-invalid" : ""}`} value={form.billDate} onChange={(event) => handleFieldChange("billDate", event.target.value)} />
                      {errors.billDate && <div className="invalid-feedback d-block">{errors.billDate}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">MRP</label>
                      <input type="number" step="0.01" className={`form-control ${errors.mrp ? "is-invalid" : ""}`} value={form.mrp} onChange={(event) => handleFieldChange("mrp", event.target.value)} />
                      {errors.mrp && <div className="invalid-feedback d-block">{errors.mrp}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">{mode === "order" ? "Sale Rate" : "Purchase Rate"}</label>
                      <input type="number" step="0.01" className={`form-control ${errors.rate ? "is-invalid" : ""}`} value={form.rate} onChange={(event) => handleFieldChange("rate", event.target.value)} />
                      {errors.rate && <div className="invalid-feedback d-block">{errors.rate}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">GST Amount</label>
                      <input type="number" step="0.01" className={`form-control ${errors.gstAmount ? "is-invalid" : ""}`} value={form.gstAmount} onChange={(event) => handleFieldChange("gstAmount", event.target.value)} />
                      {errors.gstAmount && <div className="invalid-feedback d-block">{errors.gstAmount}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Discount</label>
                      <input type="number" step="0.01" className={`form-control ${errors.discountAmount ? "is-invalid" : ""}`} value={form.discountAmount} onChange={(event) => handleFieldChange("discountAmount", event.target.value)} />
                      {errors.discountAmount && <div className="invalid-feedback d-block">{errors.discountAmount}</div>}
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Unit of Measure</label>
                      <select className="form-select" value={form.unitOfMeasure} onChange={(event) => handleFieldChange("unitOfMeasure", event.target.value)}>
                        {UOM_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Transportation</label>
                      <select className="form-select" value={form.transportation} onChange={(event) => handleFieldChange("transportation", event.target.value)}>
                        <option value="">Select transport</option>
                        {transports.map((transport) => (
                          <option key={transport.id} value={transport.name}>{transport.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Remarks</label>
                      <input className="form-control" value={form.remarks} onChange={(event) => handleFieldChange("remarks", event.target.value)} placeholder="Any note" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: 20 }}>
                <div className="card-body p-3 p-lg-4">
                  <h5 className="mb-3">Summary</h5>

                  {selectedProduct ? (
                    <div className="border rounded-3 p-3 mb-3 bg-light-subtle">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{selectedProduct.productName}</strong>
                        {getProductStatus(selectedProduct).label && <span className={getProductStatus(selectedProduct).className}>{getProductStatus(selectedProduct).label}</span>}
                      </div>
                      <div className="small text-muted">Batch: {selectedProduct.batchNumber}</div>
                      <div className="small text-muted">Expiry: {new Date(`${selectedProduct.expiryDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                      <div className="small text-muted">Stock: {selectedProduct.availableQuantity} · Manufacturer: {selectedProduct.manufacturer}</div>
                    </div>
                  ) : (
                    <div className="border rounded-3 p-3 mb-3 text-muted small">Select a product to view stock and expiry details.</div>
                  )}

                  <div className="d-flex justify-content-between mb-2"><span className="text-muted">Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span className="text-muted">GST</span><strong>{money(gstValue)}</strong></div>
                  <div className="d-flex justify-content-between mb-2"><span className="text-muted">Discount</span><strong>- {money(discountValue)}</strong></div>
                  <hr />
                  <div className="d-flex justify-content-between mb-3"><span className="fw-semibold">Total</span><strong className="fs-5">{money(total)}</strong></div>

                  <div className="d-grid gap-2">
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSaving}>
                      {isSaving ? "Saving..." : `Save ${titleText}`}
                    </button>
                    <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>Reset</button>
                    <Link href="/orders" className="btn btn-light">Cancel</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
