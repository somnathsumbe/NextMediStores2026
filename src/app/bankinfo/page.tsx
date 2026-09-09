"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import bankData from "@/data/bankinfo.json";
type BankRecord = {
  id: number;
  party: string;
  bankName: string;
  address: string;
  ifsc: string;
  accountNo: string;
  city: string;
  isDefault: boolean;
  status: "Active" | "Inactive";
};
type BankForm = Omit<BankRecord, "id">;
type StatusFilter = "All" | "Active" | "Inactive";
type DefaultFilter = "All" | "Default" | "Non-Default";
const PAGE_SIZE_OPTIONS = [5, 10, 20];

const emptyForm: BankForm = {
  party: "",
  bankName: "",
  address: "",
  ifsc: "",
  accountNo: "",
  city: "",
  isDefault: false,
  status: "Active",
};
const initialRecords: BankRecord[] = bankData.records.map((record) => ({
  ...record,
  isDefault: record.isDefault ?? false,
  status: (record.status ?? "Active") as BankRecord["status"],
}));

function maskAccount(accountNo: string) {
  return accountNo.length > 4
    ? `${"•".repeat(Math.max(0, accountNo.length - 4))}${accountNo.slice(-4)}`
    : accountNo;
}

export default function BankInfo() {
  const [records, setRecords] = useState(initialRecords);
  const [form, setForm] = useState<BankForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [defaultFilter, setDefaultFilter] = useState<DefaultFilter>("All");
  const [appliedFilters, setAppliedFilters] = useState({ party: "", bank: "", city: "", status: "All" as StatusFilter, defaultValue: "All" as DefaultFilter });
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [viewing, setViewing] = useState<BankRecord | null>(null);
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || [record.party, record.bankName, record.accountNo, record.city, record.ifsc].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (!appliedFilters.party || record.party === appliedFilters.party) && (!appliedFilters.bank || record.bankName === appliedFilters.bank) && (!appliedFilters.city || record.city === appliedFilters.city) && (appliedFilters.status === "All" || record.status === appliedFilters.status) && (appliedFilters.defaultValue === "All" || (appliedFilters.defaultValue === "Default" ? record.isDefault : !record.isDefault));
    });
  }, [records, search, appliedFilters]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [search, appliedFilters, pageSize]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }
  function updateField(field: keyof BankForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "ifsc" ? value.toUpperCase() : value,
    }));
  }
  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }
  function applyFilters() {
    setAppliedFilters({ party: partyFilter, bank: bankFilter, city: cityFilter, status: statusFilter, defaultValue: defaultFilter });
  }
  function clearFilters() {
    setPartyFilter(""); setBankFilter(""); setCityFilter(""); setStatusFilter("All"); setDefaultFilter("All");
    setAppliedFilters({ party: "", bank: "", city: "", status: "All", defaultValue: "All" });
  }
  function setDefault(record: BankRecord) {
    setRecords((current) => current.map((item) => item.party === record.party ? { ...item, isDefault: item.id === record.id } : item));
    showToast("success", `${record.bankName} is now the default account for ${record.party}.`);
  }
  function toggleStatus(record: BankRecord) {
    setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item));
    showToast("success", `${record.bankName} marked ${record.status === "Active" ? "Inactive" : "Active"}.`);
  }
  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("success", `${label} copied to clipboard.`);
    } catch {
      showToast("error", `Unable to copy ${label.toLowerCase()}.`);
    }
  }
  function exportExcel() {
    const escapeCell = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const headers = ["Party", "Bank Name", "Account No.", "City", "Address", "IFSC Code", "Default", "Status"];
    const rows = filteredRecords.map((record) => [record.party, record.bankName, maskAccount(record.accountNo), record.city, record.address, record.ifsc, record.isDefault ? "Default" : "Non-Default", record.status]);
    const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeCell(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([`<html><head><meta charset="utf-8"></head><body>${table}</body></html>`], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "bank-details.xls"; link.click(); URL.revokeObjectURL(url);
    showToast("success", `${filteredRecords.length} filtered records exported.`);
  }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ([form.party, form.bankName, form.address, form.ifsc, form.accountNo, form.city].some((value) => !value.trim())) {
      showToast("error", "Please complete all required fields.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      showToast("error", "Enter a valid IFSC code, for example HDFC0001234.");
      return;
    }
    if (editingId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingId
            ? { ...form, id: editingId, isDefault: record.isDefault, status: record.status }
            : record.isDefault && record.party === form.party && current.find((item) => item.id === editingId)?.party !== form.party
              ? { ...record, isDefault: false }
              : record,
        ),
      );
      showToast("success", "Bank details updated successfully.");
    } else {
      setRecords((current) => [...current, { ...form, id: Date.now() }]);
      showToast("success", "Bank details added successfully.");
    }
    resetForm();
  }
  function editRecord(record: BankRecord) {
    setForm({
      party: record.party,
      bankName: record.bankName,
      address: record.address,
      ifsc: record.ifsc,
      accountNo: record.accountNo,
      city: record.city,
         isDefault: record.isDefault,
         status: record.status,
    });
    setEditingId(record.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function deleteRecord(record: BankRecord) {
    if (!window.confirm(`Delete bank details for ${record.party}?`)) return;
    setRecords((current) => current.filter((item) => item.id !== record.id));
    if (editingId === record.id) resetForm();
    showToast("success", "Bank details deleted.");
  }

  return (
    <div className="page bank-details-page">
      <PageHeader
        title="Bank Details"
        subtitle="Manage party bank accounts and payment information"
      />
      {toast && (
        <div
          className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`}
          role="status"
        >
          <i
            className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"} me-2`}
          />
          {toast.message}
        </div>
      )}
      <section className="card bank-form-card mb-4" id="bank-details-form">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-4">
          <div>
            <h2 className="h5 mb-1">
              {editingId ? "Edit bank details" : "Add bank details"}
            </h2>
            <p className="muted mb-0">
              Fields marked <span className="text-danger">*</span> are required
            </p>
          </div>
          <span className="bank-form-icon">
            <i className="bi bi-bank2" aria-hidden="true" />
          </span>
        </div>
        <form className="p-4" onSubmit={submitForm}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="party" className="form-label">
                Party <span className="text-danger">*</span>
              </label>
              <select
                id="party"
                className="form-select"
                value={form.party}
                onChange={(event) => updateField("party", event.target.value)}
              >
                <option value="">Select Party</option>
                   {bankData.parties.map((party) => (
                  <option key={party}>{party}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="bankName" className="form-label">
                Bank Name <span className="text-danger">*</span>
              </label>
              <select
                id="bankName"
                className="form-select"
                value={form.bankName}
                onChange={(event) =>
                  updateField("bankName", event.target.value)
                }
              >
                <option value="">Select Bank</option>
                   {bankData.banks.map((bank) => (
                  <option key={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label htmlFor="address" className="form-label">
                Address <span className="text-danger">*</span>
              </label>
              <textarea
                id="address"
                className="form-control"
                rows={3}
                placeholder="Enter bank address"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label htmlFor="city" className="form-label">
                City <span className="text-danger">*</span>
              </label>
              <select
                id="city"
                className="form-select"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
              >
                <option value="">Select City</option>
                   {bankData.cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="ifsc" className="form-label">
                IFSC Code <span className="text-danger">*</span>
              </label>
              <input
                id="ifsc"
                className="form-control text-uppercase"
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                value={form.ifsc}
                onChange={(event) => updateField("ifsc", event.target.value)}
              />
              <div className="form-text">
                11 characters: 4 letters, 0, then 6 alphanumeric characters.
              </div>
            </div>
            <div className="col-md-6">
              <label htmlFor="accountNo" className="form-label">
                Account No. <span className="text-danger">*</span>
              </label>
              <input
                id="accountNo"
                className="form-control"
                inputMode="numeric"
                placeholder="Enter account number"
                value={form.accountNo}
                onChange={(event) =>
                  updateField(
                    "accountNo",
                    event.target.value.replace(/\D/g, ""),
                  )
                }
              />
            </div>
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-light" onClick={resetForm}>
              <i className="bi bi-arrow-counterclockwise me-2" />
              Reset
            </button>
            <button className="btn btn-brand" type="submit">
              <i
                className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"} me-2`}
              />
              {editingId ? "Update Details" : "Save Details"}
            </button>
          </div>
        </form>
      </section>
      <section className="card table-card" aria-label="Bank details table">
        <div className="table-toolbar p-3 border-bottom">
          <div className="bank-table-heading d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div><h2 className="h5 mb-1">Saved bank details</h2><span className="muted" aria-live="polite">{filteredRecords.length} of {records.length} records</span></div>
            <button type="button" className="btn btn-outline-success bank-export-btn" onClick={exportExcel}><i className="bi bi-file-earmark-excel me-2" />Export Excel<span className="bank-export-count">{filteredRecords.length}</span></button>
          </div>
          <div className="d-flex justify-content-end mb-3">
            <label className="search mb-0 bank-table-search" style={{ maxWidth: 390, width: "100%" }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search bank details</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bank details..." /></label>
          </div>
          <div className="row g-2 align-items-end">
            <div className="col-sm-6 col-lg-2"><label htmlFor="filter-party" className="form-label small mb-1">Party</label><select id="filter-party" className="form-select form-select-sm" value={partyFilter} onChange={(event) => setPartyFilter(event.target.value)}><option value="">All Parties</option>{bankData.parties.map((party) => <option key={party}>{party}</option>)}</select></div>
            <div className="col-sm-6 col-lg-2"><label htmlFor="filter-bank" className="form-label small mb-1">Bank Name</label><select id="filter-bank" className="form-select form-select-sm" value={bankFilter} onChange={(event) => setBankFilter(event.target.value)}><option value="">All Banks</option>{bankData.banks.map((bank) => <option key={bank}>{bank}</option>)}</select></div>
            <div className="col-sm-6 col-lg-2"><label htmlFor="filter-city" className="form-label small mb-1">City</label><select id="filter-city" className="form-select form-select-sm" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All Cities</option>{bankData.cities.map((city) => <option key={city}>{city}</option>)}</select></div>
            <div className="col-sm-6 col-lg-2"><label htmlFor="filter-status" className="form-label small mb-1">Status</label><select id="filter-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option>All</option><option>Active</option><option>Inactive</option></select></div>
            <div className="col-sm-6 col-lg-2"><label htmlFor="filter-default" className="form-label small mb-1">Default</label><select id="filter-default" className="form-select form-select-sm" value={defaultFilter} onChange={(event) => setDefaultFilter(event.target.value as DefaultFilter)}><option>All</option><option>Default</option><option>Non-Default</option></select></div>
            <div className="col-sm-6 col-lg-2 d-flex gap-2"><button type="button" className="btn btn-brand btn-sm flex-grow-1" onClick={applyFilters}>Apply Filter</button><button type="button" className="btn btn-light btn-sm" onClick={clearFilters} title="Clear filters" aria-label="Clear filters"><i className="bi bi-x-lg" /></button></div>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>Party</th>
                <th>Bank Name</th>
                <th>Account No.</th>
                <th>City</th>
                <th>Address</th>
                <th>IFSC Code</th>
                <th>Default</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length ? (
                paginatedRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="fw-semibold">{record.party}</td>
                    <td>{record.bankName}</td>
                    <td className="text-nowrap bank-copy-cell">
                      <span>{maskAccount(record.accountNo)}</span>
                      <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(record.accountNo, "Account number")} aria-label={`Copy account number for ${record.party}`} title="Copy Account"><i className="bi bi-copy" /></button>
                    </td>
                    <td>{record.city}</td>
                    <td className="bank-address">{record.address}</td>
                    <td className="bank-copy-cell">
                      <span className="ifsc-code">{record.ifsc}</span>
                      <button type="button" className="btn btn-sm btn-light copy-btn" onClick={() => copyValue(record.ifsc, "IFSC code")} aria-label={`Copy IFSC code for ${record.party}`} title="Copy IFSC"><i className="bi bi-copy" /></button>
                    </td>
                    <td>{record.isDefault ? <span className="badge-soft badge-success">Default</span> : <span className="muted small">Non-default</span>}</td>
                    <td><span className={`badge-soft ${record.status === "Active" ? "badge-success" : "badge-danger"}`}>{record.status}</span></td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <button
                          className="btn btn-sm btn-light"
                          onClick={() => setViewing(record)}
                          aria-label={`View ${record.party}`}
                          title="View"
                        >
                          <i className="bi bi-eye" />
                        </button>
                        <button
                          className="btn btn-sm btn-light"
                          onClick={() => editRecord(record)}
                          aria-label={`Edit ${record.party}`}
                          title="Edit"
                        >
                          <i className="bi bi-pencil" />
                        </button>
                        <button
                          className="btn btn-sm btn-light text-danger"
                          onClick={() => deleteRecord(record)}
                          aria-label={`Delete ${record.party}`}
                          title="Delete"
                        >
                          <i className="bi bi-trash3" />
                        </button>
                        {!record.isDefault && <button className="btn btn-sm btn-light text-primary" onClick={() => setDefault(record)} title="Set as Default" aria-label={`Set ${record.party} account as default`}><i className="bi bi-star" /></button>}
                        <button className="btn btn-sm btn-light" onClick={() => toggleStatus(record)} title={record.status === "Active" ? "Deactivate" : "Activate"} aria-label={`${record.status === "Active" ? "Deactivate" : "Activate"} ${record.party}`}><i className={`bi ${record.status === "Active" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-5 muted">
                    No bank details found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredRecords.length > 0 && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><div className="d-flex align-items-center gap-2"><span className="muted small">Rows per page</span><select className="form-select form-select-sm" style={{ width: 76 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select><span className="muted small">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}</span></div>{filteredRecords.length > pageSize && <nav aria-label="Bank details pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <li className={`page-item ${currentPage === page ? "active" : ""}`} key={page}><button type="button" className="page-link" onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? "page" : undefined}>{page}</button></li>)}<li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></li></ul></nav>}</div>}
      </section>
      {viewing && (
        <div
          className="bank-modal-backdrop"
          role="presentation"
          onClick={() => setViewing(null)}
        >
          <section
            className="card bank-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-bank-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <p className="eyebrow mb-1">Bank account</p>
                <h2 id="view-bank-title" className="h4 mb-0">
                  {viewing.party}
                </h2>
              </div>
              <button
                className="btn-close"
                aria-label="Close details"
                onClick={() => setViewing(null)}
              />
            </div>
            <div className="row g-3">
              {[
                ["Bank Name", viewing.bankName],
                ["Account No.", maskAccount(viewing.accountNo)],
                ["IFSC Code", viewing.ifsc],
                ["City", viewing.city],
                ["Address", viewing.address],
              ].map(([label, value]) => (
                <div className="col-sm-6" key={label}>
                  <div className="muted small">{label}</div>
                  <div className="fw-semibold mt-1 d-flex align-items-center">
                    <span>{value}</span>
                    {(label === "Account No." || label === "IFSC Code") && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light copy-btn"
                        onClick={() => copyValue(label === "Account No." ? viewing.accountNo : viewing.ifsc, label)}
                        aria-label={`Copy ${label}`}
                        title={`Copy ${label}`}
                      >
                        <i className="bi bi-copy" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-end mt-4">
              <button
                className="btn btn-brand"
                onClick={() => setViewing(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
