"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import transportData from "@/assets/data/transport-details.json";

type Status = "Active" | "Inactive";
type TransportRecord = { id: number; city: string; name: string; address: string; type: string; status: Status };
type TransportForm = { city: string; name: string; address: string; type: string };
type StatusFilter = "All" | Status;
const PAGE_SIZE_OPTIONS = [5, 10, 20];
const emptyForm: TransportForm = { city: "", name: "", address: "", type: "" };
const initialRecords: TransportRecord[] = transportData.records.map((record) => ({
  ...record,
  status: record.status as Status,
}));

export default function TransportPage() {
  const [records, setRecords] = useState<TransportRecord[]>(initialRecords);
  const [form, setForm] = useState<TransportForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || [record.city, record.name, record.type].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (!cityFilter || record.city === cityFilter) && (!typeFilter || record.type === typeFilter) && (statusFilter === "All" || record.status === statusFilter);
    });
  }, [records, search, cityFilter, typeFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [search, cityFilter, typeFilter, statusFilter, pageSize]);
  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);

  function showToast(type: "success" | "error", message: string) { setToast({ type, message }); window.setTimeout(() => setToast(null), 3200); }
  function resetForm() { setForm(emptyForm); setEditingId(null); }
  function clearFilters() { setSearch(""); setCityFilter(""); setTypeFilter(""); setStatusFilter("All"); }
  function updateForm(field: keyof TransportForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ([form.city, form.name, form.address, form.type].some((value) => !value.trim())) { showToast("error", "Please complete all required fields."); return; }
    const duplicate = records.some((record) => record.id !== editingId && record.city.toLowerCase() === form.city.toLowerCase() && record.name.trim().toLowerCase() === form.name.trim().toLowerCase());
    if (duplicate) { showToast("error", "This City and Transport Name combination already exists."); return; }
    if (editingId) { setRecords((current) => current.map((record) => record.id === editingId ? { ...record, ...form } : record)); showToast("success", "Transport details updated successfully."); }
    else { setRecords((current) => [...current, { ...form, id: Date.now(), status: "Active" }]); showToast("success", "Transport details added successfully."); }
    resetForm();
  }
  function editRecord(record: TransportRecord) { setForm({ city: record.city, name: record.name, address: record.address, type: record.type }); setEditingId(record.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function deleteRecord(record: TransportRecord) { if (!window.confirm(`Delete ${record.name} transport details?`)) return; setRecords((current) => current.filter((item) => item.id !== record.id)); if (editingId === record.id) resetForm(); showToast("success", "Transport details deleted."); }
  function toggleStatus(record: TransportRecord) { const nextStatus = record.status === "Active" ? "Inactive" : "Active"; setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: nextStatus } : item)); showToast("success", `${record.name} marked ${nextStatus}.`); }

  return <div className="page bank-details-page">
    <PageHeader title="Transport Details" subtitle="Manage transport partners and delivery services" />
    {toast && <div className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`} role="status"><i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"} me-2`} />{toast.message}</div>}
    <section className="card bank-form-card mb-4"><div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-4"><div><h2 className="h5 mb-1">{editingId ? "Edit transport details" : "Add transport details"}</h2><p className="muted mb-0">Fields marked <span className="text-danger">*</span> are required</p></div><span className="bank-form-icon"><i className="bi bi-truck" aria-hidden="true" /></span></div>
      <form className="p-4" onSubmit={submitForm}><div className="row g-3"><div className="col-md-6"><label htmlFor="transport-city" className="form-label">City <span className="text-danger">*</span></label><select id="transport-city" className="form-select" value={form.city} onChange={(event) => updateForm("city", event.target.value)}><option value="">Select City</option>{transportData.cities.map((city) => <option key={city}>{city}</option>)}</select></div><div className="col-md-6"><label htmlFor="transport-name" className="form-label">Transport Name <span className="text-danger">*</span></label><input id="transport-name" className="form-control" placeholder="Enter transport name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></div><div className="col-md-6"><label htmlFor="transport-address" className="form-label">Address <span className="text-danger">*</span></label><textarea id="transport-address" className="form-control" rows={3} placeholder="Enter address" value={form.address} onChange={(event) => updateForm("address", event.target.value)} /></div><div className="col-md-6"><label htmlFor="transport-type" className="form-label">Transport Type <span className="text-danger">*</span></label><select id="transport-type" className="form-select" value={form.type} onChange={(event) => updateForm("type", event.target.value)}><option value="">Select Transport Type</option>{transportData.transportTypes.map((type) => <option key={type}>{type}</option>)}</select></div></div><div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light" onClick={resetForm}><i className="bi bi-arrow-counterclockwise me-2" />Reset</button><button type="submit" className="btn btn-brand"><i className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"} me-2`} />{editingId ? "Update" : "Add"}</button></div></form>
    </section>
    <section className="card table-card" aria-label="Transport details table"><div className="table-toolbar p-3 border-bottom"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"><div><h2 className="h5 mb-1">Transport details list</h2><span className="muted" aria-live="polite">{filteredRecords.length} of {records.length} records</span></div><label className="search mb-0" style={{ maxWidth: 330, width: "100%" }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search transport details</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city, name or type..." /></label></div><div className="row g-2 align-items-end"><div className="col-sm-6 col-lg-3"><label htmlFor="transport-filter-city" className="form-label small mb-1">City</label><select id="transport-filter-city" className="form-select form-select-sm" value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All Cities</option>{transportData.cities.map((city) => <option key={city}>{city}</option>)}</select></div><div className="col-sm-6 col-lg-3"><label htmlFor="transport-filter-type" className="form-label small mb-1">Transport Type</label><select id="transport-filter-type" className="form-select form-select-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All Types</option>{transportData.transportTypes.map((type) => <option key={type}>{type}</option>)}</select></div><div className="col-sm-6 col-lg-3"><label htmlFor="transport-filter-status" className="form-label small mb-1">Status</label><select id="transport-filter-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option>All</option><option>Active</option><option>Inactive</option></select></div><div className="col-sm-6 col-lg-3"><button type="button" className="btn btn-light btn-sm w-100" onClick={clearFilters}><i className="bi bi-x-lg me-2" />Clear Filters</button></div></div></div>
      <div className="table-responsive"><table className="table mb-0 align-middle"><thead><tr><th>City</th><th>Transport Name</th><th>Address</th><th>Transport Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRecords.length ? paginatedRecords.map((record) => <tr key={record.id}><td>{record.city}</td><td className="fw-semibold">{record.name}</td><td className="bank-address">{record.address}</td><td>{record.type}</td><td><span className={`badge-soft ${record.status === "Active" ? "badge-success" : "badge-danger"}`}>{record.status}</span></td><td><div className="d-flex flex-wrap gap-1"><button type="button" className="btn btn-sm btn-light" onClick={() => editRecord(record)} title="Edit" aria-label={`Edit ${record.name}`}><i className="bi bi-pencil" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => toggleStatus(record)} title={record.status === "Active" ? "Deactivate" : "Activate"} aria-label={`${record.status === "Active" ? "Deactivate" : "Activate"} ${record.name}`}><i className={`bi ${record.status === "Active" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} /></button><button type="button" className="btn btn-sm btn-light text-danger" onClick={() => deleteRecord(record)} title="Delete" aria-label={`Delete ${record.name}`}><i className="bi bi-trash3" /></button></div></td></tr>) : <tr><td colSpan={6} className="text-center py-5 muted">No transport details found</td></tr>}</tbody></table></div>
      {filteredRecords.length > 0 && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><div className="d-flex align-items-center gap-2"><span className="muted small">Rows per page</span><select className="form-select form-select-sm" style={{ width: 76 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select><span className="muted small">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}</span></div>{filteredRecords.length > pageSize && <nav aria-label="Transport details pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <li className={`page-item ${currentPage === page ? "active" : ""}`} key={page}><button type="button" className="page-link" onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? "page" : undefined}>{page}</button></li>)}<li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></li></ul></nav>}</div>}
    </section>
  </div>;
}
