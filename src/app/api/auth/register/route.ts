import { NextResponse } from "next/server";
import { readUsers, writeUsers } from "@/lib/mock-user-store";
import type { RegistrationData } from "@/types/auth";

export async function POST(request: Request) {
  let data: RegistrationData;
  try { data = await request.json() as RegistrationData; } catch { return NextResponse.json({ message: "Invalid registration request." }, { status: 400 }); }
  const required = ["businessName", "ownerName", "mobile", "email", "password", "drugLicenseNumber", "gstNumber", "address", "city", "state", "pincode", "role"] as const;
  if (required.some(field => !String(data[field] ?? "").trim()) || data.password !== data.confirmPassword) return NextResponse.json({ message: "Please complete all fields and make sure passwords match." }, { status: 400 });
  const users = await readUsers(); const email = data.email.trim().toLowerCase(); const mobile = data.mobile.trim();
  if (users.some(user => user.email.toLowerCase() === email || user.mobile === mobile)) return NextResponse.json({ message: "An account already exists with this email or mobile." }, { status: 409 });
  const { confirmPassword: _confirmPassword, ...user } = data;
  users.push({ ...user, email, mobile, createdAt: new Date().toISOString() }); await writeUsers(users);
  return NextResponse.json({ message: "Registration successful." }, { status: 201 });
}