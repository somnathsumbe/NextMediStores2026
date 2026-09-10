"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth/auth.service";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const nextIdentifier = String(data.get("identifier") ?? "").trim(); const nextPassword = String(data.get("password") ?? "");
    if (!nextIdentifier || !nextPassword) { setError("Enter your username or email and password."); return; }
    setSubmitting(true); setError("");
    try { await authService.login({ identifier: nextIdentifier, password: nextPassword, rememberMe }); router.replace("/dashboard"); router.refresh(); }
    catch (exception) { setError(exception instanceof Error ? exception.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  }
  return <main className="login-wrap"><section className="card login-box" aria-labelledby="login-title"><div className="login-logo"><i className="bi bi-capsule-pill me-2" aria-hidden="true" />MediStores</div><div className="text-center mt-2 mb-4"><h1 id="login-title" className="h4">Welcome back</h1><p className="muted mb-0">Sign in to manage medical sales and inventory.</p></div>{error && <div className="alert alert-danger" role="alert">{error}</div>}<form onSubmit={submit} noValidate><label className="form-label" htmlFor="identifier">Username or email</label><input id="identifier" name="identifier" className="form-control mb-3" value={identifier} onChange={event => setIdentifier(event.target.value)} required /><label className="form-label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="form-control mb-3" value={password} onChange={event => setPassword(event.target.value)} required /><label className="form-check mb-4"><input className="form-check-input" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /><span className="form-check-label">Remember Me</span></label><button className="btn btn-brand w-100" disabled={submitting}>{submitting ? "Signing in..." : "Sign In"}</button></form><p className="login-demo-note mb-0 mt-4">New dealer or retailer? <Link href="/signup">Register here</Link>.</p></section></main>;
}
