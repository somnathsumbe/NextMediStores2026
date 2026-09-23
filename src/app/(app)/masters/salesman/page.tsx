"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Status } from "@/components/ui";
import { salesmanService } from "@/lib/salesman-service";
import type { Salesman } from "@/types/salesman";

type FormState = { fullName: string; mobileNumber: string };
const emptyForm: FormState = { fullName: "", mobileNumber: "" };

export default function SalesmanMaster() {
  const [records, setRecords] = useState<Salesman[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = () => setRecords(salesmanService.list());
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => !normalized || `${record.fullName} ${record.mobileNumber}`.toLowerCase().includes(normalized));
  }, [query, records]);

  const reset = () => { setEditingId(null); setForm(emptyForm); setError(""); };
  const submit = () => {
    const fullName = form.fullName.trim();
    const mobileNumber = form.mobileNumber.trim();
    if (!fullName) { setError("Full Name is required."); return; }
    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) { setError("Mobile Number must contain exactly 10 digits."); return; }
    try {
      if (editingId === null) salesmanService.create({ fullName, mobileNumber });
      else salesmanService.update(editingId, { fullName, mobileNumber });
      refresh(); reset(); setMessage(editingId === null ? "Salesman added." : "Salesman updated.");
    } catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to save salesman."); }
  };

  return <div className="page">
    <PageHeader title="Salesman Master" subtitle="Manage the people who prepare bills for this firm" />
    <div className="row g-4">
      <div className="col-xl-4"><section className="card p-3 p-lg-4 h-100">
        <div className="d-flex justify-content-between align-items-center mb-3"><h2 className="h5 mb-0">{editingId === null ? "Add Salesman" : "Edit Salesman"}</h2><span className="badge text-bg-light">{records.length}/5</span></div>
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        {message && <div className="alert alert-success py-2" role="status">{message}</div>}
        <label className="form-label" htmlFor="salesman-name">Full Name <span className="text-danger">*</span></label>
        <input id="salesman-name" className="form-control mb-3" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <label className="form-label" htmlFor="salesman-mobile">Mobile Number <span className="text-muted">(optional)</span></label>
        <input id="salesman-mobile" inputMode="numeric" maxLength={10} className="form-control mb-4" value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value.replace(/\D/g, "") })} placeholder="10 digit mobile number" />
        <div className="d-flex gap-2"><button type="button" className="btn btn-primary" onClick={submit} disabled={editingId === null && records.length >= 5}><i className="bi bi-check2 me-2" />{editingId === null ? "Add Salesman" : "Save Changes"}</button>{editingId !== null && <button type="button" className="btn btn-outline-secondary" onClick={reset}>Cancel</button>}</div>
        {records.length >= 5 && editingId === null && <small className="text-muted d-block mt-3">The maximum of 5 records has been reached. Edit existing records or set them inactive.</small>}
      </section></div>
      <div className="col-xl-8"><section className="card table-card">
        <div className="table-toolbar p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2"><label className="search mb-0 flex-grow-1" style={{ maxWidth: 430 }}><i className="bi bi-search" aria-hidden="true" /><span className="visually-hidden">Search salesmen</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or mobile" /></label><span className="muted">{filtered.length} records</span></div>
        <div className="table-responsive"><table className="table mb-0"><thead><tr><th>Full Name</th><th>Mobile</th><th>Status</th><th className="text-end">Actions</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id}><td className="fw-semibold">{record.fullName}</td><td>{record.mobileNumber || "—"}</td><td><Status value={record.isActive ? "Active" : "Inactive"} /></td><td className="text-end"><button type="button" className="btn btn-sm btn-light me-1" onClick={() => { setEditingId(record.id); setForm({ fullName: record.fullName, mobileNumber: record.mobileNumber }); setError(""); setMessage(""); }} aria-label={`Edit ${record.fullName}`}><i className="bi bi-pencil" /></button><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { salesmanService.update(record.id, { isActive: !record.isActive }); refresh(); }}><i className={`bi ${record.isActive ? "bi-person-dash" : "bi-person-check"} me-1`} />{record.isActive ? "Inactive" : "Active"}</button></td></tr>)}{filtered.length === 0 && <tr><td colSpan={4} className="text-center text-muted py-4">No salesman records found.</td></tr>}</tbody></table></div>
      </section></div>
    </div>
  </div>;
}
