import { NextResponse } from "next/server";
import { readUsers } from "@/lib/mock-user-store";

const AUTH_COOKIE = "medistores_auth";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string; rememberMe?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid login request." }, { status: 400 }); }
  const identifier = body.identifier?.trim().toLowerCase();
  const users = await readUsers();
  const user = users.find(candidate => (candidate.email.toLowerCase() === identifier || candidate.mobile === body.identifier?.trim()) && candidate.password === body.password);
  if (!user) return NextResponse.json({ message: "Invalid email/mobile or password." }, { status: 401 });
  const response = NextResponse.json({ username: user.ownerName, email: user.email, mobile: user.mobile });
  response.cookies.set(AUTH_COOKIE, user.email, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", ...(body.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
  return response;
}
