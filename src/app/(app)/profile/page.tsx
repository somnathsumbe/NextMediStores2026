"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { mockService } from "@/lib/mock-service";

type ProfileData = {
	fullName: string;
	businessName: string;
	mobile: string;
	email: string;
	address: string;
	city: string;
	state: string;
	pincode: string;
	accountType: "Dealer" | "Retailer";
	photo: string;
};

const emptyProfile: ProfileData = { fullName: "", businessName: "", mobile: "", email: "", address: "", city: "", state: "", pincode: "", accountType: "Retailer", photo: "" };

function getSignedInUser() {
	if (typeof window === "undefined") return null;
	for (const storage of [window.localStorage, window.sessionStorage]) {
		const raw = storage.getItem("medistores_user");
		if (raw) {
			try { return JSON.parse(raw) as { name?: string; email?: string; mobile?: string; role?: string; password?: string }; } catch { return null; }
		}
	}
	return null;
}

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "MS"; }

export default function Profile() {
	const [form, setForm] = useState<ProfileData>(emptyProfile);
	const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
	const [passwordOpen, setPasswordOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [passwordMessage, setPasswordMessage] = useState("");

	useEffect(() => {
		const user = getSignedInUser();
		const saved = mockService.get<ProfileData>("profile")[0];
		const defaults = { ...emptyProfile, fullName: user?.name ?? "Profile Owner", email: user?.email ?? "", mobile: user?.mobile ?? "", accountType: user?.role?.toLowerCase().includes("dealer") ? "Dealer" as const : "Retailer" as const };
		setForm({ ...defaults, ...saved });
	}, []);

	function update(field: keyof ProfileData, value: string) { setForm((current) => ({ ...current, [field]: value })); setMessage(""); }

	function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => update("photo", String(reader.result));
		reader.readAsDataURL(file);
	}

	function saveProfile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); mockService.replace("profile", [form]); setMessage("Profile changes saved successfully."); }

	function savePassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPasswordMessage("");
		const user = getSignedInUser();
		if (!user?.password || user.password !== passwords.current) { setPasswordMessage("Current password is incorrect."); return; }
		if (passwords.next.length < 8) { setPasswordMessage("New password must be at least 8 characters."); return; }
		if (passwords.next !== passwords.confirm) { setPasswordMessage("New password and confirmation must match."); return; }
		for (const storage of [window.localStorage, window.sessionStorage]) { const raw = storage.getItem("medistores_user"); if (raw) storage.setItem("medistores_user", JSON.stringify({ ...JSON.parse(raw), password: passwords.next })); }
		setPasswords({ current: "", next: "", confirm: "" }); setPasswordOpen(false); setMessage("Password changed successfully.");
	}

	return (
		<div className="page py-4">
			<div className="container-fluid px-2 px-lg-3">
				<header className="mb-4">
					<nav aria-label="breadcrumb"><ol className="breadcrumb mb-2 small"><li className="breadcrumb-item"><Link href="/dashboard" className="text-decoration-none">Home</Link></li><li className="breadcrumb-item active" aria-current="page">Profile</li></ol></nav>
					<h1 className="page-title mb-0">Profile</h1>
				</header>
				{message && <div className="alert alert-success" role="status">{message}</div>}
				<form onSubmit={saveProfile}>
					<section className="card p-3 p-md-4 mb-4" aria-labelledby="profile-details-title">
						<div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3 mb-4">
							{form.photo ? <img src={form.photo} alt="Profile" className="profile-photo" /> : <div className="profile-photo profile-initials">{initials(form.fullName)}</div>}
							<div><h2 id="profile-details-title" className="h5 mb-1">Profile Details</h2><label className="btn btn-outline-primary btn-sm" htmlFor="profile-photo"><i className="bi bi-camera me-2" aria-hidden="true" />Change Photo</label><input id="profile-photo" className="d-none" type="file" accept="image/*" onChange={choosePhoto} /></div>
						</div>
						<div className="row g-3">
							<ProfileField id="fullName" label="Full Name" value={form.fullName} onChange={(value) => update("fullName", value)} />
							<ProfileField id="businessName" label="Business / Shop Name" value={form.businessName} onChange={(value) => update("businessName", value)} />
							<ProfileField id="mobile" label="Mobile Number" value={form.mobile} type="tel" pattern="[0-9+() -]{10,}" onChange={(value) => update("mobile", value)} />
							<ProfileField id="email" label="Email" value={form.email} type="email" onChange={(value) => update("email", value)} />
							<div className="col-12"><label className="form-label" htmlFor="address">Address</label><textarea id="address" className="form-control" rows={2} value={form.address} onChange={(event) => update("address", event.target.value)} required /></div>
							<ProfileField id="city" label="City" value={form.city} onChange={(value) => update("city", value)} />
							<ProfileField id="state" label="State" value={form.state} onChange={(value) => update("state", value)} />
							<ProfileField id="pincode" label="Pincode" value={form.pincode} pattern="[0-9]{6}" maxLength={6} onChange={(value) => update("pincode", value)} />
							<div className="col-md-6"><label className="form-label" htmlFor="accountType">Account Type</label><select id="accountType" className="form-select" value={form.accountType} onChange={(event) => update("accountType", event.target.value)}><option>Dealer</option><option>Retailer</option></select></div>
						</div>
						<button type="submit" className="btn btn-brand mt-4"><i className="bi bi-check2 me-2" aria-hidden="true" />Save Changes</button>
					</section>
				</form>
				<section className="card p-3 p-md-4" aria-labelledby="security-title"><div className="d-flex align-items-center justify-content-between gap-3"><div><h2 id="security-title" className="h5 mb-1"><i className="bi bi-lock me-2" aria-hidden="true" />Security</h2><p className="text-secondary mb-0 small">Keep your account password up to date.</p></div><button type="button" className="btn btn-outline-primary" onClick={() => { setPasswordMessage(""); setPasswordOpen(true); }}>Change</button></div></section>
			</div>
			{passwordOpen && <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="password-modal-title" style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow"><form onSubmit={savePassword}><div className="modal-header"><h2 id="password-modal-title" className="modal-title h5">Change Password</h2><button type="button" className="btn-close" aria-label="Close" onClick={() => setPasswordOpen(false)} /></div><div className="modal-body">{passwordMessage && <div className="alert alert-danger py-2" role="alert">{passwordMessage}</div>}{(["current", "next", "confirm"] as const).map((field) => <div className="mb-3" key={field}><label className="form-label" htmlFor={`password-${field}`}>{field === "current" ? "Current Password" : field === "next" ? "New Password" : "Confirm Password"}</label><input id={`password-${field}`} type="password" className="form-control" value={passwords[field]} onChange={(event) => setPasswords((current) => ({ ...current, [field]: event.target.value }))} required minLength={field === "current" ? undefined : 8} /></div>)}</div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={() => setPasswordOpen(false)}>Cancel</button><button type="submit" className="btn btn-brand">Save Password</button></div></form></div></div></div>}
		</div>
	);
}

function ProfileField({ id, label, value, type = "text", pattern, maxLength, onChange }: { id: string; label: string; value: string; type?: string; pattern?: string; maxLength?: number; onChange: (value: string) => void }) {
	return <div className="col-md-6"><label className="form-label" htmlFor={id}>{label}</label><input id={id} className="form-control" type={type} value={value} pattern={pattern} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required /></div>;
}
