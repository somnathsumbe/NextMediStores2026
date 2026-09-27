import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export type UserRole = "OWNER" | "DEALER" | "RETAILER";

export type UserRecord = {
  _id?: string | ObjectId;
  id?: string;
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  drugLicenseNumber: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  role: UserRole;
  active: boolean;
  passwordHash?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function normalizeRole(value: string): UserRole {
  const next = String(value ?? "").trim().toUpperCase();
  if (next === "OWNER") return "OWNER";
  if (next === "DEALER") return "DEALER";
  if (next === "RETAILER") return "RETAILER";
  return "RETAILER";
}

export function sanitizeUser(record: Record<string, unknown> | null | undefined) {
  if (!record) return null;
  const user = { ...record } as Record<string, unknown>;
  delete user.password;
  delete user.passwordHash;
  delete user.confirmPassword;
  delete user.jwt;
  delete user.token;

  return {
    id: String(user._id ?? user.id ?? ""),
    businessName: String(user.businessName ?? ""),
    ownerName: String(user.ownerName ?? ""),
    mobile: String(user.mobile ?? ""),
    email: String(user.email ?? ""),
    drugLicenseNumber: String(user.drugLicenseNumber ?? ""),
    gstNumber: String(user.gstNumber ?? ""),
    address: String(user.address ?? ""),
    city: String(user.city ?? ""),
    state: String(user.state ?? ""),
    pincode: String(user.pincode ?? ""),
    role: normalizeRole(String(user.role ?? "")),
    active: Boolean(user.active),
    createdAt: user.createdAt ? String(user.createdAt) : undefined,
    updatedAt: user.updatedAt ? String(user.updatedAt) : undefined,
  };
}

export async function requireOwnerAccess(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("medistores_auth="));
  const sessionValue = cookieMatch ? decodeURIComponent(cookieMatch.split("=").slice(1).join("=")) : "";

  if (!sessionValue) {
    return { user: null, error: { status: 401, message: "Unauthorized" } };
  }

  const db = await getMongoDb();
  const users = db.collection("users");
  const user = ObjectId.isValid(sessionValue)
    ? await users.findOne({ _id: new ObjectId(sessionValue) })
    : null;

  if (!user) {
    return { user: null, error: { status: 401, message: "Unauthorized" } };
  }

  if (user.active === false) {
    return { user: null, error: { status: 403, message: "Your account is inactive." } };
  }

  if (normalizeRole(String(user.role ?? "")) !== "OWNER") {
    return { user: null, error: { status: 403, message: "Access denied. OWNER role required." } };
  }

  return { user: sanitizeUser(user), error: null };
}

export function parsePageValue(value: string | null | undefined, fallback = 1) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

export function parseLimitValue(value: string | null | undefined, fallback = 10) {
  const next = Number(value ?? fallback);
  if (!Number.isFinite(next)) return fallback;
  return next === 10 || next === 25 || next === 50 ? next : fallback;
}

export function normalizeEmail(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeString(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidIndianMobile(value: string) {
  return /^[6-9]\d{9}$/.test(value);
}

export function isValidPincode(value: string) {
  return /^[1-9]\d{5}$/.test(value);
}

export function buildDuplicateQuery(fields: Record<string, string>) {
  return {
    $or: Object.entries(fields)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({ [key]: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, "i") })),
  };
}

export function normalizeUserPayload(input: Record<string, unknown>) {
  return {
    businessName: normalizeString((input.businessName as string | undefined)),
    ownerName: normalizeString((input.ownerName as string | undefined)),
    mobile: normalizeString((input.mobile as string | undefined)),
    email: normalizeEmail(String(input.email ?? "")),
    drugLicenseNumber: normalizeString((input.drugLicenseNumber as string | undefined)).toUpperCase(),
    gstNumber: normalizeString((input.gstNumber as string | undefined)).toUpperCase(),
    address: normalizeString((input.address as string | undefined)),
    city: normalizeString((input.city as string | undefined)),
    state: normalizeString((input.state as string | undefined)),
    pincode: normalizeString((input.pincode as string | undefined)),
    role: normalizeRole(String(input.role ?? "")).toUpperCase(),
    active: Boolean(input.active),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : undefined,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : undefined,
  };
}
