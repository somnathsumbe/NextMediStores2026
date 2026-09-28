import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getMongoDb } from "@/lib/mongodb";
import { toSessionUser } from "@/lib/auth-session";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUserByIdentifier(identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const database = await getMongoDb();
  return database.collection("users").findOne({
    $or: [
      { email: { $regex: `^${escapeRegex(normalizedIdentifier)}$`, $options: "i" } },
      { username: { $regex: `^${escapeRegex(normalizedIdentifier)}$`, $options: "i" } },
    ],
  });
}

export async function POST(request: Request) {
  try {
    let body: { identifier?: string; password?: string; rememberMe?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid login request." }, { status: 400 });
    }

    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");

    if (!identifier || !password) {
      return NextResponse.json({ success: false, message: "Email and password are required." }, { status: 400 });
    }

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
    }

    if (user.active !== true) {
      return NextResponse.json({ success: false, message: "Your account is inactive. Please contact the administrator." }, { status: 403 });
    }

    const passwordHash = typeof user.passwordHash === "string" ? user.passwordHash : "";
    if (!/^\$2[aby]\$/.test(passwordHash) || !await bcrypt.compare(password, passwordHash)) {
      return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
    }

    const safeUser = toSessionUser(user);

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });

    response.cookies.set("medistores_auth", String(safeUser.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...(body.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ success: false, message: "Unable to authenticate with MongoDB. Please try again." }, { status: 503 });
  }
}
