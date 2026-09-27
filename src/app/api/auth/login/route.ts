import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getMongoDb } from "@/lib/mongodb";

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

    const normalizedIdentifier = identifier.toLowerCase();

    const database = await getMongoDb();
    const users = database.collection("users");
    const user = await users.findOne({ email: normalizedIdentifier });

    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ success: false, message: "Your account is inactive. Please contact the administrator." }, { status: 403 });
    }

    const passwordHash = typeof user.passwordHash === "string" ? user.passwordHash : "";
    if (!passwordHash || !/^\$2[aby]\$/.test(passwordHash)) {
      return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, passwordHash);

    if (!validPassword) {
      return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
    }

    const safeUser = {
      id: String(user._id),
      businessName: user.businessName,
      ownerName: user.ownerName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    });

    response.cookies.set("medistores_auth", String(user._id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...(body.rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
    });

    return response;
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ success: false, message: "Unable to connect to the server. Please try again." }, { status: 500 });
  }
}
