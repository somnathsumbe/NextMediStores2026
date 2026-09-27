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

export async function GET(request: Request) {
  try {
    const auth = await requireOwnerAccess(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Number(searchParams.get("limit") ?? "10");
    const search = String(searchParams.get("search") ?? "").trim();
    const role = String(searchParams.get("role") ?? "").trim();
    const status = searchParams.get("status");

    const skip = Number.isFinite(page) && page > 0 ? (page - 1) * limit : 0;
    const db = await getMongoDb();
    const collection = db.collection(collectionName);

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = { $in: [role.toUpperCase()] };
    if (status === "active") query.active = true;
    if (status === "inactive") query.active = false;

    const [records, total] = await Promise.all([
      collection.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(Math.max(1, limit)).toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      users: records.map((user) => ({
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
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
    });
  } catch (error) {
    console.error("User list fetch failed:", error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireOwnerAccess(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error.message }, { status: auth.error.status });
    }

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid user payload." }, { status: 400 });
    }

    const { normalized, errors } = validatePayload(payload as Record<string, unknown>);
    if (errors.length) {
      return NextResponse.json({ error: errors[0] }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection(collectionName);
    const email = normalized.email.toLowerCase();
    const mobile = normalized.mobile;

    const duplicate = await collection.findOne({
      $or: [
        { email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { mobile: { $regex: `^${mobile.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { drugLicenseNumber: { $regex: `^${normalized.drugLicenseNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
        { gstNumber: { $regex: `^${normalized.gstNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, $options: "i" } },
      ],
    });

    if (duplicate) {
      return NextResponse.json({ error: "A user with this email, mobile, GST number, or drug license already exists." }, { status: 409 });
    }

    const password = String((payload as Record<string, unknown>).password ?? "").trim();
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password is required and should be at least 8 characters long." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const record = {
      ...normalized,
      email,
      passwordHash,
      active: typeof payload.active === "boolean" ? payload.active : true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(record as Record<string, unknown>);
    const saved = await collection.findOne({ _id: result.insertedId });

    if (!saved) {
      return NextResponse.json({ error: "User record could not be created." }, { status: 500 });
    }

    return NextResponse.json({ user: { ...saved, id: String(saved._id) }, passwordHash: undefined }, { status: 201 });
  } catch (error) {
    console.error("User create failed:", error);
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}
