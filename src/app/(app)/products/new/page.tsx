"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { calculatePTR } from "@/utils/product-pricing";
import type { HsnMongoRecord } from "@/types/hsn";

type ProductRecord = {
  _id?: string;
  id: string;
  productName: string;
  batchNumber: string;
  mrp: number;
  gst: number;
  retailerMargin: number;
  ptrSellRate: number;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  availableQuantity: number;
  unitQuantity: number;
  hsnCode: string;
  hsn?: string;
};

type ProductForm = {
  productName: string;
  manufacturer: string;
  batchNumber: string;
  drugContent: string;
  packingDescription: string;
  mrp: string;
  ptrSellRate: string;
  gstPercentage: string;
  retailerMargin: string;
  availableQuantity: string;
  unitQuantity: string;
  manufactureDate: string;
  expiryDate: string;
  hsn: string;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

async function fetchProducts(): Promise<ProductRecord[]> {
  const response = await fetch("/api/products", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load products.");
  }

  const payload = await response.json();
  const records = Array.isArray(payload?.records) ? payload.records : Array.isArray(payload) ? payload : [];
  return records.map((record: Partial<ProductRecord> & { _id?: string | { toString(): string } }) => ({
    _id: record._id ? String(record._id) : undefined,
    id: String(record.id ?? record._id ?? Date.now()),
    productName: record.productName ?? "",
    batchNumber: record.batchNumber ?? "",
    mrp: Number(record.mrp ?? 0),
    gst: Number(record.gst ?? 0),
    retailerMargin: Number(record.retailerMargin ?? 20),
    ptrSellRate: Number(record.ptrSellRate ?? record.mrp ?? 0),
    manufacturer: record.manufacturer ?? "",
    manufactureDate: record.manufactureDate ?? "",
    expiryDate: record.expiryDate ?? "",
    drugContent: record.drugContent ?? "",
    packingDescription: record.packingDescription ?? "",
    availableQuantity: Number(record.availableQuantity ?? 0),
    unitQuantity: Number(record.unitQuantity ?? 0),
    hsnCode: record.hsnCode ?? record.hsn ?? "",
    hsn: record.hsn ?? record.hsnCode ?? "",
  }));
}

function slugify(value: string) {
  return String(value || "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function normalizeProduct(item: Partial<ProductRecord>): ProductRecord {
  const identifier = item.id ?? item._id ?? Date.now().toString();

  return {
    _id: item._id ? String(item._id) : undefined,
    id: String(identifier),
    productName: item.productName ?? "",
    batchNumber: item.batchNumber ?? "",
    mrp: Number(item.mrp ?? 0),
    gst: Number(item.gst ?? 0),
    retailerMargin: Number(item.retailerMargin ?? 20),
    ptrSellRate: Number(item.ptrSellRate ?? item.mrp ?? 0),
    manufacturer: item.manufacturer ?? "",
    manufactureDate: item.manufactureDate ?? "",
    expiryDate: item.expiryDate ?? "",
    drugContent: item.drugContent ?? "",
    packingDescription: item.packingDescription ?? "",
    availableQuantity: Number(item.availableQuantity ?? 0),
    unitQuantity: Number(item.unitQuantity ?? 0),
    hsnCode: item.hsnCode ?? item.hsn ?? "",
    hsn: item.hsn ?? item.hsnCode ?? "",
  };
}

const initialForm: ProductForm = {
  productName: "",
  manufacturer: "",
  batchNumber: "",
  drugContent: "",
  packingDescription: "",
  mrp: "",
  ptrSellRate: "",
  gstPercentage: "",
  retailerMargin: "20",
  availableQuantity: "0",
  unitQuantity: "0",
  manufactureDate: "",
  expiryDate: "",
  hsn: "",
};

function parseDate(value: string) {
  if (!value) return Number.NaN;
  return new Date(`${value}T00:00:00`).getTime();
}

function getValidationErrors(form: ProductForm, hsnOptions: HsnMongoRecord[]): FormErrors {
  const errors: FormErrors = {};

  if (!form.productName.trim()) errors.productName = "Product name is required.";
  if (!form.manufacturer.trim()) errors.manufacturer = "Manufacturer is required";
  if (!form.batchNumber.trim()) errors.batchNumber = "Batch number is required.";
  if (!form.drugContent.trim()) errors.drugContent = "Drug content is required.";
  if (!form.hsn.trim()) errors.hsn = "HSN is required.";
  else if (!/^\d{4}$/.test(form.hsn) || !hsnOptions.some((record) => record.hsnCode === form.hsn)) errors.hsn = "Select a valid active four-digit HSN code.";

  if (!form.manufactureDate) {
    errors.manufactureDate = "Manufacture Date is required";
  } else if (Number.isNaN(parseDate(form.manufactureDate))) {
    errors.manufactureDate = "Manufacture Date is required";
  }

  if (!form.expiryDate) {
    errors.expiryDate = "Expiry Date is required";
  } else if (Number.isNaN(parseDate(form.expiryDate))) {
    errors.expiryDate = "Expiry Date is required";
  } else if (form.manufactureDate && !Number.isNaN(parseDate(form.manufactureDate))) {
    const manufactureTime = parseDate(form.manufactureDate);
    const expiryTime = parseDate(form.expiryDate);
    if (expiryTime <= manufactureTime) {
      errors.expiryDate = "Expiry Date must be later than Manufacture Date";
    }
  }

  const mrp = Number(form.mrp);
  const ptrSellRate = Number(form.ptrSellRate);
  const gst = Number(form.gstPercentage);
  const retailerMargin = Number(form.retailerMargin);
  const availableQuantity = Number(form.availableQuantity);
  const unitQuantity = Number(form.unitQuantity);

  if (form.mrp === "") errors.mrp = "MRP is required";
  else if (Number.isNaN(mrp) || mrp < 0) errors.mrp = "MRP must be a valid number greater than or equal to 0.";

  if (form.ptrSellRate === "") errors.ptrSellRate = "PTR (Sell Rate) is required";
  else if (Number.isNaN(ptrSellRate) || ptrSellRate < 0) errors.ptrSellRate = "PTR (Sell Rate) must be a valid number greater than or equal to 0.";

  if (form.gstPercentage !== "" && (Number.isNaN(gst) || gst < 0)) {
    errors.gstPercentage = "GST % must be a valid number greater than or equal to 0.";
  }
  if (form.retailerMargin !== "" && (Number.isNaN(retailerMargin) || retailerMargin < 0 || retailerMargin > 100)) {
    errors.retailerMargin = "Retailer margin must be between 0 and 100.";
  }

  if (form.availableQuantity === "") errors.availableQuantity = "Available Quantity is required";
  else if (Number.isNaN(availableQuantity) || availableQuantity < 0) errors.availableQuantity = "Available Quantity cannot be negative";

  if (form.unitQuantity === "") errors.unitQuantity = "Unit Quantity is required";
  else if (Number.isNaN(unitQuantity) || unitQuantity <= 0) errors.unitQuantity = "Unit Quantity must be greater than 0";

  return errors;
}

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productList, setProductList] = useState<ProductRecord[]>([]);
  const [hsnOptions, setHsnOptions] = useState<HsnMongoRecord[]>([]);

  useEffect(() => {
    void fetch("/api/hsn", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load HSN options.");
        const payload = await response.json();
        setHsnOptions((payload.records as HsnMongoRecord[]).filter((record) => record.status === "Active"));
      })
      .catch(() => setHsnOptions([]));
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchProducts();
        setProductList(products);
      } catch {
        setProductList([]);
      }
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id) {
      setEditingId(null);
      setForm(initialForm);
      return;
    }

    const selected = productList.find((item) => item.id === id || item._id === id);
    if (!selected) {
      setEditingId(null);
      setForm(initialForm);
      return;
    }

    const normalized = normalizeProduct(selected);
    setEditingId(id);
    setForm({
      productName: normalized.productName,
      manufacturer: normalized.manufacturer,
      batchNumber: normalized.batchNumber ?? "",
      drugContent: normalized.drugContent,
      packingDescription: normalized.packingDescription ?? "",
      mrp: String(normalized.mrp ?? ""),
      ptrSellRate: String(normalized.ptrSellRate ?? ""),
      gstPercentage: String(normalized.gst ?? ""),
      retailerMargin: String(normalized.retailerMargin ?? 20),
      availableQuantity: String(normalized.availableQuantity ?? 0),
      unitQuantity: String(normalized.unitQuantity ?? 0),
      manufactureDate: normalized.manufactureDate ?? "",
      expiryDate: normalized.expiryDate ?? "",
      hsn: normalized.hsnCode,
    });
  }, [productList, searchParams]);

  const manufacturerOptions = useMemo(() => {
    const values = productList.map((item) => item.manufacturer).filter(Boolean);
    return Array.from(new Set(values));
  }, [productList]);

  const handleChange = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setToast(null);
  };

  const handleCalculatePtr = () => {
    const mrpValue = Number(form.mrp);
    const gstValue = Number(form.gstPercentage);
    const retailerMarginValue = Number(form.retailerMargin);

    if (!form.mrp || !form.gstPercentage || !form.retailerMargin) {
      setErrors((current) => ({
        ...current,
        mrp: form.mrp ? "" : "MRP is required for PTR calculation.",
        gstPercentage: form.gstPercentage ? "" : "GST % is required for PTR calculation.",
        retailerMargin: form.retailerMargin ? "" : "Retailer margin is required for PTR calculation.",
      }));
      return;
    }

    const calculatedPtr = calculatePTR(mrpValue, gstValue, retailerMarginValue);
    if (Number.isNaN(calculatedPtr)) {
      setErrors((current) => ({
        ...current,
        mrp: mrpValue <= 0 ? "MRP must be greater than 0." : current.mrp || "",
        gstPercentage: gstValue < 0 ? "GST cannot be negative." : current.gstPercentage || "",
        retailerMargin: retailerMarginValue < 0 || retailerMarginValue > 100 ? "Retailer margin must be between 0 and 100." : current.retailerMargin || "",
      }));
      return;
    }

    setErrors((current) => ({
      ...current,
      mrp: "",
      gstPercentage: "",
      retailerMargin: "",
      ptrSellRate: "",
    }));
    setForm((current) => ({ ...current, ptrSellRate: String(calculatedPtr) }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = getValidationErrors(form, hsnOptions);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      productName: form.productName.trim(),
      batchNumber: form.batchNumber.trim(),
      mrp: Number(form.mrp || 0),
      gst: Number(form.gstPercentage || 0),
      retailerMargin: Number(form.retailerMargin || 20),
      ptrSellRate: Number(form.ptrSellRate || 0),
      manufacturer: form.manufacturer.trim(),
      manufactureDate: form.manufactureDate,
      expiryDate: form.expiryDate,
      drugContent: form.drugContent.trim(),
      packingDescription: form.packingDescription.trim(),
      availableQuantity: Number(form.availableQuantity || 0),
      unitQuantity: Number(form.unitQuantity || 0),
      hsn: form.hsn.trim(),
      hsnCode: form.hsn.trim(),
      replacement: false,
      discountAllow: false,
      dpcoProduct: false,
      drugGroup: "",
      unitType: "",
    };

    try {
      const response = editingId
        ? await fetch(`/api/products/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to save product.");
      }

      window.sessionStorage.setItem("productToast", editingId ? "Product updated successfully" : "Product created successfully");
      router.push("/products");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to save product.");
    }
  };

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <header className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-2 small text-secondary">
                <li className="breadcrumb-item">
                  <Link href="/products" className="text-decoration-none">Products</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">{editingId ? "Edit Product" : "New Product"}</li>
              </ol>
            </nav>
            <div>
              <h1 className="h2 mb-1">{editingId ? "Edit Product" : "New Product"}</h1>
              <p className="text-secondary mb-0">{editingId ? "Update product details in your inventory" : "Add a new product to your inventory"}</p>
            </div>
          </div>

          <Link href="/products" className="btn btn-outline-secondary align-self-start">
            <i className="bi bi-arrow-left me-2" aria-hidden="true" />Back to Products
          </Link>
        </header>

        {toast && (
          <div className="alert alert-success shadow-sm" role="alert" aria-live="polite">
            <i className="bi bi-check-circle me-2" aria-hidden="true" />
            {toast}
          </div>
        )}

        <form onSubmit={handleSave} noValidate>
          <section className="card border-0 rounded-3 shadow-sm mb-4">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-info-circle" aria-hidden="true" />
                </span>
                <h2 className="h4 mb-0">Basic Information</h2>
              </div>

              <div className="row g-3">
                <div className="col-xl-4 col-md-6">
                  <label htmlFor="productName" className="form-label">Product Name <span className="text-danger">*</span></label>
                  <input
                    id="productName"
                    type="text"
                    className={`form-control ${errors.productName ? "is-invalid" : ""}`}
                    placeholder="Enter product name"
                    value={form.productName}
                    onChange={(event) => handleChange("productName", event.target.value)}
                    aria-invalid={Boolean(errors.productName)}
                    aria-describedby={errors.productName ? "productName-feedback" : undefined}
                  />
                  {errors.productName && <div id="productName-feedback" className="invalid-feedback d-block">{errors.productName}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="manufacturer" className="form-label">Manufacturer <span className="text-danger">*</span></label>
                  <input
                    id="manufacturer"
                    list="manufacturer-options"
                    className={`form-control ${errors.manufacturer ? "is-invalid" : ""}`}
                    placeholder="Select manufacturer"
                    value={form.manufacturer}
                    onChange={(event) => handleChange("manufacturer", event.target.value)}
                    aria-invalid={Boolean(errors.manufacturer)}
                    aria-describedby={errors.manufacturer ? "manufacturer-feedback" : undefined}
                  />
                  <datalist id="manufacturer-options">
                    {manufacturerOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  {errors.manufacturer && <div id="manufacturer-feedback" className="invalid-feedback d-block">{errors.manufacturer}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="batchNumber" className="form-label">Batch Number <span className="text-danger">*</span></label>
                  <input
                    id="batchNumber"
                    type="text"
                    className={`form-control ${errors.batchNumber ? "is-invalid" : ""}`}
                    placeholder="Enter batch number"
                    value={form.batchNumber}
                    onChange={(event) => handleChange("batchNumber", event.target.value)}
                    aria-invalid={Boolean(errors.batchNumber)}
                    aria-describedby={errors.batchNumber ? "batchNumber-feedback" : undefined}
                  />
                  {errors.batchNumber && <div id="batchNumber-feedback" className="invalid-feedback d-block">{errors.batchNumber}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="drugContent" className="form-label">Drug Content <span className="text-danger">*</span></label>
                  <input
                    id="drugContent"
                    type="text"
                    className={`form-control ${errors.drugContent ? "is-invalid" : ""}`}
                    placeholder="Paracetamol 500 mg"
                    value={form.drugContent}
                    onChange={(event) => handleChange("drugContent", event.target.value)}
                    aria-invalid={Boolean(errors.drugContent)}
                    aria-describedby={errors.drugContent ? "drugContent-feedback" : undefined}
                  />
                  {errors.drugContent && <div id="drugContent-feedback" className="invalid-feedback d-block">{errors.drugContent}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="packingDescription" className="form-label">Packing Description</label>
                  <input
                    id="packingDescription"
                    type="text"
                    className="form-control"
                    placeholder="Strip of 15 tablets"
                    value={form.packingDescription}
                    onChange={(event) => handleChange("packingDescription", event.target.value)}
                  />
                </div>

              </div>
            </div>
          </section>

          <section className="card border-0 rounded-3 shadow-sm mb-4">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-warning-subtle text-warning" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-currency-rupee" aria-hidden="true" />
                </span>
                <h2 className="h4 mb-0">Pricing &amp; Tax</h2>
              </div>

              <div className="row g-3">
                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="mrp" className="form-label">MRP</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="mrp"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.mrp ? "is-invalid" : ""}`}
                      placeholder="0.00"
                      value={form.mrp}
                      onChange={(event) => handleChange("mrp", event.target.value)}
                    />
                  </div>
                  {errors.mrp && <div className="invalid-feedback d-block">{errors.mrp}</div>}
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="gstPercentage" className="form-label">GST %</label>
                  <div className="input-group">
                    <input
                      id="gstPercentage"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.gstPercentage ? "is-invalid" : ""}`}
                      placeholder="0"
                      value={form.gstPercentage}
                      onChange={(event) => handleChange("gstPercentage", event.target.value)}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  {errors.gstPercentage && <div className="invalid-feedback d-block">{errors.gstPercentage}</div>}
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="retailerMargin" className="form-label">Retailer Margin %</label>
                  <div className="input-group">
                    <input
                      id="retailerMargin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={`form-control ${errors.retailerMargin ? "is-invalid" : ""}`}
                      placeholder="20"
                      value={form.retailerMargin}
                      onChange={(event) => handleChange("retailerMargin", event.target.value)}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                  {errors.retailerMargin && <div className="invalid-feedback d-block">{errors.retailerMargin}</div>}
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6 d-flex align-items-end">
                  <button type="button" className="btn btn-outline-primary w-100" onClick={handleCalculatePtr}>
                    Calculate PTR
                  </button>
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="ptrSellRate" className="form-label">PTR (Sell Rate)</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="ptrSellRate"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.ptrSellRate ? "is-invalid" : ""}`}
                      placeholder="0.00"
                      value={form.ptrSellRate}
                      onChange={(event) => handleChange("ptrSellRate", event.target.value)}
                    />
                  </div>
                  {errors.ptrSellRate && <div className="invalid-feedback d-block">{errors.ptrSellRate}</div>}
                </div>

              </div>
            </div>
          </section>

          <section className="card border-0 rounded-3 shadow-sm mb-4">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-primary-subtle text-primary" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-box-seam" aria-hidden="true" />
                </span>
                <h2 className="h4 mb-0">Inventory</h2>
              </div>

              <div className="row g-3">
                <div className="col-xl-4 col-md-6">
                  <label htmlFor="availableQuantity" className="form-label">Available Quantity <span className="text-danger">*</span></label>
                  <input
                    id="availableQuantity"
                    type="number"
                    min="0"
                    className={`form-control ${errors.availableQuantity ? "is-invalid" : ""}`}
                    value={form.availableQuantity}
                    onChange={(event) => handleChange("availableQuantity", event.target.value)}
                  />
                  {errors.availableQuantity && <div className="invalid-feedback d-block">{errors.availableQuantity}</div>}
                </div>

              </div>
            </div>
          </section>

          <section className="card border-0 rounded-3 shadow-sm mb-4">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-info-subtle text-info" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-card-list" aria-hidden="true" />
                </span>
                <h2 className="h4 mb-0">Product Details</h2>
              </div>

              <div className="row g-3">
                <div className="col-xl-4 col-md-6">
                  <label htmlFor="unitQuantity" className="form-label">Unit Quantity <span className="text-danger">*</span></label>
                  <input
                    id="unitQuantity"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`form-control ${errors.unitQuantity ? "is-invalid" : ""}`}
                    value={form.unitQuantity}
                    onChange={(event) => handleChange("unitQuantity", event.target.value)}
                  />
                  {errors.unitQuantity && <div className="invalid-feedback d-block">{errors.unitQuantity}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="hsn" className="form-label">HSN Code <span className="text-danger">*</span></label>
                  <select
                    id="hsn"
                    className={`form-select ${errors.hsn ? "is-invalid" : ""}`}
                    value={form.hsn}
                    onChange={(event) => handleChange("hsn", event.target.value)}
                  >
                    <option value="">Select active HSN code</option>
                    {form.hsn && !hsnOptions.some((option) => option.hsnCode === form.hsn) && <option value={form.hsn} disabled>Saved value: {form.hsn} (select a valid code)</option>}
                    {hsnOptions.map((option) => <option key={option._id} value={option.hsnCode}>{option.hsnCode} — {option.category}</option>)}
                  </select>
                  {!hsnOptions.length && <div className="form-text">Complete an Active six-digit HSN record in HSN Master first.</div>}
                  {errors.hsn && <div className="invalid-feedback d-block">{errors.hsn}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="manufactureDate" className="form-label">Manufacture Date <span className="text-danger">*</span></label>
                  <input
                    id="manufactureDate"
                    type="date"
                    className={`form-control ${errors.manufactureDate ? "is-invalid" : ""}`}
                    value={form.manufactureDate}
                    onChange={(event) => handleChange("manufactureDate", event.target.value)}
                  />
                  {errors.manufactureDate && <div className="invalid-feedback d-block">{errors.manufactureDate}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="expiryDate" className="form-label">Expiry Date <span className="text-danger">*</span></label>
                  <input
                    id="expiryDate"
                    type="date"
                    className={`form-control ${errors.expiryDate ? "is-invalid" : ""}`}
                    value={form.expiryDate}
                    onChange={(event) => handleChange("expiryDate", event.target.value)}
                  />
                  {errors.expiryDate && <div className="invalid-feedback d-block">{errors.expiryDate}</div>}
                </div>
              </div>
            </div>
          </section>

          <div className="d-flex justify-content-end gap-3 mt-4 mb-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => router.push("/products")}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary px-4">
              <i className="bi bi-floppy me-2" aria-hidden="true" />{editingId ? "Update Product" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
