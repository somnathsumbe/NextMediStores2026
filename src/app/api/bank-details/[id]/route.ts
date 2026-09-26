import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "bankDetails";

type BankStatus = "Active" | "Inactive";
type BankAccountType = "Savings" | "Current" | "OD" | "CC";
type BankRecord = {
  _id?: ObjectId;
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

function serialize(record: BankRecord | null) {
  if (!record) return null;
  const _id = record._id?.toString?.() ?? "";
  if (!_id) return null;
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

function normalizeRecord(body: Partial<BankRecord>) {
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

function getObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid bank record id.");
  return new ObjectId(id);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const _id = getObjectId(params.id);
    const body = await request.json();
    const collection = (await getMongoDb()).collection<BankRecord>(collectionName);
    const current = await collection.findOne({ _id });

    if (!current) {
      return NextResponse.json({ error: "Bank details not found." }, { status: 404 });
    }

    if (body?.action === "default") {
      await collection.updateMany({ party: current.party }, { $set: { isDefault: false } });
      await collection.updateOne({ _id }, { $set: { isDefault: true } });
      const updated = await collection.findOne({ _id });
      return NextResponse.json({ success: true, record: serialize(updated) });
    }

    if (body?.action === "status") {
      const nextStatus = current.status === "Active" ? "Inactive" : "Active";
      await collection.updateOne({ _id }, { $set: { status: nextStatus } });
      const updated = await collection.findOne({ _id });
      return NextResponse.json({ success: true, record: serialize(updated) });
    }

    const payload = normalizeRecord({ ...current, ...body, ifsc: body?.ifsc ?? current.ifsc, accountNo: body?.accountNo ?? current.accountNo, state: body?.state ?? current.state, isDefault: body?.isDefault ?? current.isDefault, status: body?.status ?? current.status });

    if (!validRecord(payload)) {
      return NextResponse.json({ error: "Please enter valid bank details." }, { status: 400 });
    }

    const duplicate = await collection.findOne({
      party: payload.party,
      bankName: payload.bankName,
      accountNo: payload.accountNo,
      _id: { $ne: _id },
    });

    if (duplicate) {
      return NextResponse.json({ error: "Bank account already exists for this Party." }, { status: 409 });
    }

    if (payload.isDefault) {
      await collection.updateMany({ party: payload.party, _id: { $ne: _id } }, { $set: { isDefault: false } });
    }

    const { _id: _ignored, ...rest } = { ...current, ...payload, _id } as BankRecord;
    await collection.updateOne({ _id }, { $set: rest });
    const updated = await collection.findOne({ _id });
    return NextResponse.json({ success: true, record: serialize(updated) });
  } catch (error) {
    console.error("Bank details update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update bank details.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message)
      ? 503
      : message.includes("already exists")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return PUT(request, { params });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const _id = getObjectId(params.id);
    const result = await (await getMongoDb()).collection<BankRecord>(collectionName).deleteOne({ _id });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Bank details not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bank details delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete bank details.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}