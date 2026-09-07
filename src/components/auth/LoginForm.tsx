"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth/auth.service";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedIdentifier = String(formData.get("identifier") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "");
    setIdentifier(submittedIdentifier);
    setPassword(submittedPassword);
    if (!submittedIdentifier || !submittedPassword) {
      setError("Enter your email or mobile number and password.");
      return;
    }
    setSubmitting(true);
    try {
      const user = await authService.login({ identifier: submittedIdentifier, password: submittedPassword, rememberMe });
      if (!user) {
        setError("Invalid email/mobile or password.");
        return;
      }
      setError("");
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-wrap">
      <section className="card login-box" aria-labelledby="login-title">
        <div className="login-logo" aria-label="MediStores">
          <i className="bi bi-capsule-pill me-2" aria-hidden="true" />
          MediStores
        </div>
        <div className="text-center mt-2 mb-4">
          <h1 id="login-title" className="h4">Welcome back</h1>
          <p className="muted mb-0">Sign in to manage medical sales and inventory.</p>
        </div>
        {error && <div id="login-error" className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={submit} noValidate>
          <div className="mb-3">
              <label htmlFor="identifier" className="form-label">Email or mobile number</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              className="form-control"
              value={identifier}
              onChange={event => { setIdentifier(event.target.value); setError(""); }}
              placeholder="Enter email or mobile"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-group">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="form-control"
                value={password}
                onChange={event => { setPassword(event.target.value); setError(""); }}
                placeholder="Enter password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <label className="form-check d-flex align-items-center gap-2 mb-0">
              <input className="form-check-input mt-0" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />
              <span className="form-check-label">Remember Me</span>
            </label>
            <Link href="/forgot-password" className="small text-primary">Forgot Password?</Link>
          </div>
          <button type="submit" className="btn btn-brand w-100 py-2" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="login-demo-note mb-0 mt-4">New dealer or retailer? <Link href="/signup">Register here</Link>.</p>
      </section>
    </main>
  );
}
