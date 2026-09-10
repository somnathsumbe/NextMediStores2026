"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import partyData from "@/data/party-details.json";

type CustomerType = "Dealer" | "Retailer";
type LicenceStatus = "Valid" | "Expiring Soon" | "Expired" | "Not Available";
type Party = {
  id: number;
  code: string;
  firmName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  customerType: CustomerType;
  active: boolean;
  email: string;
  phone: string;
  alternatePhone: string;
  fax: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  drugLicenceNumber: string;
  drugLicenceExpiry: string;
  foodLicenceNo: string;
  gstn: string;
  pan: string;
  scheme: string;
  discount: number;
  paymentTerms: string;
  creditLimit: number;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  closingBalance: number;
  outstandingBalance: number;
  contactPerson: string;
  whatsappNumber: string;
  notes: string;
};
type StatusFilter = "All" | "Active" | "Inactive";
type LicenceFilter = "All" | LicenceStatus;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const emptyForm: Omit<
  Party,
  "id" | "code" | "closingBalance" | "outstandingBalance"
> = {
  firmName: "",
  firstName: "",
  middleName: "",
  lastName: "",
  customerType: "Dealer",
  active: true,
  email: "",
  phone: "",
  alternatePhone: "",
  fax: "",
  address: "",
  city: "",
  state: "Maharashtra",
  pincode: "",
  drugLicenceNumber: "",
  drugLicenceExpiry: "",
  foodLicenceNo: "",
  gstn: "",
  pan: "",
  scheme: "",
  discount: 0,
  paymentTerms: "Cash",
  creditLimit: 0,
  openingBalance: 0,
  openingBalanceType: "Debit",
  contactPerson: "",
  whatsappNumber: "",
  notes: "",
};
const initialRecords: Party[] = partyData.records as Party[];

function licenceStatus(expiry: string): LicenceStatus {
  if (!expiry) return "Not Available";
  const days = Math.ceil(
    (new Date(`${expiry}T23:59:59`).getTime() -
      new Date().setHours(0, 0, 0, 0)) /
      86400000,
  );
  return days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Valid";
}
function expiryText(expiry: string) {
  if (!expiry) return "";
  const days = Math.ceil(
    (new Date(`${expiry}T23:59:59`).getTime() -
      new Date().setHours(0, 0, 0, 0)) /
      86400000,
  );
  return days < 0 ? `${Math.abs(days)} days ago` : `Expires in ${days} days`;
}
function badgeClass(status: LicenceStatus) {
  return status === "Expired"
    ? "badge-danger"
    : status === "Expiring Soon"
      ? "badge-warning"
      : status === "Valid"
        ? "badge-success"
        : "badge-secondary";
}
function nextCode(records: Party[]) {
  return `P${String(records.length + 1).padStart(3, "0")}`;
}

export default function Parties() {
  const [records, setRecords] = useState<Party[]>(initialRecords);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [licenceFilter, setLicenceFilter] = useState<LicenceFilter>("All");
  const [cityFilter, setCityFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [viewing, setViewing] = useState<Party | null>(null);
  const [deleting, setDeleting] = useState<Party | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((party) => {
      const text = [
        party.code,
        party.firmName,
        party.firstName,
        party.lastName,
        party.phone,
        party.gstn,
        party.pan,
        party.city,
      ]
        .join(" ")
        .toLowerCase();
      const licence = licenceStatus(party.drugLicenceExpiry);
      return (
        (!q || text.includes(q)) &&
        (!typeFilter || party.customerType === typeFilter) &&
        (statusFilter === "All" ||
          (party.active ? "Active" : "Inactive") === statusFilter) &&
        (licenceFilter === "All" || licence === licenceFilter) &&
        (!cityFilter || party.city === cityFilter)
      );
    });
  }, [records, search, typeFilter, statusFilter, licenceFilter, cityFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const summary = useMemo(
    () => ({
      total: records.length,
      active: records.filter((p) => p.active).length,
      dealers: records.filter((p) => p.customerType === "Dealer").length,
      retailers: records.filter((p) => p.customerType === "Retailer").length,
      expiring: records.filter(
        (p) => licenceStatus(p.drugLicenceExpiry) === "Expiring Soon",
      ).length,
      expired: records.filter(
        (p) => licenceStatus(p.drugLicenceExpiry) === "Expired",
      ).length,
    }),
    [records],
  );
  useEffect(
    () => setPage(1),
    [search, typeFilter, statusFilter, licenceFilter, cityFilter, pageSize],
  );
  useEffect(() => setPage((current) => Math.min(current, pages)), [pages]);

  function notify(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }
  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify("success", `${label} copied to clipboard.`);
    } catch {
      notify("error", `Unable to copy ${label.toLowerCase()}.`);
    }
  }
  function update(
    field: keyof typeof emptyForm,
    value: string | number | boolean,
  ) {
    setForm(
      (current) =>
        ({
          ...current,
          [field]:
            field === "gstn" ||
            field === "pan" ||
            field === "drugLicenceNumber" ||
            field === "foodLicenceNo"
              ? String(value).toUpperCase()
              : value,
        }) as typeof emptyForm,
    );
  }
  function reset() {
    setForm(emptyForm);
    setEditingId(null);
  }
  function validFormat() {
    const email = !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    const phone = /^[6-9]\d{9}$/.test(form.phone);
    const alternate =
      !form.alternatePhone || /^\d{10}$/.test(form.alternatePhone);
    const whatsapp =
      !form.whatsappNumber || /^\d{10}$/.test(form.whatsappNumber);
    const gst =
      !form.gstn ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstn);
    const pan = !form.pan || /^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan);
    const pin = !form.pincode || /^[1-9]\d{5}$/.test(form.pincode);
    const name =
      /^[A-Za-z ]+$/.test(form.firstName) && /^[A-Za-z ]+$/.test(form.lastName);
    const licence =
      !form.drugLicenceNumber ||
      /^[A-Z0-9-]{6,25}$/.test(form.drugLicenceNumber);
    const food =
      !form.foodLicenceNo || /^[A-Z0-9-]{6,25}$/.test(form.foodLicenceNo);
    return {
      email,
      phone,
      alternate,
      whatsapp,
      gst,
      pan,
      pin,
      name,
      licence,
      food,
      valid:
        email &&
        phone &&
        alternate &&
        whatsapp &&
        gst &&
        pan &&
        pin &&
        name &&
        licence &&
        food,
    };
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const validation = validFormat();
    if (
      !form.firmName.trim() ||
      form.firmName.trim().length < 2 ||
      !form.address.trim() ||
      !form.city ||
      !validation.valid
    ) {
      notify("error", "Please complete the required fields with valid values.");
      return;
    }
    const existing = records.find((p) => p.id === editingId);
    const party: Party = {
      ...form,
      id: editingId ?? Date.now(),
      code: existing?.code ?? nextCode(records),
      closingBalance: existing?.closingBalance ?? 0,
      outstandingBalance: existing?.outstandingBalance ?? form.openingBalance,
    } as Party;
    setRecords((current) =>
      editingId
        ? current.map((p) => (p.id === editingId ? party : p))
        : [...current, party],
    );
    notify(
      "success",
      editingId ? "Party updated successfully." : "Party added successfully.",
    );
    reset();
  }
  function edit(party: Party) {
    const { id, code, closingBalance, outstandingBalance, ...values } = party;
    void id;
    void code;
    void closingBalance;
    void outstandingBalance;
    setForm(values);
    setEditingId(party.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function remove() {
    if (!deleting) return;
    setRecords((current) => current.filter((p) => p.id !== deleting.id));
    setDeleting(null);
    notify("success", "Party deleted successfully.");
  }
  function toggle(party: Party) {
    setRecords((current) =>
      current.map((p) => (p.id === party.id ? { ...p, active: !p.active } : p)),
    );
    notify(
      "success",
      `${party.firmName} marked ${party.active ? "Inactive" : "Active"}.`,
    );
  }
  function clearFilters() {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("All");
    setLicenceFilter("All");
    setCityFilter("");
  }
  function exportFile(type: "csv" | "xls") {
    const headers = [
      "Party Code",
      "Firm Name",
      "Phone",
      "GSTN",
      "Type",
      "City",
      "Outstanding",
      "Licence Status",
      "Status",
    ];
    const data = filtered.map((p) => [
      p.code,
      p.firmName,
      p.phone,
      p.gstn,
      p.customerType,
      p.city,
      String(p.outstandingBalance),
      licenceStatus(p.drugLicenceExpiry),
      p.active ? "Active" : "Inactive",
    ]);
    const content =
      type === "csv"
        ? [headers, ...data]
            .map((row) =>
              row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
            )
            .join("\n")
        : `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>${data.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
    const blob = new Blob([content], {
      type: type === "csv" ? "text/csv" : "application/vnd.ms-excel",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `party-details.${type}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="page party-page">
      <PageHeader
        title="Party Details"
        subtitle="Manage pharmacies, hospitals, distributors and suppliers"
      />
      {toast && (
        <div
          className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`}
          role="status"
        >
          {toast.message}
        </div>
      )}
      <div className="row g-3 mb-4">
        {[
          ["Total Parties", summary.total, "bi-people"],
          ["Active Parties", summary.active, "bi-check-circle"],
          ["Dealers", summary.dealers, "bi-shop"],
          ["Retailers", summary.retailers, "bi-basket"],
          ["Expiring Licences", summary.expiring, "bi-hourglass-split"],
          ["Expired Licences", summary.expired, "bi-exclamation-triangle"],
        ].map(([label, value, icon]) => (
          <div className="col-6 col-xl-2" key={String(label)}>
            <div className="card stat">
              <div className="d-flex justify-content-between">
                <span className="muted">{label}</span>
                <i className={`bi ${icon} text-primary`} />
              </div>
              <h3 className="mt-2 mb-0">{value}</h3>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} noValidate>
        <section className="card p-4 mb-3">
          <div className="d-flex justify-content-between mb-3">
            <div>
              <h2 className="h5 mb-1">
                {editingId ? "Edit Party" : "Party Details"}
              </h2>
              <p className="muted mb-0">
                Basic Information and Contact Details
              </p>
            </div>
            <span className="bank-form-icon">
              <i className="bi bi-person-vcard" />
            </span>
          </div>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Party Code</label>
              <input
                className="form-control"
                value={
                  editingId
                    ? records.find((p) => p.id === editingId)?.code
                    : nextCode(records)
                }
                readOnly
              />
            </div>
            <div className="col-md-5">
              <label className="form-label">Firm Name *</label>
              <input
                className="form-control"
                value={form.firmName}
                onChange={(e) => update("firmName", e.target.value)}
                placeholder="Enter firm name"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Customer Type *</label>
              <select
                className="form-select"
                value={form.customerType}
                onChange={(e) => update("customerType", e.target.value)}
              >
                <option>Dealer</option>
                <option>Retailer</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">First Name *</label>
              <input
                className="form-control"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Middle Name</label>
              <input
                className="form-control"
                value={form.middleName}
                onChange={(e) => update("middleName", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Last Name *</label>
              <input
                className="form-control"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label d-block">Active Party</label>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  checked={form.active}
                  onChange={() => update("active", true)}
                  id="party-active"
                />
                <label className="form-check-label" htmlFor="party-active">
                  Yes
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  checked={!form.active}
                  onChange={() => update("active", false)}
                  id="party-inactive"
                />
                <label className="form-check-label" htmlFor="party-inactive">
                  No
                </label>
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">Email ID</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Phone Number *</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={10}
                value={form.phone}
                onChange={(e) =>
                  update("phone", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Alternate Phone</label>
              <input
                className="form-control"
                inputMode="numeric"
                maxLength={10}
                value={form.alternatePhone}
                onChange={(e) =>
                  update("alternatePhone", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">Address *</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">City *</label>
              <select
                className="form-select"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
              >
                <option value="">Select City</option>
                {partyData.cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">State</label>
              <select
                className="form-select"
                value={form.state}
                onChange={(e) => update("state", e.target.value)}
              >
                {partyData.states.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Pincode</label>
              <input
                className="form-control"
                maxLength={6}
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) =>
                  update("pincode", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
          </div>
        </section>
        <section className="card p-4 mb-3">
          <h2 className="h5 mb-3">License &amp; Tax Details</h2>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Drug Licence Number</label>
              <input
                className="form-control text-uppercase"
                value={form.drugLicenceNumber}
                onChange={(e) => update("drugLicenceNumber", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Drug Licence Expiry</label>
              <input
                className="form-control"
                type="date"
                value={form.drugLicenceExpiry}
                onChange={(e) => update("drugLicenceExpiry", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Food Licence No</label>
              <input
                className="form-control text-uppercase"
                value={form.foodLicenceNo}
                onChange={(e) => update("foodLicenceNo", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">GSTN Number</label>
              <input
                className="form-control text-uppercase"
                maxLength={15}
                value={form.gstn}
                onChange={(e) => update("gstn", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">PAN Number</label>
              <input
                className="form-control text-uppercase"
                maxLength={10}
                value={form.pan}
                onChange={(e) => update("pan", e.target.value)}
              />
            </div>
            {form.drugLicenceExpiry && (
              <div className="col-md-4 d-flex align-items-end">
                <span
                  className={`badge-soft ${badgeClass(licenceStatus(form.drugLicenceExpiry))}`}
                >
                  {licenceStatus(form.drugLicenceExpiry)} ·{" "}
                  {expiryText(form.drugLicenceExpiry)}
                </span>
              </div>
            )}
          </div>
        </section>
        <section className="card p-4 mb-3">
          <h2 className="h5 mb-3">Commercial Details</h2>
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Scheme</label>
              <select
                className="form-select"
                value={form.scheme}
                onChange={(e) => update("scheme", e.target.value)}
              >
                <option value="">Select Scheme</option>
                {partyData.schemes.map((scheme) => (
                  <option key={scheme}>{scheme}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Discount</label>
              <select
                className="form-select"
                value={form.discount}
                onChange={(e) => update("discount", Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value ? `${value}%` : "Select Discount"}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Payment Terms</label>
              <select
                className="form-select"
                value={form.paymentTerms}
                onChange={(e) => update("paymentTerms", e.target.value)}
              >
                {[
                  "Cash",
                  "7 Days",
                  "15 Days",
                  "30 Days",
                  "45 Days",
                  "60 Days",
                ].map((term) => (
                  <option key={term}>{term}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Credit Limit</label>
              <input
                className="form-control"
                type="number"
                min="0"
                value={form.creditLimit}
                onChange={(e) => update("creditLimit", Number(e.target.value))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Opening Balance</label>
              <input
                className="form-control"
                type="number"
                min="0"
                value={form.openingBalance}
                onChange={(e) =>
                  update("openingBalance", Number(e.target.value))
                }
              />
            </div>
            <div className="col-md-3">
              <label className="form-label d-block">Balance Type</label>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  checked={form.openingBalanceType === "Debit"}
                  onChange={() => update("openingBalanceType", "Debit")}
                  id="debit"
                />
                <label className="form-check-label" htmlFor="debit">
                  Debit
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="radio"
                  checked={form.openingBalanceType === "Credit"}
                  onChange={() => update("openingBalanceType", "Credit")}
                  id="credit"
                />
                <label className="form-check-label" htmlFor="credit">
                  Credit
                </label>
              </div>
            </div>
            <div className="col-md-3">
              <label className="form-label">Closing Balance</label>
              <input
                className="form-control"
                value={`₹${form.openingBalance.toLocaleString("en-IN")}`}
                readOnly
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Outstanding Balance</label>
              <input
                className="form-control"
                value={`₹${form.openingBalance.toLocaleString("en-IN")} ${form.openingBalanceType}`}
                readOnly
              />
            </div>
          </div>
        </section>
        <section className="card p-4 mb-3">
          <h2 className="h5 mb-3">Additional Information</h2>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Contact Person</label>
              <input
                className="form-control"
                value={form.contactPerson}
                onChange={(e) => update("contactPerson", e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">WhatsApp Number</label>
              <input
                className="form-control"
                maxLength={10}
                inputMode="numeric"
                value={form.whatsappNumber}
                onChange={(e) =>
                  update("whatsappNumber", e.target.value.replace(/\D/g, ""))
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">
                Notes <span className="muted">({form.notes.length}/500)</span>
              </label>
              <textarea
                className="form-control"
                maxLength={500}
                rows={2}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </div>
        </section>
        <div className="d-flex justify-content-end gap-2 mb-4">
          <button type="button" className="btn btn-light" onClick={reset}>
            Reset
          </button>
          <button type="submit" className="btn btn-brand">
            {editingId ? "Update Party" : "Add Party"}
          </button>
        </div>
      </form>
      <section className="card table-card" aria-label="Party details list">
        <div className="table-toolbar p-3 border-bottom">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1">Party Details List</h2>
              <span className="muted">
                {filtered.length} of {records.length} records
              </span>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={() => exportFile("xls")}
              >
                <i className="bi bi-file-earmark-excel me-1" />
                Excel
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => exportFile("csv")}
              >
                CSV
              </button>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-1" />
                Print
              </button>
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <label className="search flex-grow-1 mb-0">
              <i className="bi bi-search" />
              <span className="visually-hidden">Search parties</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, firm, phone, GSTN, PAN, city..."
              />
            </label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 150 }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option>Dealer</option>
              <option>Retailer</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 160 }}
              value={licenceFilter}
              onChange={(e) =>
                setLicenceFilter(e.target.value as LicenceFilter)
              }
            >
              <option>All</option>
              <option>Valid</option>
              <option>Expiring Soon</option>
              <option>Expired</option>
            </select>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 140 }}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="">All Cities</option>
              {partyData.cities.map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>Code</th>
                <th>Firm Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>GSTN</th>
                <th>Type</th>
                <th>City</th>
                <th>Outstanding</th>
                <th>Licence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((party) => (
                  <tr key={party.id}>
                    <td className="fw-semibold">{party.code}</td>
                    <td>{party.firmName}</td>
                    <td>{party.contactPerson || "—"}</td>
                    <td className="text-nowrap">
                      <span>{party.phone}</span>
                      <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(party.phone, "Phone number")} aria-label={`Copy phone number for ${party.firmName}`} title="Copy Phone">
                        <i className="bi bi-copy" />
                      </button>
                    </td>
                    <td className="text-nowrap">
                      <span>{party.gstn || "—"}</span>
                      {party.gstn && <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(party.gstn, "GSTN")} aria-label={`Copy GSTN for ${party.firmName}`} title="Copy GSTN"><i className="bi bi-copy" /></button>}
                    </td>
                    <td>{party.customerType}</td>
                    <td>{party.city}</td>
                    <td
                      className={
                        party.outstandingBalance
                          ? "text-danger fw-semibold"
                          : ""
                      }
                    >
                      ₹{party.outstandingBalance.toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span
                        className={`badge-soft ${badgeClass(licenceStatus(party.drugLicenceExpiry))}`}
                      >
                        {licenceStatus(party.drugLicenceExpiry)}
                      </span>
                      {party.drugLicenceExpiry && (
                        <small className="d-block muted">
                          {expiryText(party.drugLicenceExpiry)}
                        </small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge-soft ${party.active ? "badge-success" : "badge-danger"}`}
                      >
                        {party.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => setViewing(party)}
                          title="View"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => edit(party)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          onClick={() => toggle(party)}
                          title="Activate/Deactivate"
                        >
                          <i className="bi bi-toggle-on" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-light text-danger"
                          onClick={() => setDeleting(party)}
                          title="Delete"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="text-center py-5 muted">
                    No party details found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top">
            <span className="muted small">
              Showing {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="d-flex align-items-center gap-2">
              <select
                className="form-select form-select-sm"
                style={{ width: 85 }}
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
              {filtered.length > pageSize && (
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: pages }, (_, i) => i + 1).map(
                    (number) => (
                      <li
                        key={number}
                        className={`page-item ${page === number ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPage(number)}
                        >
                          {number}
                        </button>
                      </li>
                    ),
                  )}
                  <li
                    className={`page-item ${page === pages ? "disabled" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page === pages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
      {viewing && (
        <div
          className="bank-modal-backdrop"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <section
            className="card bank-view-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between">
              <div>
                <p className="eyebrow mb-1">Party account</p>
                <h2 className="h4">{viewing.firmName}</h2>
              </div>
              <button
                className="btn-close"
                onClick={() => setViewing(null)}
                aria-label="Close"
              />
            </div>
            <h3 className="h6 mt-4">Basic Information</h3>
            <div className="row g-3 small">
              <div className="col-6">
                <span className="muted">Party Code</span>
                <strong className="d-block">{viewing.code}</strong>
              </div>
              <div className="col-6">
                <span className="muted">Type</span>
                <strong className="d-block">{viewing.customerType}</strong>
              </div>
              <div className="col-6">
                <span className="muted">Contact</span>
                <strong className="d-block">
                  {viewing.firstName} {viewing.lastName}
                </strong>
              </div>
              <div className="col-6">
                <span className="muted">Phone</span>
                <strong className="d-flex align-items-center">
                  {viewing.phone}
                  <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(viewing.phone, "Phone number")} aria-label="Copy phone number" title="Copy Phone"><i className="bi bi-copy" /></button>
                </strong>
              </div>
              <div className="col-12">
                <span className="muted">Address</span>
                <strong className="d-block">
                  {viewing.address}, {viewing.city}
                </strong>
              </div>
            </div>
            <h3 className="h6 mt-4">License &amp; Tax Details</h3>
            <div className="row g-3 small">
              <div className="col-6">
                <span className="muted">Drug Licence</span>
                <strong className="d-block">
                  {viewing.drugLicenceNumber || "—"}
                </strong>
              </div>
              <div className="col-6">
                <span className="muted">Licence Status</span>
                <strong className="d-block">
                  {licenceStatus(viewing.drugLicenceExpiry)}{" "}
                  {viewing.drugLicenceExpiry &&
                    `(${expiryText(viewing.drugLicenceExpiry)})`}
                </strong>
              </div>
              <div className="col-6">
                <span className="muted">GSTN</span>
                <strong className="d-flex align-items-center">
                  {viewing.gstn || "—"}
                  {viewing.gstn && <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(viewing.gstn, "GSTN")} aria-label="Copy GSTN" title="Copy GSTN"><i className="bi bi-copy" /></button>}
                </strong>
              </div>
              <div className="col-6">
                <span className="muted">PAN</span>
                <strong className="d-block">{viewing.pan || "—"}</strong>
              </div>
            </div>
            <h3 className="h6 mt-4">Commercial &amp; Balance</h3>
            <div className="row g-3 small">
              <div className="col-6">
                <span className="muted">Payment Terms</span>
                <strong className="d-block">{viewing.paymentTerms}</strong>
              </div>
              <div className="col-6">
                <span className="muted">Outstanding</span>
                <strong className="d-block">
                  ₹{viewing.outstandingBalance.toLocaleString("en-IN")}{" "}
                  {viewing.openingBalanceType}
                </strong>
              </div>
            </div>
          </section>
        </div>
      )}
      {deleting && (
        <div
          className="bank-modal-backdrop"
          onClick={() => setDeleting(null)}
          role="presentation"
        >
          <section
            className="card bank-view-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="h5">Delete Party?</h2>
            <p className="muted">
              Are you sure you want to delete this party? This action cannot be
              undone.
            </p>
            <div className="text-end">
              <button
                className="btn btn-light me-2"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={remove}>
                Delete
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
