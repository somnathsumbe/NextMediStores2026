import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "parties";

type CustomerType = "Dealer" | "Retailer" | "Supplier" | "Other";
type OpeningBalanceType = "Debit" | "Credit";

type PartyRecord = {
  _id?: ObjectId;
  firmName: string;
  ownerName: string;
  pharmacistName: string;
  customerType: CustomerType;
  active: boolean;
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  drugLicenceNumber: string;
  drugLicenceExpiry: string;
  foodLicenceNo: string;
  registeredGSTN: boolean;
  gstnNumber: string;
  scheme: string;
  discount: number;
  paymentTerms: string;
  creditLimit: number;
  openingBalance: number;
  openingBalanceType: OpeningBalanceType;
  closingBalance: number;
  outstandingBalance: number;
  creditLocked: boolean;
  contactPerson: string;
  whatsappNumber: string;
  notes: string;
};

function normalizeParty(body: unknown): PartyRecord {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const registeredGSTN = Boolean(value.registeredGSTN);
  const customerType = value.customerType === "Retailer" || value.customerType === "Supplier" || value.customerType === "Other" ? (value.customerType as CustomerType) : "Dealer";

  return {
    firmName: String(value.firmName ?? "").trim(),
    ownerName: String(value.ownerName ?? "").trim(),
    pharmacistName: String(value.pharmacistName ?? "").trim(),
    customerType,
    active: Boolean(value.active),
    email: String(value.email ?? "").trim(),
    phone: String(value.phone ?? "").trim(),
    alternatePhone: String(value.alternatePhone ?? "").trim(),
    address: String(value.address ?? "").trim(),
    city: String(value.city ?? "").trim(),
    state: String(value.state ?? "Maharashtra").trim() || "Maharashtra",
    pincode: String(value.pincode ?? "").trim(),
    drugLicenceNumber: String(value.drugLicenceNumber ?? "").trim(),
    drugLicenceExpiry: String(value.drugLicenceExpiry ?? "").trim(),
    foodLicenceNo: String(value.foodLicenceNo ?? "").trim(),
    registeredGSTN,
    gstnNumber: registeredGSTN ? String(value.gstnNumber ?? "").trim().toUpperCase() : "",
    scheme: String(value.scheme ?? "").trim(),
    discount: Number(value.discount ?? 0),
    paymentTerms: String(value.paymentTerms ?? "Cash").trim() || "Cash",
    creditLimit: Number(value.creditLimit ?? 0),
    openingBalance: Number(value.openingBalance ?? 0),
    openingBalanceType: value.openingBalanceType === "Credit" ? "Credit" : "Debit",
    closingBalance: Number(value.closingBalance ?? value.openingBalance ?? 0),
    outstandingBalance: Number(value.outstandingBalance ?? value.openingBalance ?? 0),
    creditLocked: Boolean(value.creditLocked),
    contactPerson: String(value.contactPerson ?? "").trim(),
    whatsappNumber: String(value.whatsappNumber ?? "").trim(),
    notes: String(value.notes ?? "").trim(),
  };
}

function validParty(value: Partial<PartyRecord>) {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value.email ?? ""));
  const phone = /^[6-9]\d{9}$/.test(String(value.phone ?? ""));
  const alternate = !String(value.alternatePhone ?? "") || /^\d{10}$/.test(String(value.alternatePhone ?? ""));
  const whatsapp = !String(value.whatsappNumber ?? "") || /^\d{10}$/.test(String(value.whatsappNumber ?? ""));
  const gstn = !value.registeredGSTN || /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(value.gstnNumber ?? ""));
  const pin = /^[1-9]\d{5}$/.test(String(value.pincode ?? ""));

  return Boolean(
    value.firmName &&
      value.ownerName &&
      value.pharmacistName &&
      value.address &&
      value.city &&
      value.state &&
      value.drugLicenceNumber &&
      value.drugLicenceExpiry &&
      value.foodLicenceNo &&
      email &&
      phone &&
      alternate &&
      whatsapp &&
      gstn &&
      pin &&
      Number(value.creditLimit ?? 0) >= 0 &&
      Number(value.openingBalance ?? 0) >= 0,
  );
}

function serialize(record: PartyRecord | null) {
  if (!record || !record._id) return null;
  const { _id, ...rest } = record;
  return {
    ...rest,
    _id: _id.toString(),
    id: _id.toString(),
  };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Party record not found." }, { status: 404 });
    }

    const _id = new ObjectId(id);
    const collection = (await getMongoDb()).collection<PartyRecord>(collectionName);
    const current = await collection.findOne({ _id });
    if (!current) {
      return NextResponse.json({ error: "Party record not found." }, { status: 404 });
    }

    const payload = normalizeParty(await request.json());
    if (!validParty(payload)) {
      return NextResponse.json({ error: "Please complete all required fields with valid values." }, { status: 400 });
    }

    if (payload.registeredGSTN && payload.gstnNumber) {
      const duplicate = await collection.findOne({
        _id: { $ne: _id },
        registeredGSTN: true,
        gstnNumber: { $regex: new RegExp(`^${payload.gstnNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$")}$$`, "i") },
      });
      if (duplicate) {
        return NextResponse.json({ error: "This GSTN number already exists." }, { status: 409 });
      }
    }

    const updated = { ...current, ...payload, active: Boolean(payload.active), creditLocked: Boolean(payload.creditLocked) };
    await collection.updateOne({ _id }, { $set: updated });
    const refreshed = await collection.findOne({ _id });
    return NextResponse.json({ record: serialize(refreshed) });
  } catch (error) {
    console.error("Party update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update party.";
    return NextResponse.json({ error: message }, { status: /already exists/i.test(message) ? 409 : 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Party record not found." }, { status: 404 });
    }

    const collection = (await getMongoDb()).collection<PartyRecord>(collectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) {
      return NextResponse.json({ error: "Party record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Party delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete party.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
