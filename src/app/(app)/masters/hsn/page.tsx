"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import type { HsnMongoRecord, HsnStatus } from "@/types/hsn";

const PAGE_SIZE_OPTIONS = [5, 10, 20];
type StatusFilter = "All" | HsnStatus;
type SortOption = "code" | "category";
type FormState = { hsnCode: string; category: string };
const emptyForm: FormState = { hsnCode: "", category: "" };

export default function HsnPage() {
  const [records, setRecords] = useState<HsnMongoRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortOption>("code");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<HsnMongoRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<HsnMongoRecord | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refresh = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/hsn", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load HSN records.");
      const nextRecords = payload.records as HsnMongoRecord[];
      setRecords(nextRecords);
      setCategories(Array.from(new Set(nextRecords.map((record) => record.category))).sort((left, right) => left.localeCompare(right)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load HSN records.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = `${record.hsnCode} ${record.category}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!categoryFilter || record.category === categoryFilter) && (statusFilter === "All" || record.status === statusFilter);
    }).sort((left, right) => sort === "code" ? left.hsnCode.localeCompare(right.hsnCode) : left.category.localeCompare(right.category));
  }, [records, search, categoryFilter, statusFilter, sort]);
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setCurrentPage(1), [search, categoryFilter, statusFilter, sort, pageSize]);
  useEffect(() => setCurrentPage((page) => Math.min(page, totalPages)), [totalPages]);

  function showToast(type: "success" | "error", message: string) { setToast({ type, message }); window.setTimeout(() => setToast(null), 3500); }
  function openModal(record?: HsnMongoRecord) {
    setEditingId(record?._id ?? null);
    setForm(record ? { hsnCode: record.hsnCode, category: record.category } : emptyForm);
    setCategoryModalOpen(true);
  }
  function closeModal() { setCategoryModalOpen(false); setEditingId(null); setForm(emptyForm); }
  async function saveHsn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = form.hsnCode.trim();
    if (!form.category) { showToast("error", "HSN Category is required."); return; }
    if (!/^\d{4}$/.test(normalizedCode)) { showToast("error", "HSN Code must contain exactly four digits."); return; }
    try {
      const currentStatus = editingId === null ? "Active" as const : records.find((record) => record._id === editingId)?.status ?? "Active" as const;
      const response = await fetch(editingId === null ? "/api/hsn" : `/api/hsn/${editingId}`, {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsnCode: normalizedCode, category: form.category.trim(), status: currentStatus }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save HSN record.");
      await refresh(); closeModal();
      showToast("success", editingId === null ? "HSN Category added successfully." : "HSN record updated.");
    } catch (error) { showToast("error", error instanceof Error ? error.message : "Unable to save HSN record."); }
  }
  function editRecord(record: HsnMongoRecord) { openModal(record); }
  async function toggleStatus(record: HsnMongoRecord) { const next: HsnStatus = record.status === "Active" ? "Inactive" : "Active"; try { const response = await fetch(`/api/hsn/${record._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...record, status: next }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to update HSN status."); await refresh(); showToast("success", `${record.hsnCode} marked ${next}.`); } catch (error) { showToast("error", error instanceof Error ? error.message : "Unable to update HSN status."); } }
  async function confirmDelete() {
    if (!recordToDelete) return;
    try {
      const response = await fetch(`/api/hsn/${recordToDelete._id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to delete HSN record.");
      setRecordToDelete(null);
      await refresh();
      showToast("success", "HSN record deleted successfully.");
    } catch (error) { showToast("error", error instanceof Error ? error.message : "Unable to delete HSN record."); }
  }
  function clearFilters() { setSearch(""); setCategoryFilter(""); setStatusFilter("All"); setSort("code"); }

  return <div className="page bank-details-page">
    <PageHeader title="HSN Master" subtitle="Maintain four-digit HSN codes and categories" />
    {toast && <div className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`} role="status">{toast.message}</div>}
    <section className="card table-card" aria-label="HSN master table">
      <div className="table-toolbar p-3 border-bottom"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"><div><h2 className="h5 mb-1">HSN records</h2><span className="muted" aria-live="polite">{filteredRecords.length} of {records.length} records</span></div><div className="d-flex flex-wrap align-items-center gap-2"><label className="search mb-0" style={{ maxWidth: 330, width: "100%" }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search HSN</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code or category" /></label><button type="button" className="btn btn-brand" onClick={() => openModal()}><i className="bi bi-plus-lg me-1" />Add Category</button></div></div><div className="row g-2 align-items-end"><div className="col-sm-6 col-lg-4"><label htmlFor="hsn-filter-category" className="form-label small mb-1">Category</label><select id="hsn-filter-category" className="form-select form-select-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All Categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="col-sm-6 col-lg-3"><label htmlFor="hsn-filter-status" className="form-label small mb-1">Status</label><select id="hsn-filter-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option>All</option><option>Active</option><option>Inactive</option></select></div><div className="col-sm-6 col-lg-3"><label htmlFor="hsn-sort" className="form-label small mb-1">Sort</label><select id="hsn-sort" className="form-select form-select-sm" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="code">HSN Code</option><option value="category">Category A-Z</option></select></div><div className="col-sm-6 col-lg-2"><button type="button" className="btn btn-light btn-sm w-100" onClick={clearFilters}>Clear Filters</button></div></div></div>
      <div className="d-flex justify-content-end gap-2 px-3 pt-3"><button type="button" className="btn btn-outline-success btn-sm" onClick={() => void import("@/lib/hsn-export").then(({ exportHsnExcel }) => exportHsnExcel(filteredRecords))}><i className="bi bi-file-earmark-excel me-1" />Download Excel</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void import("@/lib/hsn-export").then(({ exportHsnPdf }) => exportHsnPdf(filteredRecords))}><i className="bi bi-file-earmark-pdf me-1" />Download PDF</button></div>
      {isLoading && <div className="alert alert-light border mx-3 mt-3 mb-0" role="status">Loading HSN records...</div>}
      {loadError && <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">{loadError}</div>}
      <div className="table-responsive"><table className="table mb-0 align-middle"><thead><tr><th>HSN Code</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRecords.length ? paginatedRecords.map((record) => <tr key={record._id}><td className="fw-semibold">{record.hsnCode}</td><td>{record.category}</td><td><span className={`badge-soft ${record.status === "Active" ? "badge-success" : "badge-danger"}`}>{record.status}</span></td><td><div className="d-flex flex-wrap gap-1"><button type="button" className="btn btn-sm btn-light" onClick={() => setViewRecord(record)} title="View" aria-label={`View ${record.category}`}><i className="bi bi-eye" aria-hidden="true" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => editRecord(record)} title="Edit" aria-label={`Edit ${record.category}`}><i className="bi bi-pencil" aria-hidden="true" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => void toggleStatus(record)} title={record.status === "Active" ? "Deactivate" : "Activate"} aria-label={`${record.status === "Active" ? "Deactivate" : "Activate"} ${record.category}`}><i className={`bi ${record.status === "Active" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} aria-hidden="true" /></button><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setRecordToDelete(record)} title="Delete" aria-label={`Delete ${record.category} HSN record`}><i className="bi bi-trash" aria-hidden="true" /></button></div></td></tr>) : <tr><td colSpan={4} className="text-center py-5 muted">{isLoading ? "Loading HSN records..." : "No HSN records found."}</td></tr>}</tbody></table></div>
      {filteredRecords.length > 0 && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><div className="d-flex align-items-center gap-2"><span className="muted small">Rows per page</span><select className="form-select form-select-sm" style={{ width: 76 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select><span className="muted small">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}</span></div>{filteredRecords.length > pageSize && <nav aria-label="HSN pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <li className={`page-item ${currentPage === page ? "active" : ""}`} key={page}><button type="button" className="page-link" onClick={() => setCurrentPage(page)}>{page}</button></li>)}<li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></li></ul></nav>}</div>}
    </section>
    {categoryModalOpen && <div className="bank-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}><section className="card bank-view-modal" role="dialog" aria-modal="true" aria-labelledby="hsn-editor-title"><div className="d-flex justify-content-between align-items-center mb-3"><h2 id="hsn-editor-title" className="h5 mb-0">{editingId === null ? "Add HSN Category" : "Edit HSN Category"}</h2><button type="button" className="btn-close" aria-label="Close" onClick={closeModal} /></div><form onSubmit={saveHsn}><label className="form-label" htmlFor="hsn-editor-category">HSN Category <span className="text-danger">*</span></label><input autoFocus id="hsn-editor-category" className="form-control" required value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /><label className="form-label mt-3" htmlFor="hsn-editor-code">HSN Code <span className="text-danger">*</span></label><input id="hsn-editor-code" className="form-control" required inputMode="numeric" maxLength={4} value={form.hsnCode} onChange={(event) => setForm((current) => ({ ...current, hsnCode: event.target.value.replace(/\D/g, "").slice(0, 4) }))} /><div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-brand">Save</button></div></form></section></div>}
    {recordToDelete && <div className="bank-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecordToDelete(null); }}><section className="card bank-view-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-hsn-title" aria-describedby="delete-hsn-description"><div className="d-flex justify-content-between align-items-center mb-3"><h2 id="delete-hsn-title" className="h5 mb-0">Delete HSN Record?</h2><button type="button" className="btn-close" aria-label="Cancel delete" onClick={() => setRecordToDelete(null)} /></div><p id="delete-hsn-description" className="muted mb-3">Are you sure you want to delete this HSN record?</p><dl className="row mb-4"><dt className="col-5">HSN Code</dt><dd className="col-7 fw-semibold">{recordToDelete.hsnCode}</dd><dt className="col-5">Category</dt><dd className="col-7 fw-semibold">{recordToDelete.category}</dd></dl><div className="d-flex justify-content-end gap-2"><button autoFocus type="button" className="btn btn-light" onClick={() => setRecordToDelete(null)}>Cancel</button><button type="button" className="btn btn-danger" onClick={confirmDelete}><i className="bi bi-trash me-1" aria-hidden="true" />Delete</button></div></section></div>}
    {viewRecord && <div className="bank-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewRecord(null); }}><section className="card bank-view-modal" role="dialog" aria-modal="true" aria-labelledby="view-hsn-title"><div className="d-flex justify-content-between align-items-center mb-3"><h2 id="view-hsn-title" className="h5 mb-0">HSN Details</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setViewRecord(null)} /></div><dl className="row mb-0"><dt className="col-6">HSN Code</dt><dd className="col-6">{viewRecord.hsnCode}</dd><dt className="col-6">Category</dt><dd className="col-6">{viewRecord.category}</dd><dt className="col-6">Status</dt><dd className="col-6">{viewRecord.status}</dd></dl></section></div>}
  </div>;
}
