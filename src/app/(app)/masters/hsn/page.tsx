"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { hsnService } from "@/lib/hsn-service";
import type { HsnRecord, HsnStatus } from "@/types/hsn";

const PAGE_SIZE_OPTIONS = [5, 10, 20];
type StatusFilter = "All" | HsnStatus;
type SortOption = "code" | "category";
type FormState = { hsnCode: string; category: string };
const emptyForm: FormState = { hsnCode: "", category: "" };

export default function HsnPage() {
  const [records, setRecords] = useState<HsnRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sort, setSort] = useState<SortOption>("code");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<HsnRecord | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const refresh = () => { setRecords(hsnService.list()); setCategories(hsnService.categories()); };
  useEffect(refresh, []);

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
  function resetForm() { setForm(emptyForm); setEditingId(null); }
  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = form.hsnCode.trim();
    if (!form.category) { showToast("error", "HSN Category is required."); return; }
    if (!/^\d{4}$/.test(normalizedCode)) { showToast("error", "HSN Code must contain exactly four digits."); return; }
    try {
      const payload = { hsnCode: normalizedCode, category: form.category.trim(), status: editingId === null ? "Active" as const : records.find((record) => record.id === editingId)?.status ?? "Active" as const };
      if (editingId === null) hsnService.create(payload); else hsnService.update(editingId, payload);
      refresh(); resetForm(); showToast("success", editingId === null ? "HSN record added." : "HSN record updated.");
    } catch (error) { showToast("error", error instanceof Error ? error.message : "Unable to save HSN record."); }
  }
  function editRecord(record: HsnRecord) { setForm({ hsnCode: hsnService.categoryCode(record.category), category: record.category }); setEditingId(record.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function toggleStatus(record: HsnRecord) { const next: HsnStatus = record.status === "Active" ? "Inactive" : "Active"; hsnService.toggleStatus(record.id, next); refresh(); showToast("success", `${record.hsnCode} marked ${next}.`); }
  function addCategory(event: FormEvent<HTMLFormElement>) { event.preventDefault(); try { const record = hsnService.addCategory(categoryName, categoryCode); refresh(); setForm({ category: record.category, hsnCode: record.hsnCode }); setEditingId(null); setCategoryName(""); setCategoryCode(""); setCategoryModalOpen(false); showToast("success", "HSN Category added successfully."); } catch (error) { showToast("error", error instanceof Error ? error.message : "Unable to add category."); } }
  function clearFilters() { setSearch(""); setCategoryFilter(""); setStatusFilter("All"); setSort("code"); }

  return <div className="page bank-details-page">
    <PageHeader title="HSN Master" subtitle="Maintain four-digit HSN codes and categories" />
    {toast && <div className={`alert bank-toast alert-${toast.type === "success" ? "success" : "danger"} shadow-sm`} role="status">{toast.message}</div>}
    <section className="card bank-form-card mb-4">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 px-4"><div><h2 className="h5 mb-1">{editingId === null ? "Add HSN record" : "Edit HSN record"}</h2><p className="muted mb-0">Select a category to use its unique HSN code.</p></div><span className="bank-form-icon"><i className="bi bi-upc-scan" aria-hidden="true" /></span></div>
      <form className="p-4" onSubmit={submitForm}><div className="row g-3 align-items-end"><div className="col-md-7"><label htmlFor="hsn-category" className="form-label">HSN Category <span className="text-danger">*</span></label><div className="input-group"><select id="hsn-category" className="form-select" required value={form.category} onChange={(event) => { const category = event.target.value; setForm({ category, hsnCode: hsnService.categoryCode(category) }); }}><option value="">Select HSN Category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><button type="button" className="btn btn-outline-primary" onClick={() => setCategoryModalOpen(true)}><i className="bi bi-plus-lg me-1" />Add Category</button></div></div><div className="col-md-5"><label htmlFor="hsn-code" className="form-label">HSN Code <span className="text-danger">*</span></label><input id="hsn-code" className="form-control" inputMode="numeric" maxLength={4} readOnly={Boolean(form.category)} required placeholder="e.g. 3004" value={form.hsnCode} onChange={(event) => setForm((current) => ({ ...current, hsnCode: event.target.value.replace(/\D/g, "").slice(0, 4) }))} /></div></div><div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light" onClick={resetForm}>Reset</button><button type="submit" className="btn btn-brand"><i className={`bi ${editingId ? "bi-check2" : "bi-plus-lg"} me-2`} />{editingId ? "Update" : "Save"}</button></div></form>
    </section>
    <section className="card table-card" aria-label="HSN master table">
      <div className="table-toolbar p-3 border-bottom"><div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3"><div><h2 className="h5 mb-1">HSN records</h2><span className="muted" aria-live="polite">{filteredRecords.length} of {records.length} records</span></div><label className="search mb-0" style={{ maxWidth: 330, width: "100%" }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search HSN</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code or category" /></label></div><div className="row g-2 align-items-end"><div className="col-sm-6 col-lg-4"><label htmlFor="hsn-filter-category" className="form-label small mb-1">Category</label><select id="hsn-filter-category" className="form-select form-select-sm" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All Categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="col-sm-6 col-lg-3"><label htmlFor="hsn-filter-status" className="form-label small mb-1">Status</label><select id="hsn-filter-status" className="form-select form-select-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option>All</option><option>Active</option><option>Inactive</option></select></div><div className="col-sm-6 col-lg-3"><label htmlFor="hsn-sort" className="form-label small mb-1">Sort</label><select id="hsn-sort" className="form-select form-select-sm" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="code">HSN Code</option><option value="category">Category A-Z</option></select></div><div className="col-sm-6 col-lg-2"><button type="button" className="btn btn-light btn-sm w-100" onClick={clearFilters}>Clear Filters</button></div></div></div>
      <div className="d-flex justify-content-end gap-2 px-3 pt-3"><button type="button" className="btn btn-outline-success btn-sm" onClick={() => void import("@/lib/hsn-export").then(({ exportHsnExcel }) => exportHsnExcel(filteredRecords))}><i className="bi bi-file-earmark-excel me-1" />Download Excel</button><button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void import("@/lib/hsn-export").then(({ exportHsnPdf }) => exportHsnPdf(filteredRecords))}><i className="bi bi-file-earmark-pdf me-1" />Download PDF</button></div>
      <div className="table-responsive"><table className="table mb-0 align-middle"><thead><tr><th>HSN Code</th><th>Category</th><th>Status</th><th>Actions</th></tr></thead><tbody>{paginatedRecords.length ? paginatedRecords.map((record) => <tr key={record.id}><td className="fw-semibold">{record.hsnCode}</td><td>{record.category}</td><td><span className={`badge-soft ${record.status === "Active" ? "badge-success" : "badge-danger"}`}>{record.status}</span></td><td><div className="d-flex flex-wrap gap-1"><button type="button" className="btn btn-sm btn-light" onClick={() => setViewRecord(record)} aria-label={`View ${record.category}`}><i className="bi bi-eye" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => editRecord(record)} aria-label={`Edit ${record.category}`}><i className="bi bi-pencil" /></button><button type="button" className="btn btn-sm btn-light" onClick={() => toggleStatus(record)} aria-label={`${record.status === "Active" ? "Deactivate" : "Activate"} ${record.category}`}><i className={`bi ${record.status === "Active" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"}`} /></button></div></td></tr>) : <tr><td colSpan={4} className="text-center py-5 muted">No HSN records found.</td></tr>}</tbody></table></div>
      {filteredRecords.length > 0 && <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 p-3 border-top"><div className="d-flex align-items-center gap-2"><span className="muted small">Rows per page</span><select className="form-select form-select-sm" style={{ width: 76 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}</select><span className="muted small">Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length}</span></div>{filteredRecords.length > pageSize && <nav aria-label="HSN pagination"><ul className="pagination pagination-sm mb-0"><li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>Previous</button></li>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <li className={`page-item ${currentPage === page ? "active" : ""}`} key={page}><button type="button" className="page-link" onClick={() => setCurrentPage(page)}>{page}</button></li>)}<li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}><button type="button" className="page-link" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}>Next</button></li></ul></nav>}</div>}
    </section>
    {categoryModalOpen && <div className="bank-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoryModalOpen(false); }}><section className="card bank-view-modal" role="dialog" aria-modal="true" aria-labelledby="add-category-title"><div className="d-flex justify-content-between align-items-center mb-3"><h2 id="add-category-title" className="h5 mb-0">Add HSN Category</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setCategoryModalOpen(false)} /></div><form onSubmit={addCategory}><label className="form-label" htmlFor="new-hsn-category">Category Name <span className="text-danger">*</span></label><input autoFocus id="new-hsn-category" className="form-control" required value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /><label className="form-label mt-3" htmlFor="new-hsn-code">HSN Code <span className="text-danger">*</span></label><input id="new-hsn-code" className="form-control" required inputMode="numeric" maxLength={4} value={categoryCode} onChange={(event) => setCategoryCode(event.target.value.replace(/\D/g, "").slice(0, 4))} /><div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-light" onClick={() => setCategoryModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-brand">Add Category</button></div></form></section></div>}
    {viewRecord && <div className="bank-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewRecord(null); }}><section className="card bank-view-modal" role="dialog" aria-modal="true" aria-labelledby="view-hsn-title"><div className="d-flex justify-content-between align-items-center mb-3"><h2 id="view-hsn-title" className="h5 mb-0">HSN Details</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setViewRecord(null)} /></div><dl className="row mb-0"><dt className="col-6">HSN Code</dt><dd className="col-6">{viewRecord.hsnCode}</dd><dt className="col-6">Category</dt><dd className="col-6">{viewRecord.category}</dd><dt className="col-6">Status</dt><dd className="col-6">{viewRecord.status}</dd></dl></section></div>}
  </div>;
}
