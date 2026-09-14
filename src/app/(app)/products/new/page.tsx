"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import productsData from "@/data/products.json";
import { mockService } from "@/lib/mock-service";

type ProductRecord = {
  id: number;
  productName: string;
  description: string;
  scientificName: string;
  batchNumber: string;
  mrp: number;
  sellRate: number;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  replacement: boolean;
  discountAllow: boolean;
  dpcoProduct: boolean;
  availableQuantity: number;
  minQuantity: number;
  maxQuantity: number;
  drugGroup: string;
  unit: string;
  categoryId: string;
  calculate: string;
  saleRateMethod: string;
  hsn: string;
};

type ProductForm = {
  productName: string;
  description: string;
  scientificName: string;
  batchNumber: string;
  mrp: string;
  sellRate: string;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  replacement: boolean;
  discountAllow: boolean;
  dpcoProduct: boolean;
  availableQuantity: string;
  minQuantity: string;
  maxQuantity: string;
  drugGroup: string;
  unit: string;
  categoryId: string;
  calculate: string;
  saleRateMethod: string;
  hsn: string;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

const products = productsData as ProductRecord[];

function normalizeProduct(item: Partial<ProductRecord>): ProductRecord {
  return {
    id: Number(item.id ?? Date.now()),
    productName: item.productName ?? "",
    description: item.description ?? "",
    scientificName: item.scientificName ?? "",
    batchNumber: item.batchNumber ?? "",
    mrp: Number(item.mrp ?? 0),
    sellRate: Number(item.sellRate ?? 0),
    manufacturer: item.manufacturer ?? "",
    manufactureDate: item.manufactureDate ?? "",
    expiryDate: item.expiryDate ?? "",
    drugContent: item.drugContent ?? "",
    packingDescription: item.packingDescription ?? "",
    replacement: Boolean(item.replacement),
    discountAllow: Boolean(item.discountAllow),
    dpcoProduct: Boolean(item.dpcoProduct),
    availableQuantity: Number(item.availableQuantity ?? 0),
    minQuantity: Number(item.minQuantity ?? 0),
    maxQuantity: Number(item.maxQuantity ?? 0),
    drugGroup: item.drugGroup ?? "",
    unit: item.unit ?? "",
    categoryId: item.categoryId ?? "",
    calculate: item.calculate ?? "",
    saleRateMethod: item.saleRateMethod ?? "",
    hsn: item.hsn ?? "",
  };
}

const initialForm: ProductForm = {
  productName: "",
  description: "",
  scientificName: "",
  batchNumber: "",
  mrp: "",
  sellRate: "",
  manufacturer: "",
  manufactureDate: "",
  expiryDate: "",
  drugContent: "",
  packingDescription: "",
  replacement: false,
  discountAllow: false,
  dpcoProduct: false,
  availableQuantity: "0",
  minQuantity: "0",
  maxQuantity: "0",
  drugGroup: "",
  unit: "",
  categoryId: "",
  calculate: "",
  saleRateMethod: "",
  hsn: "",
};

function parseDate(value: string) {
  if (!value) return Number.NaN;
  return new Date(`${value}T00:00:00`).getTime();
}

function getValidationErrors(form: ProductForm): FormErrors {
  const errors: FormErrors = {};

  if (!form.productName.trim()) errors.productName = "Product name is required.";
  if (!form.batchNumber.trim()) errors.batchNumber = "Batch number is required.";
  if (!form.manufacturer.trim()) errors.manufacturer = "Manufacturer is required.";
  if (!form.drugContent.trim()) errors.drugContent = "Drug content is required.";
  if (!form.drugGroup.trim()) errors.drugGroup = "Drug group is required.";
  if (!form.unit.trim()) errors.unit = "Unit is required.";
  if (!form.categoryId.trim()) errors.categoryId = "Category ID is required.";
  if (!form.hsn.trim()) errors.hsn = "HSN is required.";

  const mrp = Number(form.mrp);
  const sellRate = Number(form.sellRate);
  const availableQty = Number(form.availableQuantity);
  const minQty = Number(form.minQuantity);
  const maxQty = Number(form.maxQuantity);

  if (form.mrp !== "" && Number.isNaN(mrp)) errors.mrp = "MRP must be a valid number.";
  if (form.sellRate !== "" && Number.isNaN(sellRate)) errors.sellRate = "Sell rate must be a valid number.";
  if (mrp < 0) errors.mrp = "MRP must be greater than or equal to 0.";
  if (sellRate < 0) errors.sellRate = "Sell rate must be greater than or equal to 0.";
  if (availableQty < 0) errors.availableQuantity = "Available quantity must be greater than or equal to 0.";
  if (minQty < 0) errors.minQuantity = "Min quantity must be greater than or equal to 0.";
  if (maxQty < 0) errors.maxQuantity = "Max quantity must be greater than or equal to 0.";

  if (minQty > 0 && maxQty > 0 && maxQty < minQty) {
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

    const productList = [
      ...(products as ProductRecord[]),
      ...mockService.get<ProductRecord>("products"),
    ];

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
      description: normalized.description,
      scientificName: normalized.scientificName,
      batchNumber: normalized.batchNumber,
      mrp: String(normalized.mrp),
      sellRate: String(normalized.sellRate),
      manufacturer: normalized.manufacturer,
      manufactureDate: normalized.manufactureDate,
      expiryDate: normalized.expiryDate,
      drugContent: normalized.drugContent,
      packingDescription: normalized.packingDescription,
      replacement: normalized.replacement,
      discountAllow: normalized.discountAllow,
      dpcoProduct: normalized.dpcoProduct,
      availableQuantity: String(normalized.availableQuantity),
      minQuantity: String(normalized.minQuantity),
      maxQuantity: String(normalized.maxQuantity),
      drugGroup: normalized.drugGroup,
      unit: normalized.unit,
      categoryId: normalized.categoryId,
      calculate: normalized.calculate,
      saleRateMethod: normalized.saleRateMethod,
      hsn: normalized.hsn,
    });
  }, [searchParams]);

  const manufacturerOptions = useMemo(() => {
    const values = products.map((item) => item.manufacturer).filter(Boolean);
    return Array.from(new Set(values));
  }, []);

  const drugGroupOptions = useMemo(() => {
    const values = products.map((item) => item.drugGroup).filter(Boolean);
    return Array.from(new Set(values));
  }, []);

  const unitOptions = useMemo(() => {
    const values = products.map((item) => item.unit).filter(Boolean);
    return Array.from(new Set(values));
  }, []);

  const categoryOptions = useMemo(() => {
    const values = products.map((item) => item.categoryId).filter(Boolean);
    return Array.from(new Set(values));
  }, []);

  const hsnOptions = useMemo(() => {
    const values = products.map((item) => item.hsn).filter(Boolean);
    return Array.from(new Set(values));
  }, []);

  const handleChange = <K extends keyof ProductForm>(field: K, value: ProductForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setToast(null);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = getValidationErrors(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload = {
      ...form,
      id: editingId ?? Date.now(),
      mrp: Number(form.mrp || 0),
      sellRate: Number(form.sellRate || 0),
      availableQuantity: Number(form.availableQuantity || 0),
      minQuantity: Number(form.minQuantity || 0),
      maxQuantity: Number(form.maxQuantity || 0),
    };

    if (editingId) {
      mockService.update("products", editingId, payload);
      setToast("Product updated successfully");
    } else {
      mockService.save("products", payload);
      setToast("Product created successfully");
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
                    placeholder="Enter drug content"
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
                    placeholder="Enter packing details"
                    value={form.packingDescription}
                    onChange={(event) => handleChange("packingDescription", event.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    id="description"
                    className="form-control"
                    rows={4}
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
                <h2 className="h4 mb-0">Pricing &amp; Inventory</h2>
              </div>

              <div className="row g-3">
                <div className="col-xl-4 col-md-6">
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

                <div className="col-xl-4 col-md-6">
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
                  <label htmlFor="saleRateMethod" className="form-label">Sale Rate Method</label>
                  <select
                    id="saleRateMethod"
                    className="form-select"
                    value={form.saleRateMethod}
                    onChange={(event) => handleChange("saleRateMethod", event.target.value)}
                  >
                    <option value="">Select method</option>
                    <option value="MRP">MRP</option>
                    <option value="Discounted">Discounted</option>
                    <option value="Cost Plus">Cost Plus</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="col-xl-4 col-md-6">
                  <label htmlFor="calculate" className="form-label">Calculate</label>
                  <select
                    id="calculate"
                    className="form-select"
                    value={form.calculate}
                    onChange={(event) => handleChange("calculate", event.target.value)}
                  >
                    <option value="">Select calculation</option>
                    <option value="GST Inclusive">GST Inclusive</option>
                    <option value="GST Exclusive">GST Exclusive</option>
                    <option value="Margin Based">Margin Based</option>
                    <option value="Flat Rate">Flat Rate</option>
                  </select>
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
