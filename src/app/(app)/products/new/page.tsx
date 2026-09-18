"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mockService } from "@/lib/mock-service";
import { calculatePTR } from "@/utils/product-pricing";

type ProductRecord = {
  id: number;
  productName: string;
  manufacturer: string;
  manufacturerId?: string;
  scientificName?: string;
  drugContent: string;
  packingDescription?: string;
  description?: string;
  mrp?: number;
  ptr?: number;
  gst?: number;
  gstPercentage?: number;
  retailerMargin?: number;
  sellRate?: number;
  saleRateMethod?: "MRP" | "DISCOUNTED" | "COST_PLUS" | "CUSTOM";
  calculateMethod?: "GST_INCLUSIVE" | "GST_EXCLUSIVE" | "MARGIN_BASED" | "FLAT_RATE";
  availableQuantity?: number;
  minQuantity?: number;
  maxQuantity?: number;
  manufactureDate?: string;
  expiryDate?: string;
  drugGroup: string;
  drugGroupId?: string;
  unit: string;
  unitId?: string;
  categoryId: string;
  hsn: string;
  hsnId?: string;
  replacementAllowed?: boolean;
  discountAllowed?: boolean;
  dpcoProduct?: boolean;
  replacement?: boolean;
  discountAllow?: boolean;
  batchNumber?: string;
  calculate?: string;
  status?: "ACTIVE" | "INACTIVE";
};

type ProductForm = {
  productName: string;
  manufacturer: string;
  manufacturerId: string;
  scientificName: string;
  batchNumber: string;
  drugContent: string;
  packingDescription: string;
  description: string;
  mrp: string;
  ptr: string;
  gstPercentage: string;
  retailerMargin: string;
  sellRate: string;
  saleRateMethod: string;
  calculateMethod: string;
  availableQuantity: string;
  minQuantity: string;
  maxQuantity: string;
  manufactureDate: string;
  expiryDate: string;
  drugGroup: string;
  drugGroupId: string;
  unit: string;
  unitId: string;
  categoryId: string;
  hsn: string;
  hsnId: string;
  replacement: boolean;
  discountAllow: boolean;
  dpcoProduct: boolean;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

const getProducts = () => mockService.get<ProductRecord>("products");

function slugify(value: string) {
  return String(value || "item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function toLegacyCalculation(value?: string) {
  switch (value) {
    case "GST_INCLUSIVE":
      return "GST Inclusive";
    case "GST_EXCLUSIVE":
      return "GST Exclusive";
    case "MARGIN_BASED":
      return "Margin Based";
    case "FLAT_RATE":
      return "Flat Rate";
    default:
      return "";
  }
}

function toLegacyRateMethod(value?: string) {
  switch (value) {
    case "MRP":
      return "MRP";
    case "DISCOUNTED":
      return "DISCOUNTED";
    case "COST_PLUS":
      return "COST_PLUS";
    case "CUSTOM":
      return "CUSTOM";
    case "Discounted":
      return "DISCOUNTED";
    case "Cost Plus":
      return "COST_PLUS";
    case "Custom":
      return "CUSTOM";
    default:
      return "";
  }
}

function normalizeProduct(item: Partial<ProductRecord>): ProductRecord {
  const manufacturer = item.manufacturer ?? "";
  const drugGroup = item.drugGroup ?? "";
  const unit = item.unit ?? "";
  const hsn = item.hsn ?? item.hsnId ?? "";

  return {
    id: Number(item.id ?? Date.now()),
    productName: item.productName ?? "",
    manufacturer,
    manufacturerId: item.manufacturerId ?? `MFG-${slugify(manufacturer) || "manufacturer"}`,
    scientificName: item.scientificName ?? "",
    drugContent: item.drugContent ?? "",
    packingDescription: item.packingDescription ?? "",
    description: item.description ?? "",
    mrp: Number(item.mrp ?? 0),
    ptr: Number(item.ptr ?? item.sellRate ?? item.mrp ?? 0),
    gst: Number(item.gst ?? item.gstPercentage ?? 12),
    gstPercentage: Number(item.gstPercentage ?? item.gst ?? 12),
    retailerMargin: Number(item.retailerMargin ?? 20),
    sellRate: Number(item.sellRate ?? item.mrp ?? 0),
    saleRateMethod: item.saleRateMethod ?? (toLegacyRateMethod(item.saleRateMethod) || undefined),
    calculateMethod: item.calculateMethod ?? undefined,
    availableQuantity: Number(item.availableQuantity ?? 0),
    minQuantity: Number(item.minQuantity ?? 0),
    maxQuantity: Number(item.maxQuantity ?? 0),
    manufactureDate: item.manufactureDate ?? "",
    expiryDate: item.expiryDate ?? "",
    drugGroup,
    drugGroupId: item.drugGroupId ?? `DG-${slugify(drugGroup) || "drug-group"}`,
    unit,
    unitId: item.unitId ?? `U-${slugify(unit) || "unit"}`,
    categoryId: item.categoryId ?? "",
    hsn,
    hsnId: item.hsnId ?? hsn,
    replacementAllowed: Boolean(item.replacementAllowed ?? item.replacement ?? false),
    discountAllowed: Boolean(item.discountAllowed ?? item.discountAllow ?? false),
    dpcoProduct: Boolean(item.dpcoProduct ?? false),
    replacement: Boolean(item.replacement ?? item.replacementAllowed ?? false),
    discountAllow: Boolean(item.discountAllow ?? item.discountAllowed ?? false),
    batchNumber: item.batchNumber ?? "",
    calculate: item.calculate ?? toLegacyCalculation(item.calculateMethod),
    status: item.status ?? "ACTIVE",
  };
}

const initialForm: ProductForm = {
  productName: "",
  manufacturer: "",
  manufacturerId: "",
  scientificName: "",
  batchNumber: "",
  drugContent: "",
  packingDescription: "",
  description: "",
  mrp: "",
  ptr: "",
  gstPercentage: "",
  retailerMargin: "20",
  sellRate: "",
  saleRateMethod: "",
  calculateMethod: "",
  availableQuantity: "0",
  minQuantity: "0",
  maxQuantity: "0",
  manufactureDate: "",
  expiryDate: "",
  drugGroup: "",
  drugGroupId: "",
  unit: "",
  unitId: "",
  categoryId: "",
  hsn: "",
  hsnId: "",
  replacement: false,
  discountAllow: false,
  dpcoProduct: false,
};

function parseDate(value: string) {
  if (!value) return Number.NaN;
  return new Date(`${value}T00:00:00`).getTime();
}

function getValidationErrors(form: ProductForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.productName.trim()) errors.productName = "Product name is required.";
  if (!form.manufacturer.trim()) errors.manufacturer = "Manufacturer is required.";
  if (!form.batchNumber.trim()) errors.batchNumber = "Batch number is required.";
  if (!form.drugContent.trim()) errors.drugContent = "Drug content is required.";
  if (!form.drugGroup.trim()) errors.drugGroup = "Drug group is required.";
  if (!form.unit.trim()) errors.unit = "Unit is required.";
  if (!form.categoryId.trim()) errors.categoryId = "Category is required.";
  if (!form.hsn.trim()) errors.hsn = "HSN is required.";

  const mrp = Number(form.mrp);
  const ptr = Number(form.ptr);
  const gst = Number(form.gstPercentage);
  const retailerMargin = Number(form.retailerMargin);
  const sellRate = Number(form.sellRate);
  const availableQuantity = Number(form.availableQuantity);
  const minQuantity = Number(form.minQuantity);
  const maxQuantity = Number(form.maxQuantity);

  if (form.mrp !== "" && (Number.isNaN(mrp) || mrp < 0)) {
    errors.mrp = "MRP must be a valid number greater than or equal to 0.";
  }
  if (form.ptr !== "" && (Number.isNaN(ptr) || ptr < 0)) {
    errors.ptr = "PTR must be a valid number greater than or equal to 0.";
  }
  if (form.gstPercentage !== "" && (Number.isNaN(gst) || gst < 0)) {
    errors.gstPercentage = "GST % must be a valid number greater than or equal to 0.";
  }
  if (form.retailerMargin !== "" && (Number.isNaN(retailerMargin) || retailerMargin < 0 || retailerMargin > 100)) {
    errors.retailerMargin = "Retailer margin must be between 0 and 100.";
  }
  if (form.sellRate !== "" && (Number.isNaN(sellRate) || sellRate < 0)) {
    errors.sellRate = "Sell rate must be a valid number greater than or equal to 0.";
  }
  if (form.availableQuantity !== "" && (Number.isNaN(availableQuantity) || availableQuantity < 0)) {
    errors.availableQuantity = "Available quantity must be greater than or equal to 0.";
  }
  if (form.minQuantity !== "" && (Number.isNaN(minQuantity) || minQuantity < 0)) {
    errors.minQuantity = "Min quantity must be greater than or equal to 0.";
  }
  if (form.maxQuantity !== "" && (Number.isNaN(maxQuantity) || maxQuantity < 0)) {
    errors.maxQuantity = "Max quantity must be greater than or equal to 0.";
  }

  if (minQuantity > 0 && maxQuantity > 0 && maxQuantity < minQuantity) {
    errors.maxQuantity = "Max quantity must be greater than or equal to min quantity.";
    errors.minQuantity = "Min quantity must be less than or equal to max quantity.";
  }

  if (form.manufactureDate && form.expiryDate) {
    const manufactureTime = parseDate(form.manufactureDate);
    const expiryTime = parseDate(form.expiryDate);
    if (!Number.isNaN(manufactureTime) && !Number.isNaN(expiryTime) && expiryTime < manufactureTime) {
      errors.expiryDate = "Expiry date cannot be earlier than manufacture date.";
    }
  }

  return errors;
}

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const id = Number(searchParams.get("id"));
    if (!id) {
      setEditingId(null);
      setForm(initialForm);
      return;
    }

    const productList = getProducts();

    const selected = productList.find((item) => Number(item.id) === id);
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
      manufacturerId: normalized.manufacturerId ?? "",
      scientificName: normalized.scientificName ?? "",
      batchNumber: normalized.batchNumber ?? "",
      drugContent: normalized.drugContent,
      packingDescription: normalized.packingDescription ?? "",
      description: normalized.description ?? "",
      mrp: String(normalized.mrp ?? ""),
      ptr: String(normalized.ptr ?? ""),
      gstPercentage: String(normalized.gstPercentage ?? ""),
      retailerMargin: String(normalized.retailerMargin ?? 20),
      sellRate: String(normalized.sellRate ?? ""),
      saleRateMethod: normalized.saleRateMethod ?? "",
      calculateMethod: normalized.calculateMethod ?? "",
      availableQuantity: String(normalized.availableQuantity ?? 0),
      minQuantity: String(normalized.minQuantity ?? 0),
      maxQuantity: String(normalized.maxQuantity ?? 0),
      manufactureDate: normalized.manufactureDate ?? "",
      expiryDate: normalized.expiryDate ?? "",
      drugGroup: normalized.drugGroup,
      drugGroupId: normalized.drugGroupId ?? "",
      unit: normalized.unit,
      unitId: normalized.unitId ?? "",
      categoryId: normalized.categoryId,
      hsn: normalized.hsn,
      hsnId: normalized.hsnId ?? "",
      replacement: Boolean(normalized.replacementAllowed ?? normalized.replacement ?? false),
      discountAllow: Boolean(normalized.discountAllowed ?? normalized.discountAllow ?? false),
      dpcoProduct: Boolean(normalized.dpcoProduct ?? false),
    });
  }, [searchParams]);

  const manufacturerOptions = useMemo(() => {
    const values = getProducts().map((item) => item.manufacturer).filter(Boolean);
    return Array.from(new Set(values));
  }, [searchParams]);

  const drugGroupOptions = useMemo(() => {
    const values = getProducts().map((item) => item.drugGroup).filter(Boolean);
    return Array.from(new Set(values));
  }, [searchParams]);

  const unitOptions = useMemo(() => {
    const values = getProducts().map((item) => item.unit).filter(Boolean);
    return Array.from(new Set(values));
  }, [searchParams]);

  const categoryOptions = useMemo(() => {
    const values = getProducts().map((item) => item.categoryId).filter(Boolean);
    return Array.from(new Set(values));
  }, [searchParams]);

  const hsnOptions = useMemo(() => {
    const values = getProducts().map((item) => item.hsn).filter(Boolean);
    return Array.from(new Set(values));
  }, [searchParams]);

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
      ptr: "",
    }));
    setForm((current) => ({ ...current, ptr: String(calculatedPtr) }));
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = getValidationErrors(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const legacySaleRateMethod = toLegacyRateMethod(form.saleRateMethod);
    const legacyCalculateMethod = toLegacyCalculation(form.calculateMethod);

    const payload: ProductRecord = {
      id: editingId ?? Date.now(),
      productName: form.productName.trim(),
      manufacturer: form.manufacturer.trim(),
      manufacturerId: form.manufacturerId || `MFG-${slugify(form.manufacturer)}`,
      scientificName: form.scientificName.trim(),
      batchNumber: form.batchNumber.trim(),
      drugContent: form.drugContent.trim(),
      packingDescription: form.packingDescription.trim(),
      description: form.description.trim(),
      mrp: Number(form.mrp || 0),
      ptr: Number(form.ptr || 0),
      gst: Number(form.gstPercentage || 0),
      gstPercentage: Number(form.gstPercentage || 0),
      retailerMargin: Number(form.retailerMargin || 20),
      sellRate: Number(form.sellRate || 0),
      saleRateMethod: (form.saleRateMethod || "MRP") as ProductRecord["saleRateMethod"],
      calculateMethod: (form.calculateMethod || "GST_INCLUSIVE") as ProductRecord["calculateMethod"],
      availableQuantity: Number(form.availableQuantity || 0),
      minQuantity: Number(form.minQuantity || 0),
      maxQuantity: Number(form.maxQuantity || 0),
      manufactureDate: form.manufactureDate,
      expiryDate: form.expiryDate,
      drugGroup: form.drugGroup.trim(),
      drugGroupId: form.drugGroupId || `DG-${slugify(form.drugGroup)}`,
      unit: form.unit.trim(),
      unitId: form.unitId || `U-${slugify(form.unit)}`,
      categoryId: form.categoryId.trim(),
      hsn: form.hsn.trim(),
      hsnId: form.hsnId || form.hsn.trim(),
      replacementAllowed: form.replacement,
      discountAllowed: form.discountAllow,
      dpcoProduct: form.dpcoProduct,
      replacement: form.replacement,
      discountAllow: form.discountAllow,
      calculate: legacyCalculateMethod,
      status: "ACTIVE",
    };

    if (editingId) {
      mockService.update("products", editingId, payload);
      window.sessionStorage.setItem("productToast", "Product updated successfully");
    } else {
      mockService.save("products", payload);
      window.sessionStorage.setItem("productToast", "Product created successfully");
    }

    setTimeout(() => {
      router.push("/products");
    }, 600);
  };

  const renderBooleanToggle = (
    label: string,
    value: boolean,
    onToggle: (nextValue: boolean) => void,
  ) => (
    <div className="col-md-4">
      <label className="form-label d-block mb-2">{label}</label>
      <div className="btn-group w-100" role="group" aria-label={label}>
        <button
          type="button"
          className={`btn ${value ? "btn-primary" : "btn-outline-secondary"}`}
          aria-pressed={value}
          onClick={() => onToggle(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`btn ${!value ? "btn-primary" : "btn-outline-secondary"}`}
          aria-pressed={!value}
          onClick={() => onToggle(false)}
        >
          No
        </button>
      </div>
    </div>
  );

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
                  <label htmlFor="scientificName" className="form-label">Scientific Name</label>
                  <input
                    id="scientificName"
                    type="text"
                    className="form-control"
                    placeholder="Enter scientific name"
                    value={form.scientificName}
                    onChange={(event) => handleChange("scientificName", event.target.value)}
                  />
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

                <div className="col-12">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    id="description"
                    className="form-control"
                    rows={3}
                    placeholder="Enter product description"
                    value={form.description}
                    onChange={(event) => handleChange("description", event.target.value)}
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
                <div className="col-xl-2 col-md-4 col-sm-6">
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

                <div className="col-xl-2 col-md-4 col-sm-6">
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

                <div className="col-xl-2 col-md-4 col-sm-6">
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

                <div className="col-xl-2 col-md-4 col-sm-6">
                  <label htmlFor="ptr" className="form-label">PTR</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="ptr"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.ptr ? "is-invalid" : ""}`}
                      placeholder="0.00"
                      value={form.ptr}
                      onChange={(event) => handleChange("ptr", event.target.value)}
                    />
                  </div>
                  {errors.ptr && <div className="invalid-feedback d-block">{errors.ptr}</div>}
                </div>

                <div className="col-xl-2 col-md-4 col-sm-6 d-flex align-items-end">
                  <button type="button" className="btn btn-outline-primary w-100" onClick={handleCalculatePtr}>
                    Calculate PTR
                  </button>
                </div>

                <div className="col-xl-2 col-md-4 col-sm-6">
                  <label htmlFor="sellRate" className="form-label">Sell Rate</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      id="sellRate"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`form-control ${errors.sellRate ? "is-invalid" : ""}`}
                      placeholder="0.00"
                      value={form.sellRate}
                      onChange={(event) => handleChange("sellRate", event.target.value)}
                    />
                  </div>
                  {errors.sellRate && <div className="invalid-feedback d-block">{errors.sellRate}</div>}
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="saleRateMethod" className="form-label">Sale Rate Method</label>
                  <select
                    id="saleRateMethod"
                    className="form-select"
                    value={form.saleRateMethod}
                    onChange={(event) => handleChange("saleRateMethod", event.target.value)}
                  >
                    <option value="">Select method</option>
                    <option value="MRP">MRP</option>
                    <option value="DISCOUNTED">Discounted</option>
                    <option value="COST_PLUS">Cost Plus</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>

                <div className="col-xl-3 col-md-4 col-sm-6">
                  <label htmlFor="calculateMethod" className="form-label">Calculate</label>
                  <select
                    id="calculateMethod"
                    className="form-select"
                    value={form.calculateMethod}
                    onChange={(event) => handleChange("calculateMethod", event.target.value)}
                  >
                    <option value="">Select calculation</option>
                    <option value="GST_INCLUSIVE">GST Inclusive</option>
                    <option value="GST_EXCLUSIVE">GST Exclusive</option>
                    <option value="MARGIN_BASED">Margin Based</option>
                    <option value="FLAT_RATE">Flat Rate</option>
                  </select>
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
                  <label htmlFor="availableQuantity" className="form-label">Available Quantity</label>
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

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="minQuantity" className="form-label">Min Quantity</label>
                  <input
                    id="minQuantity"
                    type="number"
                    min="0"
                    className={`form-control ${errors.minQuantity ? "is-invalid" : ""}`}
                    value={form.minQuantity}
                    onChange={(event) => handleChange("minQuantity", event.target.value)}
                  />
                  {errors.minQuantity && <div className="invalid-feedback d-block">{errors.minQuantity}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="maxQuantity" className="form-label">Max Quantity</label>
                  <input
                    id="maxQuantity"
                    type="number"
                    min="0"
                    className={`form-control ${errors.maxQuantity ? "is-invalid" : ""}`}
                    value={form.maxQuantity}
                    onChange={(event) => handleChange("maxQuantity", event.target.value)}
                  />
                  {errors.maxQuantity && <div className="invalid-feedback d-block">{errors.maxQuantity}</div>}
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
                  <label htmlFor="drugGroup" className="form-label">Drug Group <span className="text-danger">*</span></label>
                  <input
                    id="drugGroup"
                    list="drug-group-options"
                    className={`form-control ${errors.drugGroup ? "is-invalid" : ""}`}
                    placeholder="Select drug group"
                    value={form.drugGroup}
                    onChange={(event) => handleChange("drugGroup", event.target.value)}
                  />
                  <datalist id="drug-group-options">
                    {drugGroupOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  {errors.drugGroup && <div className="invalid-feedback d-block">{errors.drugGroup}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="unit" className="form-label">Unit <span className="text-danger">*</span></label>
                  <input
                    id="unit"
                    list="unit-options"
                    className={`form-control ${errors.unit ? "is-invalid" : ""}`}
                    placeholder="Select unit"
                    value={form.unit}
                    onChange={(event) => handleChange("unit", event.target.value)}
                  />
                  <datalist id="unit-options">
                    {unitOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  {errors.unit && <div className="invalid-feedback d-block">{errors.unit}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="categoryId" className="form-label">Category ID <span className="text-danger">*</span></label>
                  <input
                    id="categoryId"
                    list="category-options"
                    className={`form-control ${errors.categoryId ? "is-invalid" : ""}`}
                    placeholder="Select category"
                    value={form.categoryId}
                    onChange={(event) => handleChange("categoryId", event.target.value)}
                  />
                  <datalist id="category-options">
                    {categoryOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  {errors.categoryId && <div className="invalid-feedback d-block">{errors.categoryId}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="hsn" className="form-label">HSN <span className="text-danger">*</span></label>
                  <input
                    id="hsn"
                    list="hsn-options"
                    className={`form-control ${errors.hsn ? "is-invalid" : ""}`}
                    placeholder="Select HSN"
                    value={form.hsn}
                    onChange={(event) => handleChange("hsn", event.target.value)}
                  />
                  <datalist id="hsn-options">
                    {hsnOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  {errors.hsn && <div className="invalid-feedback d-block">{errors.hsn}</div>}
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="manufactureDate" className="form-label">Manufacture Date</label>
                  <input
                    id="manufactureDate"
                    type="date"
                    className="form-control"
                    value={form.manufactureDate}
                    onChange={(event) => handleChange("manufactureDate", event.target.value)}
                  />
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="expiryDate" className="form-label">Expiry Date</label>
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

          <section className="card border-0 rounded-3 shadow-sm mb-4">
            <div className="card-body p-4 p-lg-5">
              <div className="d-flex align-items-center gap-2 mb-4">
                <span className="d-inline-flex align-items-center justify-content-center rounded-2 bg-success-subtle text-success" style={{ width: 38, height: 38 }}>
                  <i className="bi bi-sliders" aria-hidden="true" />
                </span>
                <h2 className="h4 mb-0">Product Settings</h2>
              </div>

              <div className="row g-4">
                {renderBooleanToggle("Replacement", form.replacement, (nextValue) => handleChange("replacement", nextValue))}
                {renderBooleanToggle("Discount Allow", form.discountAllow, (nextValue) => handleChange("discountAllow", nextValue))}
                {renderBooleanToggle("DPCO Product", form.dpcoProduct, (nextValue) => handleChange("dpcoProduct", nextValue))}
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
