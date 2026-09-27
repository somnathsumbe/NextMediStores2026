import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import {
  buildDuplicateQuery,
  isValidEmail,
  isValidIndianMobile,
  isValidPincode,
  normalizeUserPayload,
  requireOwnerAccess,
} from "@/lib/user-management";

export const dynamic = "force-dynamic";

const collectionName = "users";

function getObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid user id.");
  return new ObjectId(id);
}

function validatePayload(payload: Record<string, unknown>) {
  const normalized = normalizeUserPayload(payload);
  const errors: string[] = [];

  if (!normalized.businessName) errors.push("Business name is required.");
  if (!normalized.ownerName) errors.push("Owner name is required.");
  if (!normalized.mobile || !isValidIndianMobile(normalized.mobile)) errors.push("Valid mobile number is required.");
  if (!normalized.email || !isValidEmail(normalized.email)) errors.push("Valid email is required.");
  if (!normalized.drugLicenseNumber) errors.push("Drug license number is required.");
  if (!normalized.gstNumber) errors.push("GST number is required.");
  if (!normalized.address) errors.push("Address is required.");
  if (!normalized.city) errors.push("City is required.");
  if (!normalized.state) errors.push("State is required.");
  if (!normalized.pincode || !isValidPincode(normalized.pincode)) errors.push("Valid pincode is required.");
  if (!normalized.role || !["OWNER", "DEALER", "RETAILER"].includes(normalized.role)) errors.push("Valid role is required.");

  return { normalized, errors };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOwnerAccess(_request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const db = await getMongoDb();
    const user = await db.collection(collectionName).findOne({ _id: getObjectId(params.id) });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: String(user._id),
        businessName: user.businessName,
        ownerName: user.ownerName,
        mobile: user.mobile,
        email: user.email,
        drugLicenseNumber: user.drugLicenseNumber,
        gstNumber: user.gstNumber,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        role: user.role,
        active: Boolean(user.active),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("User detail fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unable to fetch user.";
    return NextResponse.json({ error: message }, { status: /Invalid user id|not found/i.test(message) ? 404 : 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOwnerAccess(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid user update payload." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(collectionName);
    const current = await collection.findOne({ _id: getObjectId(params.id) });
    if (!current) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const nextPayload = { ...current, ...body } as Record<string, unknown>;
    const { normalized, errors } = validatePayload(nextPayload);
    if (errors.length) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    const email = normalized.email.toLowerCase();
    const mobile = normalized.mobile;
    const duplicate = await collection.findOne({
      _id: { $ne: current._id },
      $or: [
        { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { mobile: { $regex: `^${mobile.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { drugLicenseNumber: { $regex: `^${normalized.drugLicenseNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { gstNumber: { $regex: `^${normalized.gstNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
      ],
    });

    if (duplicate) {
      return NextResponse.json({ error: "Another user already exists with these credentials." }, { status: 409 });
    }

    const password = String((body as Record<string, unknown>).password ?? "").trim();
    const update: Record<string, unknown> = {
      ...normalized,
      email,
      active: typeof (body as Record<string, unknown>).active === "boolean" ? Boolean((body as Record<string, unknown>).active) : current.active,
      updatedAt: new Date().toISOString(),
    };

    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
      }
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    if (normalized.role === "OWNER") {
      const ownerCount = await collection.countDocuments({ role: "OWNER", active: true, _id: { $ne: current._id } });
      if (ownerCount === 0 && current.role !== "OWNER" && !Boolean((body as Record<string, unknown>).active)) {
        return NextResponse.json({ error: "At least one active OWNER account must remain." }, { status: 409 });
      }
    }

    if (current.role === "OWNER" && normalized.role !== "OWNER" && !Boolean((body as Record<string, unknown>).active)) {
      return NextResponse.json({ error: "OWNER role cannot be disabled through this flow." }, { status: 409 });
    }

    await collection.updateOne({ _id: current._id }, { $set: update });
    const updated = await collection.findOne({ _id: current._id });
    return NextResponse.json({ user: updated ? { ...updated, id: String(updated._id) } : null });
  } catch (error) {
    console.error("User update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update user.";
    return NextResponse.json({ error: message }, { status: /Invalid user id|not found|already exists|must remain/i.test(message) ? 404 : 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return PUT(request, { params });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireOwnerAccess(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const db = await getMongoDb();
    const collection = db.collection(collectionName);
    const current = await collection.findOne({ _id: getObjectId(params.id) });
    if (!current) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (current.role === "OWNER") {
      return NextResponse.json({ error: "OWNER accounts cannot be deleted. Use deactivate instead." }, { status: 409 });
    }

    await collection.updateOne({ _id: current._id }, { $set: { active: false, updatedAt: new Date().toISOString() } });
    return NextResponse.json({ success: true, message: "User deactivated successfully." });
  } catch (error) {
    console.error("User deactivate failed:", error);
    const message = error instanceof Error ? error.message : "Unable to deactivate user.";
    return NextResponse.json({ error: message }, { status: /Invalid user id|not found|deactivated|cannot be deleted/i.test(message) ? 409 : 500 });
  }
}
