"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mockService } from "@/lib/mock-service";
import { partyService } from "@/lib/party-service";

type StatusFilter = "All" | string;
type DatePreset = "All" | "Today" | "Last 7 Days" | "Last 30 Days" | "This Month" | "Custom Range";
type SortKey = "latest" | "amount-desc" | "amount-asc" | "supplier" | "status";

const statusClasses: Record<string, string> = {
  Delivered: "badge bg-success-subtle text-success",
  Pending: "badge bg-warning-subtle text-warning",
  Shipped: "badge bg-info-subtle text-info",
  Cancelled: "badge bg-danger-subtle text-danger",
};

const STATUS_OPTIONS: StatusFilter[] = ["All", "Draft", "Completed", "Pending", "Received", "Cancelled"];
const PAYMENT_OPTIONS = ["All", "Cash", "UPI", "Card", "Bank", "NEFT"];
const DATE_OPTIONS: DatePreset[] = ["All", "Today", "Last 7 Days", "Last 30 Days", "This Month", "Custom Range"];

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function parseDate(value: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesDateRange(dateValue: string, preset: DatePreset, customFrom: string, customTo: string) {
  if (!dateValue) return true;

  const orderDate = parseDate(dateValue);
  if (!orderDate) return true;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  switch (preset) {
    case "Today":
      return orderDate >= startOfToday && orderDate <= endOfToday;
    case "Last 7 Days": {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return orderDate >= from && orderDate <= endOfToday;
    }
    case "Last 30 Days": {
      const from = new Date();
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return orderDate >= from && orderDate <= endOfToday;
    }
    case "This Month":
      return orderDate >= startOfMonth && orderDate <= endOfMonth;
    case "Custom Range": {
      const from = customFrom ? parseDate(customFrom) : null;
      const to = customTo ? parseDate(customTo) : null;
      if (!from && !to) return true;
      const rangeFrom = from ? new Date(from.getFullYear(), from.getMonth(), from.getDate()) : null;
      const rangeTo = to ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999) : null;
      if (rangeFrom && rangeTo) return orderDate >= rangeFrom && orderDate <= rangeTo;
      if (rangeFrom) return orderDate >= rangeFrom;
      if (rangeTo) return orderDate <= rangeTo;
      return true;
    }
    case "All":
    default:
      return true;
  }
}

export default function OrdersPage() {
  const [globalSearch, setGlobalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [datePreset, setDatePreset] = useState<DatePreset>("All");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("latest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewOrder, setViewOrder] = useState<any | null>(null);
  const [editOrder, setEditOrder] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<StatusFilter>("All");

  const allOrders = useMemo(
    () =>
      mockService.get<any>("purchaseOrders").map((order, index) => {
        const supplier = partyService.list().find((party) => String(party.id) === String(order.supplierId));
        return {
          ...order,
          voucher: order.voucherNumber ?? order.purchaseOrderNumber ?? order.id,
          date: order.orderDate ?? order.date ?? "",
          supplier: supplier?.firmName ?? order.party ?? "-",
          mobile: supplier?.phone ?? order.mobile ?? "-",
          billNo: order.billNumber ?? order.billNo ?? "-",
          items: Array.isArray(order.items) ? order.items.length : Number(order.items || 0),
          amount: order.grandTotal ?? order.amount ?? 0,
          paymentMethod: order.paymentMethod ?? ["UPI", "Cash", "Bank", "Card", "NEFT"][index % 5],
        };
      }),
    [refreshKey],
  );

  const customerOptions = useMemo(
    () => ["All", ...Array.from(new Set(allOrders.map((order) => order.supplier)))],
    [allOrders],
  );

  const summaryCards = useMemo(
    () => [
      { key: "All", label: "All", count: allOrders.length, accent: "primary" },
      { key: "Pending", label: "Pending", count: allOrders.filter((order) => order.status === "Pending").length, accent: "warning" },
      { key: "Shipped", label: "Shipped", count: allOrders.filter((order) => order.status === "Shipped").length, accent: "info" },
      { key: "Delivered", label: "Delivered", count: allOrders.filter((order) => order.status === "Delivered").length, accent: "success" },
      { key: "Cancelled", label: "Cancelled", count: allOrders.filter((order) => order.status === "Cancelled").length, accent: "danger" },
    ],
    [allOrders],
  );

  useEffect(() => {
    setPage(1);
  }, [globalSearch, statusFilter, datePreset, customFrom, customTo, supplierFilter, paymentFilter, minAmount, maxAmount, sortBy, pageSize]);

  const filteredOrders = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();

    const filtered = allOrders.filter((order) => {
      const orderSearchValue = [order.voucher, order.supplier, order.mobile, order.billNo].join(" ").toLowerCase();
      const matchesGlobalSearch = !search || orderSearchValue.includes(search);
      const matchesStatus = statusFilter === "All" || order.status === statusFilter;
      const matchesSupplier = supplierFilter === "All" || order.supplier === supplierFilter;
      const matchesPayment = paymentFilter === "All" || order.paymentMethod === paymentFilter;
      const matchesDate = matchesDateRange(order.date, datePreset, customFrom, customTo);
      const amount = Number(order.amount || 0);
      const matchesMin = minAmount === "" || amount >= Number(minAmount || 0);
      const matchesMax = maxAmount === "" || amount <= Number(maxAmount || Number.MAX_SAFE_INTEGER);

      return matchesGlobalSearch && matchesStatus && matchesSupplier && matchesPayment && matchesDate && matchesMin && matchesMax;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "amount-desc":
          return Number(b.amount) - Number(a.amount);
        case "amount-asc":
          return Number(a.amount) - Number(b.amount);
        case "supplier":
          return String(a.supplier).localeCompare(String(b.supplier)) || String(a.voucher).localeCompare(String(b.voucher));
        case "status":
          return String(a.status).localeCompare(String(b.status)) || String(b.date).localeCompare(String(a.date));
        case "latest":
        default:
          return new Date(String(b.date)).getTime() - new Date(String(a.date)).getTime();
      }
    });

    return filtered;
  }, [allOrders, globalSearch, statusFilter, supplierFilter, paymentFilter, datePreset, customFrom, customTo, minAmount, maxAmount, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const visibleOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page, pageSize]);

  const totals = useMemo(() => {
    const totalAmount = filteredOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalItems = filteredOrders.reduce((sum, item) => sum + Number(item.items || 0), 0);
    return { totalAmount, totalItems };
  }, [filteredOrders]);

  const activeChips = [
    globalSearch ? { key: "search", label: `Search: ${globalSearch}` } : null,
    statusFilter !== "All" ? { key: "status", label: `Status: ${statusFilter}` } : null,
    datePreset !== "All" ? { key: "date", label: `Date: ${datePreset}` } : null,
    supplierFilter !== "All" ? { key: "supplier", label: `Supplier: ${supplierFilter}` } : null,
    paymentFilter !== "All" ? { key: "payment", label: `Payment: ${paymentFilter}` } : null,
    minAmount || maxAmount ? { key: "amount", label: `Amount: ${minAmount || "0"} - ${maxAmount || "∞"}` } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  const clearAllFilters = () => {
    setGlobalSearch("");
    setStatusFilter("All");
    setDatePreset("All");
    setCustomFrom("");
    setCustomTo("");
    setSupplierFilter("All");
    setPaymentFilter("All");
    setMinAmount("");
    setMaxAmount("");
    setSortBy("latest");
    setPage(1);
  };

  const handleDeleteOrder = (order: any) => {
    if (!window.confirm(`Delete purchase order ${order.voucher} for ${order.supplier}?`)) {
      return;
    }

    mockService.remove("purchaseOrders", order.id);
    setRefreshKey((value) => value + 1);
    setPage(1);
  };

  const handleSaveEdit = () => {
    if (!editOrder) return;

    mockService.update("purchaseOrders", editOrder.id, { status: editStatus });
    setEditOrder(null);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <nav aria-label="breadcrumb" className="mb-2">
              <ol className="breadcrumb small mb-0">
                <li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none">Dashboard</Link></li>
                <li className="breadcrumb-item active" aria-current="page">Purchase Order</li>
              </ol>
            </nav>
            <h1 className="h2 mb-1">Purchase Order Details</h1>
            <p className="text-secondary mb-0">Purchase order overview with {allOrders.length} records</p>
          </div>
          <Link href="/orders/new" className="btn btn-primary">
            <i className="bi bi-plus-lg me-2" aria-hidden="true" />New Purchase Order
          </Link>
        </div>

        <div className="row g-3 mb-4">
          {summaryCards.map((card) => (
            <div className="col-md-6 col-xl-3" key={card.key}>
              <button
                type="button"
                className={`card border-0 shadow-sm rounded-4 h-100 text-start w-100 ${statusFilter === card.key || (card.key === "All" && statusFilter === "All") ? "border border-primary-subtle" : ""}`}
                onClick={() => setStatusFilter(card.key as StatusFilter)}
                style={{ background: card.key === "All" ? "#f8f9ff" : undefined }}
              >
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-muted small">{card.label}</div>
                    <div className="h3 mb-0">{card.count}</div>
                  </div>
                  <div className={`rounded-circle bg-${card.accent}-subtle text-${card.accent} d-flex align-items-center justify-content-center`} style={{ width: 48, height: 48 }}>
                    <i className={`bi ${card.key === "All" ? "bi-bag-check" : card.key === "Pending" ? "bi-clock-history" : card.key === "Shipped" ? "bi-truck" : card.key === "Delivered" ? "bi-check-circle" : "bi-x-circle"} fs-5`} aria-hidden="true" />
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        <div className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-3 p-lg-4">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-xl-4">
                <label className="form-label">Global Search</label>
                <div className="input-group">
                  <span className="input-group-text"><i className="bi bi-search" aria-hidden="true" /></span>
                  <input
                    type="text"
                    className="form-control"
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Voucher No, Supplier, Mobile, Bill Number"
                  />
                </div>
              </div>

              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Status</label>
                <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Date Filter</label>
                <select className="form-select" value={datePreset} onChange={(event) => setDatePreset(event.target.value as DatePreset)}>
                  {DATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Supplier</label>
                <input
                  list="supplierList"
                  className="form-control"
                  value={supplierFilter === "All" ? "" : supplierFilter}
                  onChange={(event) => setSupplierFilter(event.target.value || "All")}
                  placeholder="Search supplier"
                />
                <datalist id="supplierList">
                  {customerOptions.filter((option) => option !== "All").map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>

              <div className="col-12 col-md-6 col-xl-2">
                <label className="form-label">Payment</label>
                <select className="form-select" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
                  {PAYMENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 col-xl-2">
                <label className="form-label">Min Amount</label>
                <input type="number" className="form-control" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="0" />
              </div>

              <div className="col-md-4 col-xl-2">
                <label className="form-label">Max Amount</label>
                <input type="number" className="form-control" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="50000" />
              </div>

              <div className="col-md-4 col-xl-2">
                <label className="form-label">Sort By</label>
                <select className="form-select" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
                  <option value="latest">Latest Order</option>
                  <option value="amount-desc">Amount: High to Low</option>
                  <option value="amount-asc">Amount: Low to High</option>
                  <option value="supplier">Supplier</option>
                  <option value="status">Status</option>
                </select>
              </div>

              {datePreset === "Custom Range" && (
                <>
                  <div className="col-md-6 col-xl-2">
                    <label className="form-label">From</label>
                    <input type="date" className="form-control" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
                  </div>
                  <div className="col-md-6 col-xl-2">
                    <label className="form-label">To</label>
                    <input type="date" className="form-control" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
                  </div>
                </>
              )}
            </div>

            {activeChips.length > 0 && (
              <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="btn btn-sm btn-light border"
                    onClick={() => {
                      if (chip.key === "search") setGlobalSearch("");
                      if (chip.key === "status") setStatusFilter("All");
                      if (chip.key === "date") { setDatePreset("All"); setCustomFrom(""); setCustomTo(""); }
                      if (chip.key === "supplier") setSupplierFilter("All");
                      if (chip.key === "payment") setPaymentFilter("All");
                      if (chip.key === "amount") { setMinAmount(""); setMaxAmount(""); }
                    }}
                  >
                    {chip.label} <i className="bi bi-x ms-1" aria-hidden="true" />
                  </button>
                ))}
                <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={clearAllFilters}>Clear All</button>
              </div>
            )}
          </div>
        </div>

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-toolbar p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="text-muted small">Showing</span>
              <select className="form-select form-select-sm" style={{ width: "auto" }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-muted small">records</span>
            </div>
            <span className="muted" aria-live="polite">{filteredOrders.length} records</span>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col">Voucher No</th>
                  <th scope="col">Date</th>
                  <th scope="col">Supplier</th>
                  <th scope="col">Mobile</th>
                  <th scope="col">Bill Number</th>
                  <th scope="col">Payment</th>
                  <th scope="col">Items</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.length > 0 ? (
                  visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="fw-semibold">{order.voucher}</td>
                      <td>{order.date}</td>
                      <td>{order.supplier}</td>
                      <td>{order.mobile}</td>
                      <td>{order.billNo}</td>
                      <td>{order.paymentMethod}</td>
                      <td>{order.items}</td>
                      <td>{formatInr(order.amount)}</td>
                      <td><span className={statusClasses[order.status] || "badge bg-secondary-subtle text-secondary"}>{order.status}</span></td>
                      <td>
                        <div className="d-flex gap-2">
                          <button type="button" className="btn btn-sm btn-light" aria-label={`View ${order.voucher}`} onClick={() => setViewOrder(order)}>
                            <i className="bi bi-eye" aria-hidden="true" />
                          </button>
                          <button type="button" className="btn btn-sm btn-light" aria-label={`Edit ${order.voucher}`} onClick={() => {
                            setEditOrder(order);
                            setEditStatus(order.status as StatusFilter);
                          }}>
                            <i className="bi bi-pencil" aria-hidden="true" />
                          </button>
                          <button type="button" className="btn btn-sm btn-light text-danger" aria-label={`Delete ${order.voucher}`} onClick={() => handleDeleteOrder(order)}>
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-4 text-muted">No purchase orders match the current filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredOrders.length > 0 && (
            <div className="card-footer bg-white border-0 px-3 py-3 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
              <div className="small text-muted">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredOrders.length)} of {filteredOrders.length}
              </div>
              <nav aria-label="Orders pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button type="button" className="page-link" onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page">Previous</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                    <li key={item} className={`page-item ${page === item ? "active" : ""}`}>
                      <button type="button" className="page-link" onClick={() => setPage(item)}>{item}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                    <button type="button" className="page-link" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="Next page">Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {viewOrder && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Order Details</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setViewOrder(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><strong>Voucher No:</strong> {viewOrder.voucher}</div>
                  <div className="col-md-6"><strong>Date:</strong> {viewOrder.date}</div>
                  <div className="col-md-6"><strong>Supplier:</strong> {viewOrder.supplier}</div>
                  <div className="col-md-6"><strong>Mobile:</strong> {viewOrder.mobile}</div>
                  <div className="col-md-6"><strong>Bill Number:</strong> {viewOrder.billNo}</div>
                  <div className="col-md-6"><strong>Payment:</strong> {viewOrder.paymentMethod}</div>
                  <div className="col-md-6"><strong>Items:</strong> {viewOrder.items}</div>
                  <div className="col-md-6"><strong>Amount:</strong> {formatInr(Number(viewOrder.amount || 0))}</div>
                  <div className="col-md-12"><strong>Status:</strong> <span className={statusClasses[viewOrder.status] || "badge bg-secondary-subtle text-secondary"}>{viewOrder.status}</span></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setViewOrder(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title">Edit Order Status</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditOrder(null)} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Order</label>
                  <input className="form-control" value={editOrder.id} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label">Supplier</label>
                  <input className="form-control" value={editOrder.supplier} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={editStatus} onChange={(event) => setEditStatus(event.target.value as StatusFilter)}>
                    {STATUS_OPTIONS.filter((item) => item !== "All").map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setEditOrder(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
