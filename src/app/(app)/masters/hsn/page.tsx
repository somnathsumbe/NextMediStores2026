"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import hsnData from "@/data/hsn.json";

type HsnRecord = { id: number; category: string; value: number; status: "Active" | "Inactive" };
type StatusFilter = "All" | "Active" | "Inactive";
type SortOption = "category" | "valueAsc" | "valueDesc";
const PAGE_SIZE_OPTIONS = [5, 10, 20];
const emptyForm = { category: "", value: "" };
const initialRecords: HsnRecord[] = hsnData.records.map((record) => ({ ...record, status: "Active" }));

export default function HsnPage() {
  const [records, setRecords] = useState<HsnRecord[]>(initialRecords);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortOption>("category");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch = !query || record.category.toLowerCase().includes(query) || String(record.value).includes(query);
      return matchesSearch && (!categoryFilter || record.category === categoryFilter) && (statusFilter === "All" || record.status === statusFilter);
    }).sort((left, right) => sort === "category" ? left.category.localeCompare(right.category) : sort === "valueAsc" ? left.value - right.value : right.value - left.value);
  }, [records, search, categoryFilter, statusFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [search, categoryFilter, statusFilter, sort, pageSize]);
  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);

  function showToast(type: "success" | "error", message: string) { setToast({ type, message }); window.setTimeout(() => setToast(null), 3200); }
  function resetForm() { setForm(emptyForm); setEditingId(null); }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericValue = Number(form.value);
    if (!form.category || !form.value.trim()) { showToast("error", "Please complete all required fields."); return; }
    if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) { showToast("error", "Value Add must be a number between 0 and 100."); return; }
    const duplicate = records.some((record) => record.id !== editingId && record.category === form.category && record.value === numericValue);
    if (duplicate) { showToast("error", "This HSN Category and Value Add combination already exists."); return; }
    if (editingId) { setRecords((current) => current.map((record) => record.id === editingId ? { ...record, category: form.category, value: numericValue } : record)); showToast("success", "HSN details updated successfully."); }
    else { setRecords((current) => [...current, { id: Date.now(), category: form.category, value: numericValue, status: "Active" }]); showToast("success", "HSN details saved successfully."); }
    resetForm();
  }
  function editRecord(record: HsnRecord) { setForm({ category: record.category, value: String(record.value) }); setEditingId(record.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function deleteRecord(record: HsnRecord) { if (!window.confirm(`Delete HSN details for ${record.category}?`)) return; setRecords((current) => current.filter((item) => item.id !== record.id)); if (editingId === record.id) resetForm(); showToast("success", "HSN details deleted."); }
  function toggleStatus(record: HsnRecord) { const nextStatus = record.status === "Active" ? "Inactive" : "Active"; setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status: nextStatus } : item)); showToast("success", `${record.category} marked ${nextStatus}.`); }
  function clearFilters() { setSearch(""); setCategoryFilter(""); setStatusFilter("All"); setSort("category"); }

  return <div className="page bank-details-page">
    <PageHeader title="HSN Details" subtitle="Maintain HSN categories and value additions" />
    {toast && <div className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`} role="status"><i className={`bi ${toast.type === "success" ? "bi-check-circle" : "bi-exclamation-circle"} me-2`} />{toast.message}</div>}
    <section className="card bank-form-card mb-4"><div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-4"><div><h2 className="h5 mb-1">{editingId ? "Edit HSN details" : "Add HSN details"}</h2><p className="muted mb-0">Fields marked <span className="text-danger">*</span> are required</p></div><span className="bank-form-icon"><i className="bi bi-upc-scan" aria-hidden="true" /></span></div>
      <form className="p-4" onSubmit={submitForm}><div className="row g-3"><div className="col-md-6"><label htmlFor="hsn-category" className="form-label">HSN Category <span className="text-danger">*</span></label><select id="hsn-category" className="form-select" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}><option value="">Select HSN Category</option>{hsnData.categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="col-md-6"><label htmlFor="value-add" className="form-label">Value Add <span className="text-danger">*</span></label><input id="value-add" type="number" min="0" max="100" step="0.01" inputMode="decimal" className="form-control" placeholder="Enter value (0-100)" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} /></div></div><div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light" onClick={resetForm}><i className="bi bi-arrow-counterclockwise me-2" />Reset</button><button type="submit" className="btn btn-brand"><i className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"} me-2`} />{editingId ? "Update" : "Save"}</button></div></form>
    </section>
    <section className="card table-card" aria-label="HSN details table"><div className="table-toolbar p-3 border-bottom"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"><div><h2 className="h5 mb-1">Saved HSN details</h2><span className="muted" aria-live="polite">{filteredRecords.length} of {records.length} records</span></div><label className="search mb-0" style={{ maxWidth: 330, width: "100%" }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search HSN</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search category or value..." /></label></div>
      <div className="row g-2 align-items-end"><div className="col-sm-6 col-lg-3"><label htmlFor="hsn-filter-category" className="form-label small mb-1">HSN Category</label><select id="hsn-filter-category" className="form-select form-select-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All Categories</option>{hsnData.categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="col-sm-6 col-lg-2"><label htmlFor="hsn-filter-status" className="form-label small mb-1">Status</label><select id="hsn-filter-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option>All</option><option>Active</option><option>Inactive</option></select></div><div className="col-sm-6 col-lg-4"><label htmlFor="hsn-sort" className="form-label small mb-1">Sort</label><select id="hsn-sort" className="form-select form-select-sm" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="category">HSN Category A-Z</option><option value="valueAsc">Value Add Low to High</option><option value="valueDesc">Value Add High to Low</option></select></div><div className="col-sm-6 col-lg-3"><button type="button" className="btn btn-light btn-sm w-100" onClick={clearFilters}><i className="bi bi-x-lg me-2" />Clear Filters</button></div></div></div>
      <div className="table-responsive"><table className="table mb-0 align-middle"><thead><tr><th>HSN Category</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRecords.length ? paginatedRecords.map((record) => <tr key={record.id}><td className="fw-semibold">{record.category}</td><td>{record.value}</td><td><span className={`badge-soft ${record.status === "Active" ? "badge-success" : "badge-danger"}`}>{record.status}</span></td><td><div className="d-flex flex-wrap gap-1"><button type="button" className="btn btn-sm btn-light" onClick={() => editRecord(record)} title="Edit" aria-label={`Edit ${record.category}`}><i className="bi bi-pencil" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => toggleStatus(record)} title={record.status === "Active" ? "Deactivate" : "Activate"} aria-label={`${record.status === "Active" ? "Deactivate" : "Activate"} ${record.category}`}><i className={`bi ${record.status === "Active" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} /></button><button type="button" className="btn btn-sm btn-light text-danger" onClick={() => deleteRecord(record)} title="Delete" aria-label={`Delete ${record.category}`}><i className="bi bi-trash3" /></button></div></td></tr>) : <tr><td colSpan={4} className="text-center py-5 muted">No HSN details found</td></tr>}</tbody></table></div>
      {filteredRecords.length > 0 && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><div className="d-flex align-items-center gap-2"><span className="muted small">Rows per page</span><select className="form-select form-select-sm" style={{ width: 76 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select><span className="muted small">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}</span></div>{filteredRecords.length > pageSize && <nav aria-label="HSN details pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <li className={`page-item ${currentPage === page ? "active" : ""}`} key={page}><button type="button" className="page-link" onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? "page" : undefined}>{page}</button></li>)}<li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></li></ul></nav>}</div>}
    </section>
  </div>;
}
