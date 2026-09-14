"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

type QuickFilter = "all" | "low-stock" | "out-of-stock" | "expiring-soon" | "expired";
type SortKey = "productName" | "manufacturer" | "mrp" | "sellRate" | "availableQuantity" | "manufactureDate" | "expiryDate";
type SortDirection = "asc" | "desc";
type StockStatus = "all" | "available" | "low" | "out";
type ExpiryStatus = "all" | "valid" | "expiring-30" | "expiring-90" | "expired";
type YesNoFilter = "all" | "yes" | "no";

type FilterState = {
  manufacturer: string;
  drugGroup: string;
  category: string;
  hsn: string;
  stockStatus: StockStatus;
  expiryStatus: ExpiryStatus;
  replacement: YesNoFilter;
  discountAllow: YesNoFilter;
  dpcoProduct: YesNoFilter;
};

const initialFilters: FilterState = {
  manufacturer: "",
  drugGroup: "",
  category: "",
  hsn: "",
  stockStatus: "all",
  expiryStatus: "all",
  replacement: "all",
  discountAllow: "all",
  dpcoProduct: "all",
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string) {
  if (!dateString) return "—";
  const parsed = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getDaysLeft(dateString: string) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const expiry = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateString: string): "Valid" | "Expiring Soon" | "Expired" {
  const daysLeft = getDaysLeft(dateString);
  if (daysLeft < 0) return "Expired";
  if (daysLeft <= 30) return "Expiring Soon";
  return "Valid";
}

function getStockStatus(product: ProductRecord): "Available" | "Low Stock" | "Out of Stock" {
  if (product.availableQuantity === 0) return "Out of Stock";
  if (product.availableQuantity <= product.minQuantity) return "Low Stock";
  return "Available";
}

function normalizeProduct(item: Partial<ProductRecord>): ProductRecord {
  return {
    id: Number(item.id ?? Date.now()),
    productName: item.productName ?? "Unknown Product",
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

function mergeProducts(): ProductRecord[] {
  const merged = [
    ...(productsData as ProductRecord[]),
    ...mockService.get<ProductRecord>("products"),
  ].map(normalizeProduct);

  const unique = new Map<string, ProductRecord>();

  merged.forEach((product) => {
    const key = `${product.productName.toLowerCase()}|${product.batchNumber.toLowerCase()}|${product.manufacturer.toLowerCase()}`;
    unique.set(key, product);
  });

  return Array.from(unique.values());
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showFilters, setShowFilters] = useState(true);
  const [draftFilters, setDraftFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [sortBy, setSortBy] = useState<SortKey>("productName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewProduct, setViewProduct] = useState<ProductRecord | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);

  async function copyValue(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore copy failures in unsupported environments
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProducts(mergeProducts());
      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, []);

  const summaryCards = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter((product) => product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity).length;
    const outOfStock = products.filter((product) => product.availableQuantity === 0).length;
    const expiringSoon = products.filter((product) => {
      const days = getDaysLeft(product.expiryDate);
      return days > 0 && days <= 30;
    }).length;

    return [
      { title: "Total Products", value: totalProducts },
      { title: "Low Stock", value: lowStock },
      { title: "Out of Stock", value: outOfStock },
      { title: "Expiring Soon", value: expiringSoon },
    ];
  }, [products]);

  const quickFilterCounts = useMemo(() => ({
    all: products.length,
    "low-stock": products.filter((product) => product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity).length,
    "out-of-stock": products.filter((product) => product.availableQuantity === 0).length,
    "expiring-soon": products.filter((product) => {
      const days = getDaysLeft(product.expiryDate);
      return days > 0 && days <= 30;
    }).length,
    expired: products.filter((product) => getDaysLeft(product.expiryDate) < 0).length,
  }), [products]);

  const manufacturers = useMemo(
    () => Array.from(new Set(products.map((product) => product.manufacturer).filter(Boolean))).sort(),
    [products],
  );
  const drugGroups = useMemo(
    () => Array.from(new Set(products.map((product) => product.drugGroup).filter(Boolean))).sort(),
    [products],
  );
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.categoryId).filter(Boolean))).sort(),
    [products],
  );
  const hsnCodes = useMemo(
    () => Array.from(new Set(products.map((product) => product.hsn).filter(Boolean))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const searchText = [
        product.productName,
        product.batchNumber,
        product.scientificName,
        product.manufacturer,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchText.includes(query);

      const matchesQuick = (() => {
        if (quickFilter === "all") return true;
        if (quickFilter === "low-stock") return product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity;
        if (quickFilter === "out-of-stock") return product.availableQuantity === 0;
        if (quickFilter === "expiring-soon") {
          const days = getDaysLeft(product.expiryDate);
          return days > 0 && days <= 30;
        }
        if (quickFilter === "expired") return getDaysLeft(product.expiryDate) < 0;
        return true;
      })();

      const matchesManufacturer = !appliedFilters.manufacturer || product.manufacturer === appliedFilters.manufacturer;
      const matchesDrugGroup = !appliedFilters.drugGroup || product.drugGroup === appliedFilters.drugGroup;
      const matchesCategory = !appliedFilters.category || product.categoryId === appliedFilters.category;
      const matchesHsn = !appliedFilters.hsn || product.hsn === appliedFilters.hsn;

      const matchesStockStatus = (() => {
        if (appliedFilters.stockStatus === "all") return true;
        if (appliedFilters.stockStatus === "available") return product.availableQuantity > product.minQuantity;
        if (appliedFilters.stockStatus === "low") return product.availableQuantity > 0 && product.availableQuantity <= product.minQuantity;
        if (appliedFilters.stockStatus === "out") return product.availableQuantity === 0;
        return true;
      })();

      const matchesExpiryStatus = (() => {
        if (appliedFilters.expiryStatus === "all") return true;
        const days = getDaysLeft(product.expiryDate);
        if (appliedFilters.expiryStatus === "valid") return days > 30;
        if (appliedFilters.expiryStatus === "expiring-30") return days > 0 && days <= 30;
        if (appliedFilters.expiryStatus === "expiring-90") return days > 0 && days <= 90;
        if (appliedFilters.expiryStatus === "expired") return days < 0;
        return true;
      })();

      const matchesReplacement = appliedFilters.replacement === "all" || String(product.replacement).toLowerCase() === appliedFilters.replacement;
      const matchesDiscount = appliedFilters.discountAllow === "all" || String(product.discountAllow).toLowerCase() === appliedFilters.discountAllow;
      const matchesDpco = appliedFilters.dpcoProduct === "all" || String(product.dpcoProduct).toLowerCase() === appliedFilters.dpcoProduct;

      return (
        matchesSearch &&
        matchesQuick &&
        matchesManufacturer &&
        matchesDrugGroup &&
        matchesCategory &&
        matchesHsn &&
        matchesStockStatus &&
        matchesExpiryStatus &&
        matchesReplacement &&
        matchesDiscount &&
        matchesDpco
      );
    });
  }, [products, search, quickFilter, appliedFilters]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];

    list.sort((left, right) => {
      const leftValue = left[sortBy];
      const rightValue = right[sortBy];

      let result = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        result = leftValue - rightValue;
      } else if (typeof leftValue === "string" && typeof rightValue === "string") {
        result = leftValue.localeCompare(rightValue);
      } else {
        result = String(leftValue).localeCompare(String(rightValue));
      }

      return sortDirection === "asc" ? result : -result;
    });

    return list;
  }, [filteredProducts, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, quickFilter, appliedFilters, rowsPerPage, sortBy, sortDirection]);

  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return sortedProducts.slice(start, start + rowsPerPage);
  }, [sortedProducts, safePage, rowsPerPage]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection("asc");
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setQuickFilter("all");
    setPage(1);
  };

  const startIndex = sortedProducts.length === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(safePage * rowsPerPage, sortedProducts.length);

  const paginationNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    const start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);

    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }

    return pages;
  }, [safePage, totalPages]);

  const updateDraft = <K extends keyof FilterState>(field: K, value: FilterState[K]) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  if (loading) {
    return (
      <div className="page py-4">
        <div className="container-fluid px-2 px-lg-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <div className="placeholder-glow">
                <span className="placeholder col-5 rounded mb-2" />
                <span className="placeholder col-7 rounded" />
              </div>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder rounded" style={{ width: 160, height: 38 }} />
            </div>
          </div>

          <div className="row g-3 mb-4">
            {[1, 2, 3, 4].map((card) => (
              <div key={card} className="col-xl-3 col-md-6">
                <div className="card border-0 shadow-sm rounded-4 p-3">
                  <div className="placeholder-glow">
                    <span className="placeholder col-7 rounded mb-2" />
                    <span className="placeholder col-5 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm rounded-4 p-4">
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded mb-3" style={{ height: 48 }} />
              <span className="placeholder col-12 rounded mb-2" style={{ height: 40 }} />
              <span className="placeholder col-12 rounded mb-2" style={{ height: 40 }} />
              <span className="placeholder col-12 rounded" style={{ height: 40 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h2 mb-1">Products</h1>
            <p className="text-secondary mb-0">Medicine catalogue, batches, pricing and inventory</p>
          </div>

          <button type="button" className="btn btn-primary px-3" onClick={() => router.push("/products/new")}>
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />New Product
          </button>
        </div>

        <div className="row g-3 mb-4">
          {summaryCards.map((card) => (
            <div key={card.title} className="col-xl-3 col-md-6">
              <div className="card border-0 shadow-sm rounded-4 h-100">
                <div className="card-body d-flex justify-content-between align-items-center p-3">
                  <div>
                    <div className="text-muted small fw-semibold text-uppercase letter-spacing-1">{card.title}</div>
                    <div className="fs-4 fw-bold mt-2 mb-0">{card.value.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}>
                    <i className="bi bi-box-seam" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3 p-lg-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
              <div className="position-relative flex-grow-1">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary" aria-hidden="true" />
                <input
                  type="text"
                  className="form-control ps-5"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, batch number, scientific name..."
                />
              </div>

              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowFilters((current) => !current)}>
                <i className="bi bi-funnel me-2" aria-hidden="true" />Filters
              </button>
            </div>

            <div className="mt-3 d-flex flex-wrap gap-2">
              {[
                { label: "All Products", value: "all" },
                { label: "Low Stock", value: "low-stock" },
                { label: "Out of Stock", value: "out-of-stock" },
                { label: "Expiring Soon", value: "expiring-soon" },
                { label: "Expired", value: "expired" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={`btn btn-sm d-inline-flex align-items-center gap-2 ${quickFilter === filter.value ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setQuickFilter(filter.value as QuickFilter)}
                >
                  <span>{filter.label}</span>
                  <span className={`badge rounded-pill ${quickFilter === filter.value ? "bg-white text-primary" : "bg-secondary-subtle text-secondary"}`}>
                    {quickFilterCounts[filter.value as keyof typeof quickFilterCounts]}
                  </span>
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="mt-4 border-top pt-4">
                <div className="row g-3">
                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Manufacturer</label>
                    <input
                      list="manufacturer-list"
                      className="form-control"
                      value={draftFilters.manufacturer}
                      onChange={(event) => updateDraft("manufacturer", event.target.value)}
                      placeholder="Select manufacturer"
                    />
                    <datalist id="manufacturer-list">
                      {manufacturers.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Drug Group</label>
                    <input
                      list="drug-group-list"
                      className="form-control"
                      value={draftFilters.drugGroup}
                      onChange={(event) => updateDraft("drugGroup", event.target.value)}
                      placeholder="Select group"
                    />
                    <datalist id="drug-group-list">
                      {drugGroups.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={draftFilters.category}
                      onChange={(event) => updateDraft("category", event.target.value)}
                    >
                      <option value="">All</option>
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">HSN</label>
                    <select
                      className="form-select"
                      value={draftFilters.hsn}
                      onChange={(event) => updateDraft("hsn", event.target.value)}
                    >
                      <option value="">All</option>
                      {hsnCodes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Stock Status</label>
                    <select
                      className="form-select"
                      value={draftFilters.stockStatus}
                      onChange={(event) => updateDraft("stockStatus", event.target.value as StockStatus)}
                    >
                      <option value="all">All</option>
                      <option value="available">Available</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Expiry Status</label>
                    <select
                      className="form-select"
                      value={draftFilters.expiryStatus}
                      onChange={(event) => updateDraft("expiryStatus", event.target.value as ExpiryStatus)}
                    >
                      <option value="all">All</option>
                      <option value="valid">Valid</option>
                      <option value="expiring-30">Expiring ≤ 30 Days</option>
                      <option value="expiring-90">Expiring ≤ 90 Days</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Replacement</label>
                    <select
                      className="form-select"
                      value={draftFilters.replacement}
                      onChange={(event) => updateDraft("replacement", event.target.value as YesNoFilter)}
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">Discount Allow</label>
                    <select
                      className="form-select"
                      value={draftFilters.discountAllow}
                      onChange={(event) => updateDraft("discountAllow", event.target.value as YesNoFilter)}
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label">DPCO Product</label>
                    <select
                      className="form-select"
                      value={draftFilters.dpcoProduct}
                      onChange={(event) => updateDraft("dpcoProduct", event.target.value as YesNoFilter)}
                    >
                      <option value="all">All</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="btn btn-outline-secondary" onClick={handleClearFilters}>
                    Clear Filters
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleApplyFilters}>
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4">
          <div className="card-body p-0">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom px-3 py-3">
              <div className="small text-secondary fw-semibold">
                Showing {sortedProducts.length === 0 ? 0 : startIndex}–{endIndex} of {sortedProducts.length}
              </div>

              <div className="d-flex align-items-center gap-2 ms-auto">
                <label className="small text-secondary mb-0">Rows:</label>
                <select
                  className="form-select form-select-sm w-auto"
                  value={rowsPerPage}
                  onChange={(event) => setRowsPerPage(Number(event.target.value))}
                  style={{ minWidth: 82 }}
                >
                  {[10, 25, 50, 100].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {paginatedProducts.length === 0 ? (
              <div className="text-center py-5 px-3">
                <div className="mb-3">
                  <i className="bi bi-search text-secondary" style={{ fontSize: 40 }} aria-hidden="true" />
                </div>
                <h3 className="h5 mb-2">No products found</h3>
                <p className="text-secondary mb-3">Try changing your search or filters.</p>
                <button type="button" className="btn btn-primary" onClick={handleClearFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      {[
                        ["productName", "Product"],
                        ["manufacturer", "Manufacturer"],
                        ["mrp", "MRP"],
                        ["sellRate", "Sell Rate"],
                        ["availableQuantity", "Stock"],
                        ["expiryDate", "Expiry"],
                        ["drugGroup", "Drug Group"],
                      ].map(([key, label]) => (
                        <th key={key} className="fw-semibold text-secondary small text-uppercase" style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none text-secondary fw-semibold"
                            onClick={() => handleSort(key as SortKey)}
                          >
                            {label}
                            {sortBy === key && (
                              <span className="ms-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                            )}
                          </button>
                        </th>
                      ))}
                      <th className="fw-semibold text-secondary small text-uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      const expiryStatus = getExpiryStatus(product.expiryDate);
                      const stockBadgeClass =
                        stockStatus === "Out of Stock"
                          ? "bg-danger-subtle text-danger"
                          : stockStatus === "Low Stock"
                            ? "bg-warning-subtle text-warning"
                            : "bg-success-subtle text-success";

                      const expiryBadgeClass =
                        expiryStatus === "Expired"
                          ? "bg-danger-subtle text-danger"
                          : expiryStatus === "Expiring Soon"
                            ? "bg-warning-subtle text-warning"
                            : "bg-success-subtle text-success";

                      return (
                        <tr key={product.id}>
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
                                <i className="bi bi-capsule" aria-hidden="true" />
                              </div>
                              <div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-semibold">{product.productName}</span>
                                  <button type="button" className="btn btn-link btn-sm p-0 text-secondary" aria-label={`Copy product name ${product.productName}`} title="Copy product name" onClick={() => copyValue(product.productName, "Product name")}>
                                    <i className="bi bi-copy" aria-hidden="true" />
                                  </button>
                                </div>
                                <small className="text-secondary">{product.scientificName || "—"}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span>{product.manufacturer}</span>
                              <button type="button" className="btn btn-link btn-sm p-0 text-secondary" aria-label={`Copy manufacturer ${product.manufacturer}`} title="Copy manufacturer" onClick={() => copyValue(product.manufacturer, "Manufacturer")}>
                                <i className="bi bi-copy" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                          <td>{money(product.mrp)}</td>
                          <td>{money(product.sellRate)}</td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              <span className="fw-semibold">{product.availableQuantity}</span>
                              <span className={`badge rounded-pill ${stockBadgeClass}`}>{stockStatus}</span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-column align-items-start gap-1">
                              <span>{formatDate(product.expiryDate)}</span>
                              <span className={`badge rounded-pill ${expiryBadgeClass}`}>{expiryStatus}</span>
                            </div>
                          </td>
                          <td>{product.drugGroup}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button type="button" className="btn btn-sm btn-light" onClick={() => setViewProduct(product)} aria-label={`View ${product.productName}`}>
                                <i className="bi bi-eye" aria-hidden="true" />
                              </button>
                              <button type="button" className="btn btn-sm btn-light" onClick={() => router.push(`/products/new?id=${product.id}`)} aria-label={`Edit ${product.productName}`}>
                                <i className="bi bi-pencil" aria-hidden="true" />
                              </button>
                              <button type="button" className="btn btn-sm btn-light text-danger" onClick={() => setDeleteProduct(product)} aria-label={`Delete ${product.productName}`}>
                                <i className="bi bi-trash" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {sortedProducts.length > 0 && (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 px-3 py-3 border-top">
                <div className="small text-secondary">
                  Showing {startIndex}–{endIndex} of {sortedProducts.length}
                </div>

                <div className="d-flex align-items-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={safePage === 1}
                  >
                    Previous
                  </button>

                  {paginationNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`btn btn-sm ${safePage === pageNumber ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={safePage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewProduct && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ background: "rgba(0, 0, 0, 0.45)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">{viewProduct.productName}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setViewProduct(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Scientific Name:</strong> {viewProduct.scientificName || "—"}</div>
                  <div className="col-md-6"><strong>Batch:</strong> {viewProduct.batchNumber}</div>
                  <div className="col-md-6"><strong>Manufacturer:</strong> {viewProduct.manufacturer}</div>
                  <div className="col-md-6"><strong>Drug Group:</strong> {viewProduct.drugGroup}</div>
                  <div className="col-md-6"><strong>MRP:</strong> {money(viewProduct.mrp)}</div>
                  <div className="col-md-6"><strong>Sell Rate:</strong> {money(viewProduct.sellRate)}</div>
                  <div className="col-md-6"><strong>Available:</strong> {viewProduct.availableQuantity}</div>
                  <div className="col-md-6"><strong>Min Qty:</strong> {viewProduct.minQuantity}</div>
                  <div className="col-md-6"><strong>Expiry:</strong> {formatDate(viewProduct.expiryDate)}</div>
                  <div className="col-md-6"><strong>HSN:</strong> {viewProduct.hsn}</div>
                  <div className="col-12"><strong>Description:</strong> {viewProduct.description || "—"}</div>
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setViewProduct(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteProduct && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ background: "rgba(0, 0, 0, 0.45)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title">Delete product</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setDeleteProduct(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">Are you sure you want to delete <strong>{deleteProduct.productName}</strong>?</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteProduct(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setProducts((current) => current.filter((item) => item.id !== deleteProduct.id));
                    setDeleteProduct(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}