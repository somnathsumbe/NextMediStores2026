import { NextResponse } from "next/server";
import users from "@/data/users.json";
import type { User } from "@/models/user.model";

const AUTH_COOKIE = "medistores_auth";

export async function POST(request: Request) {
  let body: { identifier?: string; password?: string; rememberMe?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Invalid login request." }, { status: 400 }); }
  const identifier = body.identifier?.trim().toLowerCase() ?? "";
  const user = (users as User[]).find(candidate => candidate.username.toLowerCase() === identifier || candidate.email.toLowerCase() === identifier);
  if (!user || user.password !== body.password) return NextResponse.json({ message: "Invalid username or password." }, { status: 401 });
  if (!user.active) return NextResponse.json({ message: "Your account is inactive. Please contact the administrator." }, { status: 403 });
  const { password: _password, ...safeUser } = user;
  const response = NextResponse.json(safeUser);
  response.cookies.set(AUTH_COOKIE, String(user.id), { httpOnly: true, sameSite: "lax", secure: request.url.startsWith("https://"), path: "/", ...(body.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}) });
  return response;
}
