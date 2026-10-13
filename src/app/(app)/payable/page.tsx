"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { formatCurrency, PAYMENT_MODES, type PayablePurchase, type PayableStatus } from "@/lib/payable-utils";
import styles from "./PayablePage.module.css";

type DateBy = "Bill Date" | "Due Date" | "Payment Date";
type DatePreset = "Today" | "This Week" | "This Month" | "Last Month" | "Last 3 Months" | "This Financial Year" | "Custom Range";
type QuickStatus = "All" | "Overdue" | "Due Today" | "Due This Week" | "Partially Paid" | "Paid";
type SupplierOption = { id: string; firmName: string };
type SupplierSummary = { supplierId: string; supplierName: string; openingPayable: number; purchaseAmount: number; paidAmount: number; outstanding: number; bills: number };
type PayableSummary = {
  totalPayable?: number; totalBills?: number;
  overdueAmount?: number; overdueBills?: number;
  dueTodayAmount?: number; dueTodayBills?: number;
  dueWeekAmount?: number; dueWeekBills?: number;
  partiallyPaidAmount?: number; partiallyPaidBills?: number;
  paidAmount?: number; paidBills?: number;
};
type PaymentForm = { amount: string; paymentDate: string; paymentMode: string; referenceNumber: string; remarks: string };
type LedgerEntry = { date: string; voucher: string; particular: string; debit: number; credit: number; balance: number };
type LedgerData = { supplier?: { firmName?: string }; openingBalance: number; totalDebit: number; totalCredit: number; closingBalance: number; entries: LedgerEntry[] };

const pageSizes = [5, 10, 20, 50, 100];
const quickStatuses: QuickStatus[] = ["All", "Overdue", "Due Today", "Due This Week", "Partially Paid", "Paid"];
const dateOptions: DatePreset[] = ["Today", "This Week", "This Month", "Last Month", "Last 3 Months", "This Financial Year", "Custom Range"];
const emptySummary: PayableSummary = {};
const emptyPayment: PaymentForm = { amount: "", paymentDate: "", paymentMode: "", referenceNumber: "", remarks: "" };

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateRange(preset: DatePreset, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  const end = new Date(today);
  if (preset === "This Week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end.setDate(start.getDate() + 6);
  } else if (preset === "This Month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  } else if (preset === "Last Month") {
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    end.setDate(0);
  } else if (preset === "Last 3 Months") {
    start.setMonth(start.getMonth() - 3);
  } else if (preset === "This Financial Year") {
    start.setMonth(now.getMonth() >= 3 ? 3 : 3);
    start.setDate(1);
    if (now.getMonth() < 3) start.setFullYear(now.getFullYear() - 1);
  }
  return { from: localIso(start), to: localIso(end) };
}

function displayDate(value?: string) {
  if (!value) return "-";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function dueDateError(billDate?: string, dueDate?: string) {
  return Boolean(billDate && dueDate && dueDate < billDate);
}

function makeRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function exportRows(records: PayablePurchase[]) {
  return records.map((record) => [
    record.billDate ?? record.orderDate ?? "",
    record.voucherNumber ?? record.purchaseOrderNumber ?? record.id,
    record.supplier?.firmName ?? "Unknown Supplier",
    record.billNumber ?? "",
    formatCurrency(record.grandTotal),
    formatCurrency(record.totalPaid),
    record.billDueDate ?? "",
    formatCurrency(record.outstandingAmount),
    record.paymentStatus ?? "Due",
  ]);
}

function statusClass(status?: string) {
  if (status === "Paid") return styles.statusPaid;
  if (status === "Overdue") return styles.statusOverdue;
  if (status === "Partially Paid") return styles.statusPartial;
  if (status === "Due Today") return styles.statusToday;
  return styles.statusDue;
}

export default function PayablePage() {
  const initialRange = useMemo(() => dateRange("This Financial Year"), []);
  const [records, setRecords] = useState<PayablePurchase[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);
  const [summary, setSummary] = useState<PayableSummary>(emptySummary);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [supplierId, setSupplierId] = useState("All");
  const [dateBy, setDateBy] = useState<DateBy>("Bill Date");
  const [datePreset, setDatePreset] = useState<DatePreset>("This Financial Year");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [quickStatus, setQuickStatus] = useState<QuickStatus>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewRecord, setViewRecord] = useState<PayablePurchase | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PayablePurchase | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPayment);
  const [paymentRequestId, setPaymentRequestId] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [printRows, setPrintRows] = useState<PayablePurchase[]>([]);
  const [printTitle, setPrintTitle] = useState("All Suppliers");
  const [printPeriod, setPrintPeriod] = useState("");
  const [businessName, setBusinessName] = useState("MediStore");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError("");
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), dateBy, status: quickStatus });
      if (debouncedSearch) query.set("search", debouncedSearch);
      if (supplierId !== "All") query.set("supplierId", supplierId);
      if (fromDate) query.set("from", fromDate);
      if (toDate) query.set("to", toDate);
      try {
        const response = await fetch(`/api/payable?${query.toString()}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Unable to load payables.");
        setRecords(Array.isArray(payload.records) ? payload.records : []);
        setSuppliers(Array.isArray(payload.suppliers) ? payload.suppliers : []);
        setSummary(payload.summary ?? {});
        setSupplierSummary(Array.isArray(payload.supplierSummary) ? payload.supplierSummary : []);
        setTotalRecords(Number(payload.totalRecords ?? 0));
      } catch (exception) {
        if (exception instanceof Error && exception.name === "AbortError") return;
        setError(exception instanceof Error ? exception.message : "Unable to load payable records.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [page, pageSize, dateBy, quickStatus, debouncedSearch, supplierId, fromDate, toDate]);

  useEffect(() => {
    void fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.user?.businessName) setBusinessName(payload.user.businessName); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.body.classList.add("payable-page-active");
    return () => document.body.classList.remove("payable-page-active");
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const showingFrom = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, totalRecords);

  function updatePreset(preset: DatePreset) {
    setDatePreset(preset);
    if (preset !== "Custom Range") {
      const range = dateRange(preset);
      setFromDate(range.from);
      setToDate(range.to);
    }
    setPage(1);
  }

  function resetPage() { setPage(1); }

  const statCards = [
    { key: "totalPayable", label: "Total Payable", amount: summary.totalPayable, count: summary.totalBills, icon: "bi-wallet2", tone: "teal" },
    { key: "overdueAmount", label: "Overdue", amount: summary.overdueAmount, count: summary.overdueBills, icon: "bi-exclamation-circle", tone: "red" },
    { key: "dueTodayAmount", label: "Due Today", amount: summary.dueTodayAmount, count: summary.dueTodayBills, icon: "bi-calendar-event", tone: "amber" },
    { key: "dueWeekAmount", label: "Due This Week", amount: summary.dueWeekAmount, count: summary.dueWeekBills, icon: "bi-calendar-week", tone: "blue" },
    { key: "partiallyPaidAmount", label: "Partially Paid", amount: summary.partiallyPaidAmount, count: summary.partiallyPaidBills, icon: "bi-hourglass-split", tone: "violet" },
    { key: "paidAmount", label: "Paid", amount: summary.paidAmount, count: summary.paidBills, icon: "bi-check-circle", tone: "green" },
  ];

  async function fetchAllFilteredRecords() {
    const all: PayablePurchase[] = [];
    let currentPage = 1;
    let total = totalRecords;
    do {
      const query = new URLSearchParams({ page: String(currentPage), pageSize: "100", dateBy, status: quickStatus });
      if (debouncedSearch) query.set("search", debouncedSearch);
      if (supplierId !== "All") query.set("supplierId", supplierId);
      if (fromDate) query.set("from", fromDate);
      if (toDate) query.set("to", toDate);
      const response = await fetch(`/api/payable?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load filtered payable records.");
      all.push(...(payload.records ?? []));
      total = Number(payload.totalRecords ?? total);
      currentPage += 1;
    } while (all.length < total);
    return all;
  }

  async function exportExcel() {
    try {
      const all = await fetchAllFilteredRecords();
      const { utils, writeFileXLSX } = await import("xlsx");
      const headings = ["Date", "Voucher Number", "Supplier", "Bill Number", "Bill Amount", "Paid Amount", "Due Date", "Outstanding Amount", "Status"];
      const worksheet = utils.aoa_to_sheet([headings, ...exportRows(all)]);
      worksheet["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }];
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Payable");
      writeFileXLSX(workbook, `payable-${localIso(new Date())}.xlsx`);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to export Excel."); }
  }

  async function exportCsv() {
    try {
      const all = await fetchAllFilteredRecords();
      const headings = ["Date", "Voucher Number", "Supplier", "Bill Number", "Bill Amount", "Paid Amount", "Due Date", "Outstanding Amount", "Status"];
      const csv = [headings, ...exportRows(all)].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `payable-${localIso(new Date())}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to export CSV."); }
  }

  async function downloadPdf(rows?: PayablePurchase[]) {
    try {
      const filtered = rows ?? await fetchAllFilteredRecords();
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const headingSupplier = supplierId === "All" ? "All Suppliers" : suppliers.find((supplier) => supplier.id === supplierId)?.firmName ?? "Selected Supplier";
      doc.setFontSize(18); doc.text(businessName, 14, 16);
      doc.setFontSize(12); doc.text("PAYABLE STATEMENT", 14, 23);
      doc.setFontSize(9); doc.text(`Period: ${displayDate(fromDate)} to ${displayDate(toDate)}`, 14, 30); doc.text(`Supplier: ${headingSupplier}`, 14, 35);
      autoTable(doc, { startY: 42, head: [["Date", "Voucher", "Supplier", "Bill No.", "Bill Amount", "Paid", "Due Date", "Outstanding", "Status"]], body: filtered.map((record) => [displayDate(record.billDate ?? record.orderDate), String(record.voucherNumber ?? record.purchaseOrderNumber ?? record.id), record.supplier?.firmName ?? "Unknown Supplier", record.billNumber ?? "-", formatCurrency(record.grandTotal), formatCurrency(record.totalPaid), displayDate(record.billDueDate), formatCurrency(record.outstandingAmount), record.paymentStatus ?? "Due"]), theme: "grid", styles: { fontSize: 8, cellPadding: 2.4 }, headStyles: { fillColor: [31, 83, 72] }, showHead: "everyPage", rowPageBreak: "avoid" });
      const finalY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 45;
      autoTable(doc, { startY: finalY + 5, body: [["Total Bills", String(filtered.length), "Total Purchase", formatCurrency(filtered.reduce((sum, row) => sum + Number(row.grandTotal ?? 0), 0)), "Total Paid", formatCurrency(filtered.reduce((sum, row) => sum + Number(row.totalPaid ?? 0), 0)), "Total Outstanding", formatCurrency(filtered.reduce((sum, row) => sum + Number(row.outstandingAmount ?? 0), 0))]], theme: "grid", styles: { fontSize: 8, cellPadding: 2.5, fontStyle: "bold" } });
      doc.save(`payable-statement-${localIso(new Date())}.pdf`);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to generate PDF."); }
  }

  async function printStatement() {
    try {
      const all = await fetchAllFilteredRecords();
      setPrintRows(all);
      setPrintTitle(supplierId === "All" ? "All Suppliers" : suppliers.find((supplier) => supplier.id === supplierId)?.firmName ?? "Selected Supplier");
      setPrintPeriod(`${displayDate(fromDate)} to ${displayDate(toDate)}`);
      window.setTimeout(() => window.print(), 150);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to prepare statement."); }
  }

  function openPayment(record: PayablePurchase) {
    setPaymentRecord(record);
    setPaymentForm({ ...emptyPayment, paymentDate: localIso(new Date()) });
    setPaymentRequestId(makeRequestId());
    setPaymentError("");
  }

  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentRecord) return;
    const amount = Number(paymentForm.amount);
    const outstanding = Number(paymentRecord.outstandingAmount ?? 0);
    const today = localIso(new Date());
    if (!Number.isFinite(amount) || amount <= 0) { setPaymentError("Payment Amount must be greater than zero."); return; }
    if (amount > outstanding) { setPaymentError("Payment Amount cannot exceed the outstanding amount."); return; }
    if (!paymentForm.paymentDate) { setPaymentError("Payment Date is required."); return; }
    if (paymentForm.paymentDate > today) { setPaymentError("Payment Date cannot be in the future."); return; }
    if (!paymentForm.paymentMode) { setPaymentError("Payment Mode is required."); return; }
    if (dueDateError(paymentRecord.billDate, paymentRecord.billDueDate)) { setPaymentError("Bill Due Date cannot be before Bill Date. Correct the purchase entry first."); return; }

    setPaymentSaving(true);
    setPaymentError("");
    try {
      const response = await fetch(`/api/payable/${encodeURIComponent(paymentRecord.id)}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: paymentRequestId, ...paymentForm, amount }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to save payment.");
      setPaymentRecord(null);
      setNotice("Payment saved successfully.");
      setPage(1);
    } catch (exception) { setPaymentError(exception instanceof Error ? exception.message : "Unable to save payment."); }
    finally { setPaymentSaving(false); }
  }

  async function openLedger(record: PayablePurchase) {
    if (!record.supplierId) { setError("This purchase entry has no supplier linked to its ID."); return; }
    setLedgerLoading(true);
    setLedger(null);
    try {
      const response = await fetch(`/api/payable/supplier/${encodeURIComponent(record.supplierId)}/ledger`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to load supplier ledger.");
      setLedger(payload);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to load supplier ledger."); }
    finally { setLedgerLoading(false); }
  }

  const filterChange = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setter(event.target.value); setPage(1); };

  return (
    <div className={`page ${styles.page}`}>
      <PageHeader title="Payable" subtitle="Manage supplier outstanding payments and purchase bills" />
      {error && <div className="alert alert-danger alert-dismissible fade show" role="alert">{error}<button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setError("")} /></div>}
      {notice && <div className="alert alert-success alert-dismissible fade show" role="status">{notice}<button type="button" className="btn-close" aria-label="Dismiss" onClick={() => setNotice("")} /></div>}

      <div className="d-flex flex-wrap justify-content-end gap-2 mb-3 no-print">
        <button className="btn btn-outline-secondary" type="button" disabled={loading} onClick={() => void printStatement()}><i className="bi bi-printer me-2" />Print Statement</button>
        <button className="btn btn-outline-success" type="button" disabled={loading} onClick={() => void exportExcel()}><i className="bi bi-file-earmark-excel me-2" />Export Excel</button>
        <button className="btn btn-outline-secondary" type="button" disabled={loading} onClick={() => void exportCsv()}><i className="bi bi-filetype-csv me-2" />Export CSV</button>
        <button className="btn btn-outline-danger" type="button" disabled={loading} onClick={() => void downloadPdf()}><i className="bi bi-file-earmark-pdf me-2" />Download PDF</button>
      </div>

      <div className="row g-3 mb-4">
        {statCards.map((card) => <div className="col-12 col-sm-6 col-xl-4 col-xxl-2" key={card.key}><button type="button" className={`${styles.statCard} ${styles[`tone_${card.tone}`]}`} disabled={loading} onClick={() => { setQuickStatus(card.key === "overdueAmount" ? "Overdue" : card.key === "dueTodayAmount" ? "Due Today" : card.key === "dueWeekAmount" ? "Due This Week" : card.key === "partiallyPaidAmount" ? "Partially Paid" : card.key === "paidAmount" ? "Paid" : "All"); setPage(1); }}><span className={styles.statIcon}><i className={`bi ${card.icon}`} /></span><span className={styles.statLabel}>{card.label}</span><strong>{formatCurrency(Number(card.amount ?? 0))}</strong><small>{Number(card.count ?? 0)} bills</small></button></div>)}
      </div>

      <section className={`card border-0 shadow-sm mb-3 ${styles.filterCard}`}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-6 col-xl-3"><label className="form-label small" htmlFor="payable-search">Search</label><div className="input-group"><span className="input-group-text"><i className="bi bi-search" /></span><input id="payable-search" className="form-control" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Supplier, bill, voucher, LR, PO ID" /></div></div>
            <div className="col-12 col-sm-6 col-xl-2"><label className="form-label small" htmlFor="payable-supplier">Supplier</label><select id="payable-supplier" className="form-select" value={supplierId} onChange={filterChange(setSupplierId)}><option value="All">All Suppliers</option>{suppliers.map((supplier) => <option value={supplier.id} key={supplier.id}>{supplier.firmName}</option>)}</select></div>
            <div className="col-6 col-sm-3 col-xl-2"><label className="form-label small" htmlFor="payable-date-by">Date By</label><select id="payable-date-by" className="form-select" value={dateBy} onChange={(event) => { setDateBy(event.target.value as DateBy); setPage(1); }}><option>Bill Date</option><option>Due Date</option><option>Payment Date</option></select></div>
            <div className="col-6 col-sm-3 col-xl-2"><label className="form-label small" htmlFor="payable-preset">Date Range</label><select id="payable-preset" className="form-select" value={datePreset} onChange={(event) => updatePreset(event.target.value as DatePreset)}>{dateOptions.map((option) => <option key={option}>{option}</option>)}</select></div>
            <div className="col-6 col-sm-3 col-xl-1"><label className="form-label small" htmlFor="payable-from">From</label><input id="payable-from" type="date" className="form-control" value={fromDate} onChange={(event) => { setDatePreset("Custom Range"); setFromDate(event.target.value); setPage(1); }} /></div>
            <div className="col-6 col-sm-3 col-xl-1"><label className="form-label small" htmlFor="payable-to">To</label><input id="payable-to" type="date" className="form-control" value={toDate} onChange={(event) => { setDatePreset("Custom Range"); setToDate(event.target.value); setPage(1); }} /></div>
            <div className="col-12 col-xl-1"><label className="form-label small" htmlFor="payable-page-size">Rows</label><select id="payable-page-size" className="form-select" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{pageSizes.map((size) => <option value={size} key={size}>{size}</option>)}</select></div>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3" role="tablist" aria-label="Payable status filters">{quickStatuses.map((status) => <button key={status} type="button" role="tab" aria-selected={quickStatus === status} className={`btn btn-sm ${quickStatus === status ? "btn-success" : "btn-outline-secondary"}`} onClick={() => { setQuickStatus(status); setPage(1); }}>{status}</button>)}</div>
        </div>
      </section>

      <section className={`card border-0 shadow-sm mb-4 ${styles.tableCard}`}>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-bottom"><div><h2 className="h6 mb-0">Purchase Bills</h2><span className="small text-secondary" aria-live="polite">{totalRecords} records</span></div><span className="small text-secondary">{dateBy}: {displayDate(fromDate)} – {displayDate(toDate)}</span></div>
        {loading && <div className="p-4 text-center" role="status"><span className="spinner-border spinner-border-sm text-success me-2" />Loading payable records…</div>}
        {!loading && !error && totalRecords === 0 && <div className="p-5 text-center text-secondary"><i className="bi bi-receipt-cutoff fs-2 d-block mb-2" /><strong>No payable records found</strong><div className="small mt-1">Try changing the date, supplier or search filters.</div></div>}
        {!loading && totalRecords > 0 && <>
          <div className="table-responsive"><table className={`table table-hover align-middle mb-0 ${styles.payableTable}`}><thead><tr><th>Date</th><th>Voucher</th><th>Supplier</th><th>Bill No.</th><th className="text-end">Bill Amount</th><th className="text-end">Paid</th><th>Due Date</th><th className="text-end">Outstanding</th><th>Status</th><th className="no-print">Action</th></tr></thead><tbody>
            {records.map((record) => <tr key={record.id}><td>{displayDate(record.billDate ?? record.orderDate)}</td><td className="text-center">{record.voucherNumber ?? record.purchaseOrderNumber ?? record.id}</td><td className="fw-semibold">{record.supplier?.firmName ?? "Unknown Supplier"}</td><td className="text-center">{record.billNumber || "-"}</td><td className="text-end">{formatCurrency(record.grandTotal)}</td><td className="text-end">{formatCurrency(record.totalPaid)}</td><td>{displayDate(record.billDueDate)}</td><td className={`text-end fw-bold ${Number(record.outstandingAmount) > 0 ? styles.outstanding : ""}`}>{formatCurrency(record.outstandingAmount)}</td><td><span className={`${styles.statusBadge} ${statusClass(record.paymentStatus)}`}>{record.paymentStatus ?? "Due"}</span></td><td className="no-print"><div className="d-flex gap-1"><button type="button" className="btn btn-sm btn-light" title="View purchase entry" aria-label="View purchase entry" disabled={loading} onClick={() => setViewRecord(record)}><i className="bi bi-eye" /></button><button type="button" className="btn btn-sm btn-light" title="Record payment" aria-label="Record payment" disabled={loading || Number(record.outstandingAmount) <= 0 || record.paymentStatus === "Paid"} onClick={() => openPayment(record)}><i className="bi bi-cash-coin" /></button><button type="button" className="btn btn-sm btn-light" title="Print bill" aria-label="Print bill" disabled={loading} onClick={() => { setPrintRows([record]); setPrintTitle(record.supplier?.firmName ?? "Supplier"); setPrintPeriod(`${displayDate(record.billDate ?? record.orderDate)} – ${displayDate(record.billDueDate)}`); window.setTimeout(() => window.print(), 120); }}><i className="bi bi-printer" /></button><button type="button" className="btn btn-sm btn-light" title="Supplier ledger" aria-label="Supplier ledger" disabled={loading} onClick={() => void openLedger(record)}><i className="bi bi-journal-text" /></button></div></td></tr>)}
          </tbody></table></div>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top no-print"><span className="small text-secondary">Showing {showingFrom} to {showingTo} of {totalRecords} records</span><nav aria-label="Payable pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${page <= 1 ? "disabled" : ""}`}><button className="page-link" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).slice(Math.max(0, page - 3), page + 2).map((number) => <li className={`page-item ${page === number ? "active" : ""}`} key={number}><button className="page-link" onClick={() => setPage(number)}>{number}</button></li>)}<li className={`page-item ${page >= totalPages ? "disabled" : ""}`}><button className="page-link" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></li></ul></nav></div>
        </>}
      </section>

      <section className={`card border-0 shadow-sm ${styles.tableCard}`}><div className="p-3 border-bottom"><h2 className="h6 mb-0">Supplier-wise Payable</h2><span className="small text-secondary">Opening payable + purchase bills − payments</span></div><div className="table-responsive"><table className={`table table-hover align-middle mb-0 ${styles.payableTable}`}><thead><tr><th>Supplier</th><th className="text-end">Opening Payable</th><th className="text-end">Purchase Amount</th><th className="text-end">Paid Amount</th><th className="text-end">Outstanding</th><th className="text-end">Bills</th></tr></thead><tbody>{supplierSummary.map((row) => <tr key={row.supplierId}><td><button type="button" className="btn btn-link p-0 text-decoration-none fw-semibold" onClick={() => { setSupplierId(row.supplierId); setPage(1); }}>{row.supplierName}</button></td><td className="text-end">{formatCurrency(row.openingPayable)}</td><td className="text-end">{formatCurrency(row.purchaseAmount)}</td><td className="text-end">{formatCurrency(row.paidAmount)}</td><td className="text-end fw-bold">{formatCurrency(row.outstanding)}</td><td className="text-end">{row.bills}</td></tr>)}{!supplierSummary.length && <tr><td colSpan={6} className="text-center text-secondary py-4">No supplier balances in this filter.</td></tr>}</tbody></table></div></section>

      {viewRecord && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setViewRecord(null); }}><section className={`card shadow-lg ${styles.dialog}`} role="dialog" aria-modal="true" aria-labelledby="payable-view-title"><div className="d-flex justify-content-between align-items-center mb-3"><div><div className={styles.eyebrow}>Purchase Entry</div><h2 id="payable-view-title" className="h5 mb-0">Bill {viewRecord.billNumber || "-"}</h2></div><button className="btn-close" aria-label="Close" onClick={() => setViewRecord(null)} /></div><dl className="row small mb-3"><dt className="col-5">Supplier</dt><dd className="col-7">{viewRecord.supplier?.firmName ?? "Unknown Supplier"}</dd><dt className="col-5">Voucher</dt><dd className="col-7">{viewRecord.voucherNumber ?? viewRecord.id}</dd><dt className="col-5">Bill Date</dt><dd className="col-7">{displayDate(viewRecord.billDate)}</dd><dt className="col-5">Due Date</dt><dd className="col-7">{displayDate(viewRecord.billDueDate)}</dd><dt className="col-5">Bill Amount</dt><dd className="col-7">{formatCurrency(viewRecord.grandTotal)}</dd><dt className="col-5">Paid</dt><dd className="col-7">{formatCurrency(viewRecord.totalPaid)}</dd><dt className="col-5">Outstanding</dt><dd className="col-7 fw-bold">{formatCurrency(viewRecord.outstandingAmount)}</dd></dl><h3 className="h6">Purchase Items</h3><div className="table-responsive mb-3"><table className="table table-sm"><thead><tr><th>Product</th><th>Batch</th><th className="text-end">Qty</th><th className="text-end">Free</th><th className="text-end">Rate</th><th className="text-end">Amount</th></tr></thead><tbody>{(viewRecord.items ?? []).map((item, index) => <tr key={`${item.productId ?? item.productName}-${index}`}><td>{item.productName ?? "-"}<div className="small text-secondary">{item.manufacturer ?? ""}</div></td><td>{item.batchNumber ?? "-"}</td><td className="text-end">{item.quantity ?? 0}</td><td className="text-end">{item.freeQuantity ?? 0}</td><td className="text-end">{formatCurrency(item.sellRate)}</td><td className="text-end">{formatCurrency(item.amount)}</td></tr>)}{!viewRecord.items?.length && <tr><td colSpan={6} className="text-secondary text-center">No product details on this entry.</td></tr>}</tbody></table></div><h3 className="h6">Payment History</h3><div className="table-responsive"><table className="table table-sm"><thead><tr><th>Date</th><th>Mode</th><th>Reference</th><th className="text-end">Amount</th></tr></thead><tbody>{(viewRecord.payments ?? []).map((payment, index) => <tr key={payment.paymentId ?? index}><td>{displayDate(payment.paymentDate)}</td><td>{payment.paymentMode}</td><td>{payment.referenceNumber || "-"}</td><td className="text-end">{formatCurrency(payment.amount)}</td></tr>)}{!viewRecord.payments?.length && <tr><td colSpan={4} className="text-secondary text-center">No payments recorded.</td></tr>}</tbody></table></div></section></div>}

      {paymentRecord && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !paymentSaving) setPaymentRecord(null); }}><section className={`card shadow-lg ${styles.dialog}`} role="dialog" aria-modal="true" aria-labelledby="payment-title"><div className="d-flex justify-content-between align-items-start mb-3"><div><div className={styles.eyebrow}>Supplier payment</div><h2 id="payment-title" className="h5 mb-0">Record Payment</h2></div><button className="btn-close" aria-label="Close" disabled={paymentSaving} onClick={() => setPaymentRecord(null)} /></div>{paymentError && <div className="alert alert-danger py-2" role="alert">{paymentError}</div>}<form onSubmit={(event) => void savePayment(event)}><div className="row g-3 mb-3"><div className="col-12"><label className="form-label">Supplier</label><input className="form-control" value={paymentRecord.supplier?.firmName ?? "Unknown Supplier"} readOnly /></div><div className="col-6"><label className="form-label">Bill Number</label><input className="form-control" value={paymentRecord.billNumber ?? "-"} readOnly /></div><div className="col-6"><label className="form-label">Bill Amount</label><input className="form-control text-end" value={formatCurrency(paymentRecord.grandTotal)} readOnly /></div><div className="col-6"><label className="form-label">Already Paid</label><input className="form-control text-end" value={formatCurrency(paymentRecord.totalPaid)} readOnly /></div><div className="col-6"><label className="form-label">Outstanding Amount</label><input className="form-control text-end fw-bold" value={formatCurrency(paymentRecord.outstandingAmount)} readOnly /></div><div className="col-12 col-sm-6"><label className="form-label" htmlFor="payment-amount">Payment Amount *</label><input id="payment-amount" type="number" min="0.01" step="0.01" required max={paymentRecord.outstandingAmount} className="form-control" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></div><div className="col-12 col-sm-6"><label className="form-label" htmlFor="payment-date">Payment Date *</label><input id="payment-date" type="date" required max={localIso(new Date())} className="form-control" value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} /></div><div className="col-12 col-sm-6"><label className="form-label" htmlFor="payment-mode">Payment Mode *</label><select id="payment-mode" required className="form-select" value={paymentForm.paymentMode} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentMode: event.target.value }))}><option value="">Select mode</option>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></div><div className="col-12 col-sm-6"><label className="form-label" htmlFor="payment-reference">Reference Number</label><input id="payment-reference" className="form-control" maxLength={100} value={paymentForm.referenceNumber} onChange={(event) => setPaymentForm((current) => ({ ...current, referenceNumber: event.target.value }))} /></div><div className="col-12"><label className="form-label" htmlFor="payment-remarks">Remarks</label><textarea id="payment-remarks" className="form-control" rows={2} maxLength={500} value={paymentForm.remarks} onChange={(event) => setPaymentForm((current) => ({ ...current, remarks: event.target.value }))} /></div></div><div className="d-flex justify-content-end gap-2"><button type="button" className="btn btn-outline-secondary" disabled={paymentSaving} onClick={() => setPaymentRecord(null)}>Cancel</button><button className="btn btn-success" type="submit" disabled={paymentSaving}>{paymentSaving ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : "Save Payment"}</button></div></form></section></div>}

      {ledgerLoading && <div className={styles.modalBackdrop}><section className={`card ${styles.dialog} p-4 text-center`}><span className="spinner-border text-success mx-auto" /><span className="mt-2">Loading supplier ledger…</span></section></div>}
      {ledger && <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setLedger(null); }}><section className={`card shadow-lg ${styles.dialog} ${styles.ledgerDialog}`} role="dialog" aria-modal="true" aria-labelledby="ledger-title"><div className="d-flex justify-content-between align-items-start mb-3"><div><div className={styles.eyebrow}>Supplier ledger</div><h2 id="ledger-title" className="h5 mb-0">{ledger.supplier?.firmName ?? "Supplier"}</h2></div><button className="btn-close" aria-label="Close" onClick={() => setLedger(null)} /></div><div className="row g-2 mb-3"><div className="col-4"><div className={styles.ledgerStat}><small>Opening Balance</small><strong>{formatCurrency(ledger.openingBalance)}</strong></div></div><div className="col-4"><div className={styles.ledgerStat}><small>Total Debit</small><strong>{formatCurrency(ledger.totalDebit)}</strong></div></div><div className="col-4"><div className={styles.ledgerStat}><small>Total Credit</small><strong>{formatCurrency(ledger.totalCredit)}</strong></div></div></div><div className="table-responsive"><table className="table table-sm table-hover"><thead><tr><th>Date</th><th>Voucher</th><th>Particular</th><th className="text-end">Debit</th><th className="text-end">Credit</th><th className="text-end">Balance</th></tr></thead><tbody>{ledger.entries.map((entry, index) => <tr key={`${entry.voucher}-${index}`}><td>{entry.date ? displayDate(entry.date) : "Opening"}</td><td>{entry.voucher}</td><td>{entry.particular}</td><td className="text-end">{entry.debit ? formatCurrency(entry.debit) : "-"}</td><td className="text-end">{entry.credit ? formatCurrency(entry.credit) : "-"}</td><td className="text-end fw-bold">{formatCurrency(entry.balance)}</td></tr>)}</tbody></table></div><div className="d-flex justify-content-between border-top pt-3 fw-bold"><span>Closing Balance</span><span>{formatCurrency(ledger.closingBalance)}</span></div></section></div>}

      <section id="payable-print-root" className={styles.printStatement} aria-hidden="true"><header><h1>{businessName}</h1><h2>PAYABLE STATEMENT</h2><p>Period: {printPeriod}</p><p>Supplier: {printTitle}</p></header><table><thead><tr><th>Date</th><th>Voucher</th><th>Supplier</th><th>Bill No.</th><th>Bill Amount</th><th>Paid</th><th>Due Date</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{printRows.map((record) => <tr key={record.id}><td>{displayDate(record.billDate ?? record.orderDate)}</td><td>{record.voucherNumber ?? record.id}</td><td>{record.supplier?.firmName ?? "Unknown Supplier"}</td><td>{record.billNumber ?? "-"}</td><td>{formatCurrency(record.grandTotal)}</td><td>{formatCurrency(record.totalPaid)}</td><td>{displayDate(record.billDueDate)}</td><td>{formatCurrency(record.outstandingAmount)}</td><td>{record.paymentStatus ?? "Due"}</td></tr>)}</tbody><tfoot><tr><th colSpan={4}>Total Bills: {printRows.length}</th><th>{formatCurrency(printRows.reduce((sum, record) => sum + Number(record.grandTotal ?? 0), 0))}</th><th>{formatCurrency(printRows.reduce((sum, record) => sum + Number(record.totalPaid ?? 0), 0))}</th><th>Total Outstanding</th><th>{formatCurrency(printRows.reduce((sum, record) => sum + Number(record.outstandingAmount ?? 0), 0))}</th><th></th></tr></tfoot></table><div className={styles.printSignature}>Authorized Signatory<div></div></div></section>
    </div>
  );
}
