"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RegistrationData } from "@/types/auth";

const initial: RegistrationData = { businessName: "", ownerName: "", mobile: "", email: "", password: "", confirmPassword: "", drugLicenseNumber: "", gstNumber: "", address: "", city: "", state: "", pincode: "", role: "retailer" };
export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  function update(name: keyof RegistrationData, value: string) { setForm(current => ({ ...current, [name]: value })); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); setError(""); setMessage(""); 
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          ownerName: form.ownerName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          drugLicenseNumber: form.drugLicenseNumber.trim(),
          gstNumber: form.gstNumber.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          role: form.role,
        }),
      });
      const data = await response.json().catch(() => ({} as { message?: string }));
      if (!response.ok) {
        throw new Error(data.message ?? "Registration failed.");
      }
      setMessage("Registration successful. Your account has been created.");
      window.setTimeout(() => router.push("/login"), 600);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "Registration failed.");
    } finally {
      setSaving(false);
    }
  }
  return <main className="login-wrap"><section className="card login-box" style={{ maxWidth: 760 }}><div className="login-logo"><i className="bi bi-capsule-pill me-2" />MediStores</div><h1 className="h4 mt-4">Dealer / Retailer Registration</h1>{error && <div className="alert alert-danger">{error}</div>}{message && <div className="alert alert-success">{message}</div>}<form onSubmit={submit} className="row g-3">{(["businessName", "ownerName", "mobile", "email", "drugLicenseNumber", "gstNumber", "address", "city", "state", "pincode"] as const).map(name => <div className={name === "address" ? "col-12" : "col-md-6"} key={name}><label className="form-label" htmlFor={name}>{name}</label><input id={name} className="form-control" value={form[name]} onChange={event => update(name, event.target.value)} required /></div>)}<div className="col-md-6"><label className="form-label" htmlFor="password">Password</label><input id="password" className="form-control" type="password" value={form.password} onChange={event => update("password", event.target.value)} required /></div><div className="col-md-6"><label className="form-label" htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" className="form-control" type="password" value={form.confirmPassword} onChange={event => update("confirmPassword", event.target.value)} required /></div><div className="col-md-6"><label className="form-label" htmlFor="role">Role</label><select id="role" className="form-select" value={form.role} onChange={event => update("role", event.target.value as RegistrationData["role"])}><option value="retailer">Retailer</option><option value="dealer">Dealer</option></select></div><div className="col-12"><button className="btn btn-brand w-100" disabled={saving}>{saving ? "Creating account..." : "Create account"}</button></div></form><Link href="/login" className="d-block text-center mt-3 text-primary small">Already registered? Sign in</Link></section></main>;
}
