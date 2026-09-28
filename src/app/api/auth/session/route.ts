import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getAuthenticatedUser } from "@/lib/auth-session";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser(request);
    if (!session) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: session.user });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return NextResponse.json({ message: "Unable to verify the MongoDB session." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthenticatedUser(request);
    if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") return NextResponse.json({ message: "Invalid profile details." }, { status: 400 });
    const input = payload as Record<string, unknown>;
    const name = String(input.name ?? "").trim();
    const ownerName = String(input.ownerName ?? "").trim();
    const businessName = String(input.businessName ?? "").trim();
    const mobile = String(input.mobile ?? "").trim();
    const email = String(input.email ?? "").trim().toLowerCase();
    const address = String(input.address ?? "").trim();
    const city = String(input.city ?? "").trim();
    const state = String(input.state ?? "").trim();
    const pincode = String(input.pincode ?? "").trim();
    if (!name || !ownerName || !businessName || !mobile || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !address || !city || !state || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json({ message: "Complete all profile fields with valid contact details." }, { status: 400 });
    }

    const database = await getMongoDb();
    const users = database.collection("users");
    const duplicate = await users.findOne({ _id: { $ne: new ObjectId(session.user.id) }, $or: [{ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }, { mobile }] });
    if (duplicate) return NextResponse.json({ message: "That email or mobile number is already in use." }, { status: 409 });

    await users.updateOne({ _id: new ObjectId(session.user.id) }, { $set: { name, ownerName, businessName, mobile, email, address, city, state, pincode, updatedAt: new Date().toISOString() } });
    return NextResponse.json({ user: { ...session.user, name, ownerName, businessName, mobile, email, address, city, state, pincode } });
  } catch (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json({ message: "Unable to update your MongoDB profile." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthenticatedUser(request);
    if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const payload = await request.json().catch(() => null) as { currentPassword?: string; newPassword?: string } | null;
    if (!payload?.currentPassword || !payload.newPassword || payload.newPassword.length < 8) {
      return NextResponse.json({ message: "Enter your current password and a new password with at least 8 characters." }, { status: 400 });
    }
    const passwordHash = typeof session.record.passwordHash === "string" ? session.record.passwordHash : "";
    if (!/^\$2[aby]\$/.test(passwordHash) || !await bcrypt.compare(payload.currentPassword, passwordHash)) {
      return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 });
    }
    const database = await getMongoDb();
    await database.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: { passwordHash: await bcrypt.hash(payload.newPassword, 10), updatedAt: new Date().toISOString() } },
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change failed:", error);
    return NextResponse.json({ message: "Unable to update your password." }, { status: 503 });
  }
}