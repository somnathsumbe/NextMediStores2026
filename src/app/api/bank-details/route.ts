import { NextResponse } from "next/server";
import type { ObjectId, WithId } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "bankDetails";
const maharashtraCities = ["Ahilyanagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Dharashiv", "Wardha", "Washim", "Yavatmal"];
const defaultBanks = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Bank of Maharashtra", "Bank of India", "Canara Bank", "Union Bank of India", "Indian Bank", "Central Bank of India", "Punjab National Bank", "UCO Bank", "IDBI Bank", "Federal Bank", "IndusInd Bank", "Yes Bank", "Bandhan Bank", "AU Small Finance Bank", "RBL Bank"];

type BankStatus = "Active" | "Inactive";
type BankAccountType = "Savings" | "Current" | "OD" | "CC";
type BankMasterType = "party" | "bank" | "city";
type BankMaster = {
  _id?: ObjectId;
  type: "master";
  masterType: BankMasterType;
  value: string;
};
type BankRecord = {
  _id?: ObjectId;
  type?: "account";
  party: string;
  bankName: string;
  address: string;
  state: string;
  city: string;
  ifsc: string;
  accountNo: string;
  accountType?: BankAccountType;
  isDefault: boolean;
  status: BankStatus;
};

function normalizeRecord(body: Partial<BankRecord> & { masterType?: string; name?: string }) {
  const value = body && typeof body === "object" ? body : {};
  const accountType = value.accountType && ["Savings", "Current", "OD", "CC"].includes(value.accountType) ? value.accountType : undefined;
  const status: BankStatus = value.status === "Inactive" ? "Inactive" : "Active";
  const record: Partial<BankRecord> = {
    party: String(value.party ?? "").trim(),
    bankName: String(value.bankName ?? "").trim(),
    address: String(value.address ?? "").trim(),
    state: String(value.state ?? "Maharashtra").trim() || "Maharashtra",
    city: String(value.city ?? "").trim(),
    ifsc: String(value.ifsc ?? "").replace(/\s/g, "").toUpperCase(),
    accountNo: String(value.accountNo ?? "").replace(/\s/g, ""),
    accountType: accountType as BankAccountType | undefined,
    isDefault: Boolean(value.isDefault),
    status,
  };

  return record;
}

function validRecord(value: Partial<BankRecord>) {
  return Boolean(
    value.party &&
      value.bankName &&
      value.address &&
      value.address.trim().length >= 5 &&
      value.state &&
      value.city &&
      value.ifsc &&
      /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.ifsc) &&
      value.accountNo &&
      /^[0-9]{9,18}$/.test(value.accountNo),
  );
}

function serialize(record: WithId<BankRecord> | null) {
  if (!record) return null;
  const _id = record._id.toString();
  return {
    _id,
    id: _id,
    party: record.party,
    bankName: record.bankName,
    address: record.address,
    state: record.state,
    city: record.city,
    ifsc: record.ifsc,
    accountNo: record.accountNo,
    accountType: record.accountType,
    isDefault: record.isDefault,
    status: record.status,
  };
}

function buildStore(accountRecords: WithId<BankRecord>[], masterRecords: WithId<BankMaster>[]) {
  const parties = Array.from(new Set([...accountRecords.map((record) => record.party), ...masterRecords.filter((record) => record.masterType === "party").map((record) => record.value)].filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const banks = Array.from(new Set([...defaultBanks, ...accountRecords.map((record) => record.bankName), ...masterRecords.filter((record) => record.masterType === "bank").map((record) => record.value)].filter(Boolean))).sort((left, right) => left.localeCompare(right));
  const cities = Array.from(new Set([...maharashtraCities, ...accountRecords.map((record) => record.city), ...masterRecords.filter((record) => record.masterType === "city").map((record) => record.value)].filter(Boolean))).sort((left, right) => left.localeCompare(right));
  return {
    parties,
    banks,
    cities,
    records: accountRecords.map((record) => serialize(record)).filter(Boolean),
  };
}

export async function GET() {
  try {
    const collection = (await getMongoDb()).collection<BankRecord | BankMaster>(collectionName);
    const accountRecords = await collection.find({ $or: [{ type: { $exists: false } }, { type: "account" }] }).sort({ party: 1, bankName: 1 }).toArray();
    const masterRecords = await collection.find({ type: "master" }).toArray();
    return NextResponse.json(buildStore(accountRecords as WithId<BankRecord>[], masterRecords as WithId<BankMaster>[]));
  } catch (error) {
    console.error("Bank details fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unable to load bank details.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const masterType = body?.masterType;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const collection = (await getMongoDb()).collection<BankRecord | BankMaster>(collectionName);

    if (masterType && name) {
      const value = masterType as BankMasterType;
      if (value !== "party" && value !== "bank" && value !== "city") {
        return NextResponse.json({ error: "Invalid master type." }, { status: 400 });
      }
      const existing = await collection.findOne({ type: "master", masterType: value, value: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$`, "i") } });
      if (!existing) {
        await collection.insertOne({ type: "master", masterType: value, value: name } as BankMaster);
      }
      return NextResponse.json({ name, exists: Boolean(existing) });
    }

    const record = { type: "account" as const, ...normalizeRecord(body) };
    if (!validRecord(record)) {
      return NextResponse.json({ error: "Please enter valid bank details." }, { status: 400 });
    }

    const duplicate = await collection.findOne({
      type: { $ne: "master" },
      party: record.party,
      bankName: record.bankName,
      accountNo: record.accountNo,
    });

    if (duplicate) {
      return NextResponse.json({ error: "Bank account already exists for this Party." }, { status: 409 });
    }

    if (record.isDefault) {
      await collection.updateMany({ type: { $ne: "master" }, party: record.party }, { $set: { isDefault: false } });
    }

    const result = await collection.insertOne(record as BankRecord);
    const saved = await collection.findOne({ _id: result.insertedId });
    return NextResponse.json({ success: true, record: serialize(saved as WithId<BankRecord> | null) }, { status: 201 });
  } catch (error) {
    console.error("Bank details create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save bank details.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}