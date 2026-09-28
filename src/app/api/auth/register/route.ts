import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getMongoDb } from "@/lib/mongodb";

function toAlphaNumeric(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join("-")
    .slice(0, 32) || "dealer";
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ message: "Invalid registration request." }, { status: 400 });
    }

    const data = payload as {
      businessName?: string;
      ownerName?: string;
      mobile?: string;
      email?: string;
      username?: string;
      password?: string;
      confirmPassword?: string;
      drugLicenseNumber?: string;
      gstNumber?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      role?: string;
    };

    const requiredFields = [
      "businessName",
      "ownerName",
      "mobile",
      "email",
      "password",
      "drugLicenseNumber",
      "gstNumber",
      "address",
      "city",
      "state",
      "pincode",
      "role",
    ] as const;

    const missing = requiredFields.some((field) => !String(data[field] ?? "").trim());
    if (missing || !data.password || data.password.length < 8) {
      return NextResponse.json({ message: "Please complete all fields and use a password with at least 8 characters." }, { status: 400 });
    }

    if (data.password !== data.confirmPassword) {
      return NextResponse.json({ message: "Passwords do not match." }, { status: 400 });
    }

    const businessName = String(data.businessName ?? "").trim();
    const ownerName = String(data.ownerName ?? "").trim();
    const mobile = String(data.mobile ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    const requestedUsername = String(data.username ?? "").trim().toLowerCase();
    const drugLicenseNumber = String(data.drugLicenseNumber ?? "").trim();
    const gstNumber = String(data.gstNumber ?? "").trim();
    const address = String(data.address ?? "").trim();
    const city = String(data.city ?? "").trim();
    const state = String(data.state ?? "").trim();
    const pincode = String(data.pincode ?? "").trim();
    const role = ["dealer", "retailer"].includes(String(data.role ?? "").toLowerCase()) ? String(data.role).toLowerCase() : "retailer";

    if (!businessName || !ownerName || !mobile || !email || !address || !city || !state || !pincode || !drugLicenseNumber || !gstNumber) {
      return NextResponse.json({ message: "Please complete all required registration fields." }, { status: 400 });
    }

    const database = await getMongoDb();
    const users = database.collection("users");

    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingUser = await users.findOne({
      $or: [
        { email: { $regex: `^${escapeRegex(email)}$`, $options: "i" } },
        { mobile: { $regex: `^${escapeRegex(mobile)}$`, $options: "i" } },
        ...(requestedUsername ? [{ username: { $regex: `^${escapeRegex(requestedUsername)}$`, $options: "i" } }] : []),
      ],
    });

    if (existingUser) {
      return NextResponse.json({ message: "An account already exists with this email, username, or mobile number." }, { status: 409 });
    }

    const baseUsername = requestedUsername || toAlphaNumeric(ownerName || businessName || email.split("@")[0]);
    let username = baseUsername;
    let usernameSuffix = 1;
    while (await users.findOne({ username: { $regex: `^${escapeRegex(username)}$`, $options: "i" } })) {
      if (requestedUsername) {
        return NextResponse.json({ message: "That username is already in use." }, { status: 409 });
      }
      username = `${baseUsername}-${usernameSuffix}`;
      usernameSuffix += 1;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const createdAt = new Date().toISOString();

    const result = await users.insertOne({
      username,
      email,
      passwordHash,
      name: ownerName,
      businessName,
      ownerName,
      mobile,
      drugLicenseNumber,
      gstNumber,
      address,
      city,
      state,
      pincode,
      role,
      active: true,
      createdAt,
      updatedAt: createdAt,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        user: {
          id: String(result.insertedId),
          name: ownerName,
          ownerName,
          businessName,
          username,
          email,
          mobile,
          role: role.toUpperCase(),
          active: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ message: "Unable to create your account right now. Please try again." }, { status: 500 });
  }
}
