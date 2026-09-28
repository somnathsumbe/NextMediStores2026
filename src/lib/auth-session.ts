import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { SessionUser } from "@/models/user.model";

export function toSessionUser(user: Record<string, unknown>): SessionUser {
  return {
    id: String(user._id ?? user.id ?? ""),
    name: String(user.name || user.ownerName || ""),
    ownerName: String(user.ownerName || user.name || ""),
    username: String(user.username ?? ""),
    email: String(user.email ?? ""),
    businessName: String(user.businessName ?? ""),
    mobile: String(user.mobile ?? ""),
    role: String(user.role ?? "USER").toUpperCase(),
    active: true,
    address: String(user.address ?? ""),
    city: String(user.city ?? ""),
    state: String(user.state ?? ""),
    pincode: String(user.pincode ?? ""),
  };
}

export async function getAuthenticatedUser(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("medistores_auth="));
  const rawId = cookie?.slice("medistores_auth=".length);
  if (!rawId) return null;

  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return null;
  }
  if (!ObjectId.isValid(id)) return null;

  const database = await getMongoDb();
  const user = await database.collection("users").findOne({ _id: new ObjectId(id) });
  if (!user || user.active !== true) return null;
  return { record: user, user: toSessionUser(user) };
}