"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth/auth.service";
import type { RegistrationData } from "@/types/auth";

const fields: Array<[keyof RegistrationData, string, string]> = [
	["businessName", "Business / Shop Name", "text"], ["ownerName", "Owner / Contact Person", "text"],
	["mobile", "Mobile Number", "tel"], ["email", "Email", "email"], ["drugLicenseNumber", "Drug License Number", "text"],
	["gstNumber", "GST Number", "text"], ["address", "Address", "text"], ["city", "City", "text"],
	["state", "State", "text"], ["pincode", "Pincode", "text"],
];
const initial: RegistrationData = { businessName: "", ownerName: "", mobile: "", email: "", password: "", confirmPassword: "", drugLicenseNumber: "", gstNumber: "", address: "", city: "", state: "", pincode: "", role: "retailer" };

export default function Page() {
	const [form, setForm] = useState(initial); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [saving, setSaving] = useState(false);
	function update(name: keyof RegistrationData, value: string) { setForm(current => ({ ...current, [name]: value })); setError(""); }
	async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; } setSaving(true); const result = await authService.register(form); setSaving(false); if (!result.ok) { setError(result.message ?? "Registration failed."); return; } setSuccess("Registration successful. You can now sign in."); }
	return <main className="login-wrap"><section className="card login-box" style={{ maxWidth: 760 }}><div className="login-logo"><i className="bi bi-capsule-pill me-2" aria-hidden="true" />MediStores</div><h1 className="h4 mt-4">Dealer / Retailer Registration</h1><p className="muted">Create your account to manage medical sales and inventory.</p>{error && <div className="alert alert-danger" role="alert">{error}</div>}{success && <div className="alert alert-success" role="alert">{success}</div>}<form onSubmit={submit} noValidate><div className="row g-3">{fields.map(([name, label, type]) => <div className={name === "address" ? "col-12" : "col-md-6"} key={name}><label className="form-label" htmlFor={name}>{label}</label><input id={name} className="form-control" type={type} value={String(form[name])} onChange={event => update(name, event.target.value)} required /></div>)}<div className="col-md-6"><label className="form-label" htmlFor="password">Password</label><input id="password" className="form-control" type="password" value={form.password} onChange={event => update("password", event.target.value)} required /></div><div className="col-md-6"><label className="form-label" htmlFor="confirmPassword">Confirm Password</label><input id="confirmPassword" className="form-control" type="password" value={form.confirmPassword} onChange={event => update("confirmPassword", event.target.value)} required /></div><div className="col-md-6"><label className="form-label" htmlFor="role">Role</label><select id="role" className="form-select" value={form.role} onChange={event => update("role", event.target.value)}><option value="retailer">Retailer</option><option value="dealer">Dealer</option></select></div></div><button className="btn btn-brand w-100 mt-4" disabled={saving}>{saving ? "Creating account..." : "Create account"}</button></form><Link href="/" className="d-block text-center mt-3 text-primary small">Already registered? Sign in</Link></section></main>;
}
