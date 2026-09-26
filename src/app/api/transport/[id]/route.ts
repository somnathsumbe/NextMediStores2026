import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "transport";

type TransportStatus = "Active" | "Inactive";
type TransportDocument = {
  _id: ObjectId;
  city: string;
  name: string;
  address: string;
  type: string;
  status: TransportStatus;
};

function normalizePayload(body: unknown) {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const payload: Record<string, string> = {};

  if (value.city !== undefined) {
    const city = String(value.city ?? "").trim();
    if (!city) throw new Error("City is required.");
    payload.city = city;
  }

  if (value.name !== undefined) {
    const name = String(value.name ?? "").trim();
    if (!name) throw new Error("Transport Name is required.");
    payload.name = name;
  }

  if (value.address !== undefined) {
    const address = String(value.address ?? "").trim();
    if (!address) throw new Error("Address is required.");
    payload.address = address;
  }

  if (value.type !== undefined) {
    const type = String(value.type ?? "").trim();
    if (!type) throw new Error("Transport Type is required.");
    payload.type = type;
  }

  if (value.status !== undefined) {
    const status = value.status === "Inactive" ? "Inactive" : "Active";
    payload.status = status;
  }

  return payload;
}

function serialize(record: TransportDocument | null) {
  if (!record) return null;
  const _id = record._id.toString();
  return {
    _id,
    id: _id,
    city: record.city,
    name: record.name,
    address: record.address,
    type: record.type,
    status: record.status,
  };
}

function getObjectId(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid transport record id.");
  return new ObjectId(id);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const _id = getObjectId(params.id);
    const payload = normalizePayload(await request.json());

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields were provided for update." }, { status: 400 });
    }

    const collection = (await getMongoDb()).collection<TransportDocument>(collectionName);

    const cityNameCheck = payload.city && payload.name ? { city: payload.city, name: payload.name } : null;
    const duplicate = cityNameCheck && (await collection.findOne({ ...cityNameCheck, _id: { $ne: _id } }));
    if (duplicate) {
      return NextResponse.json({ error: "This City and Transport Name combination already exists." }, { status: 409 });
    }

    const result = await collection.updateOne({ _id }, { $set: payload });
    if (!result.matchedCount) {
      return NextResponse.json({ error: "Transport record not found." }, { status: 404 });
    }

    const record = await collection.findOne({ _id });
    return NextResponse.json({ success: true, record: serialize(record) });
  } catch (error) {
    console.error("Transport update failed:", error);
    const message = error instanceof Error ? error.message : "Unable to update transport record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message)
      ? 503
      : message.includes("already exists")
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const _id = getObjectId(params.id);
    const result = await (await getMongoDb()).collection<TransportDocument>(collectionName).deleteOne({ _id });

    if (!result.deletedCount) {
      return NextResponse.json({ error: "Transport record not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Transport delete failed:", error);
    const message = error instanceof Error ? error.message : "Unable to delete transport record.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
