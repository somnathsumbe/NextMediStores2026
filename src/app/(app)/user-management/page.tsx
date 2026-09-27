"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";

type UserRole = "OWNER" | "DEALER" | "RETAILER";
type UserStatus = "Active" | "Inactive";

type UserRecord = {
  id: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  drugLicenseNumber: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FormState = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  password: string;
  drugLicenseNumber: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  role: UserRole;
  active: boolean;
};

const emptyForm: FormState = {
  businessName: "",
  ownerName: "",
  mobile: "",
  email: "",
  password: "",
  drugLicenseNumber: "",
  gstNumber: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  role: "RETAILER",
  active: true,
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to process your request.");
  }

  return payload as T;
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "MS";
}

export default function UserManagementPage() {
  const [records, setRecords] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<UserRecord | null>(null);

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !text || [record.businessName, record.ownerName, record.email, record.mobile, record.gstNumber, record.city].join(" ").toLowerCase().includes(text);
      const matchesRole = role === "all" || record.role === role;
      const matchesStatus = status === "all" || (status === "active" ? record.active : !record.active);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [records, query, role, status]);

  async function loadUsers() {
    setLoading(true);
    try {
      const payload = await fetchJson<{ users?: UserRecord[] }>('/api/users');
      setRecords((payload.users ?? []).map((user) => ({ ...user, role: user.role || "RETAILER", active: Boolean(user.active) })));
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load users." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function validateForm(payload: FormState) {
    if (!payload.businessName.trim()) return "Business name is required.";
    if (!payload.ownerName.trim()) return "Owner name is required.";
    if (!/^\d{10}$/.test(payload.mobile.trim())) return "Mobile number must be 10 digits.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) return "Valid email is required.";
    if (!payload.drugLicenseNumber.trim()) return "Drug license number is required.";
    if (!payload.gstNumber.trim()) return "GST number is required.";
    if (!payload.address.trim()) return "Address is required.";
    if (!payload.city.trim()) return "City is required.";
    if (!payload.state.trim()) return "State is required.";
    if (!/^\d{6}$/.test(payload.pincode.trim())) return "Pincode must be 6 digits.";
    if (!payload.role) return "Role is required.";
    if (!editingId && payload.password.trim().length < 8) return "Password must be at least 8 characters.";
    return "";
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    const error = validateForm(form);
    if (error) {
      setToast({ type: "error", message: error });
      return;
    }

    const payload = { ...form, email: form.email.trim().toLowerCase(), password: form.password.trim() };
    try {
      if (editingId) {
        const requestBody = { ...payload, password: payload.password || undefined };
        await fetchJson(`/api/users/${editingId}`, { method: "PUT", body: JSON.stringify(requestBody) });
        setToast({ type: "success", message: "User updated successfully." });
      } else {
        await fetchJson('/api/users', { method: "POST", body: JSON.stringify(payload) });
        setToast({ type: "success", message: "User added successfully." });
      }
      resetForm();
      await loadUsers();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to save user." });
    }
  }

  async function toggleStatus(user: UserRecord) {
    try {
      await fetchJson(`/api/users/${user.id}`, { method: "PUT", body: JSON.stringify({ ...user, active: !user.active }) });
      setToast({ type: "success", message: `${user.ownerName} marked ${!user.active ? "active" : "inactive"}.` });
      await loadUsers();
    } catch (error) {
      setToast({ type: "error", message: error instanceof Error ? error.message : "Unable to update status." });
    }
  }

  function editUser(user: UserRecord) {
    setEditingId(user.id);
    setForm({
      businessName: user.businessName,
      ownerName: user.ownerName,
      mobile: user.mobile,
      email: user.email,
      password: "",
      drugLicenseNumber: user.drugLicenseNumber,
      gstNumber: user.gstNumber,
      address: user.address,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      role: user.role,
      active: user.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page py-4">
      <div className="container-fluid px-2 px-lg-3">
        <PageHeader title="User Management" subtitle="Owner-only access to manage users in the main medistores users collection." />
        {toast && <div className={`alert alert-${toast.type === "success" ? "success" : "danger"}`} role="status">{toast.message}</div>}

        <section className="card p-3 p-md-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">{editingId ? "Edit User" : "Add New User"}</h2>
            {editingId && <button type="button" className="btn btn-light btn-sm" onClick={resetForm}>Cancel edit</button>}
          </div>
          <form onSubmit={submitForm} className="row g-3">
            <div className="col-md-4"><label className="form-label">Business Name</label><input className="form-control" value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Owner Name</label><input className="form-control" value={form.ownerName} onChange={(e) => updateField("ownerName", e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={(e) => updateField("role", e.target.value as UserRole)}><option value="OWNER">OWNER</option><option value="DEALER">DEALER</option><option value="RETAILER">RETAILER</option></select></div>
            <div className="col-md-4"><label className="form-label">Mobile</label><input className="form-control" value={form.mobile} onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} /></div>
            <div className="col-md-4"><label className="form-label">Email</label><input type="email" className="form-control" value={form.email} onChange={(e) => updateField("email", e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Password {editingId ? "(Leave blank to keep unchanged)" : ""}</label><input type="password" className="form-control" value={form.password} onChange={(e) => updateField("password", e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">Drug License</label><input className="form-control" value={form.drugLicenseNumber} onChange={(e) => updateField("drugLicenseNumber", e.target.value)} /></div>
            <div className="col-md-4"><label className="form-label">GST Number</label><input className="form-control" value={form.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())} /></div>
            <div className="col-md-4"><label className="form-label">Pincode</label><input className="form-control" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
            <div className="col-md-6"><label className="form-label">Address</label><input className="form-control" value={form.address} onChange={(e) => updateField("address", e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={(e) => updateField("city", e.target.value)} /></div>
            <div className="col-md-3"><label className="form-label">State</label><input className="form-control" value={form.state} onChange={(e) => updateField("state", e.target.value)} /></div>
            <div className="col-md-2"><label className="form-label">Status</label><select className="form-select" value={form.active ? "active" : "inactive"} onChange={(e) => updateField("active", e.target.value === "active")}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
            <div className="col-12 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light" onClick={resetForm}>Reset</button>
              <button type="submit" className="btn btn-brand">{editingId ? "Save Changes" : "Add User"}</button>
            </div>
          </form>
        </section>

        <section className="card table-card">
          <div className="table-toolbar p-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex flex-wrap gap-2 flex-grow-1" style={{ maxWidth: 700 }}>
              <input className="form-control" placeholder="Search business, owner, email, mobile, city..." value={query} onChange={(e) => setQuery(e.target.value)} />
              <select className="form-select" style={{ maxWidth: 140 }} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">All roles</option>
                <option value="OWNER">OWNER</option>
                <option value="DEALER">DEALER</option>
                <option value="RETAILER">RETAILER</option>
              </select>
              <select className="form-select" style={{ maxWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <span className="muted">{filtered.length} user(s)</span>
          </div>

          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4 muted">Loading users...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-4 muted">No users found for the selected filters.</td></tr>
                ) : (
                  filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="avatar-sm rounded-circle bg-primary-subtle text-primary fw-bold">{getInitials(user.ownerName || user.businessName)}</div>
                          <div>
                            <div className="fw-semibold">{user.ownerName}</div>
                            <small className="text-muted">{user.businessName}</small>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge-soft badge-primary">{user.role}</span></td>
                      <td>{user.email}</td>
                      <td>{user.mobile}</td>
                      <td><span className={`badge-soft ${user.active ? "badge-success" : "badge-danger"}`}>{user.active ? "Active" : "Inactive"}</span></td>
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          <button type="button" className="btn btn-sm btn-light" onClick={() => setViewing(user)}>View</button>
                          <button type="button" className="btn btn-sm btn-light" onClick={() => editUser(user)}>Edit</button>
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void toggleStatus(user)}>{user.active ? "Deactivate" : "Activate"}</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {viewing && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setViewing(null)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h2 className="modal-title h5">{viewing.businessName}</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setViewing(null)} />
              </div>
              <div className="modal-body row g-3">
                <div className="col-md-6"><span className="text-muted d-block small">Owner</span><strong>{viewing.ownerName}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Role</span><strong>{viewing.role}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Email</span><strong>{viewing.email}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Mobile</span><strong>{viewing.mobile}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Drug License</span><strong>{viewing.drugLicenseNumber}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">GST Number</span><strong>{viewing.gstNumber}</strong></div>
                <div className="col-md-12"><span className="text-muted d-block small">Address</span><strong>{viewing.address}, {viewing.city}, {viewing.state} - {viewing.pincode}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Status</span><strong>{viewing.active ? "Active" : "Inactive"}</strong></div>
                <div className="col-md-6"><span className="text-muted d-block small">Updated</span><strong>{viewing.updatedAt ? new Date(viewing.updatedAt).toLocaleString("en-IN") : "—"}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
