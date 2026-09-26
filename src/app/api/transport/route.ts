import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const collectionName = "transport";

type TransportStatus = "Active" | "Inactive";
type TransportDocument = {
  _id?: ObjectId;
  city: string;
  name: string;
  address: string;
  type: string;
  status: TransportStatus;
};

function serialize(record: TransportDocument | null) {
  if (!record) return null;
  const _id = record._id?.toString?.() ?? "";
  if (!_id) return null;
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

function normalizePayload(body: unknown, requireAll = false) {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const city = typeof value.city === "string" ? value.city.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const address = typeof value.address === "string" ? value.address.trim() : "";
  const type = typeof value.type === "string" ? value.type.trim() : "";
  const status = value.status === "Inactive" ? "Inactive" : "Active";

  if (requireAll) {
    if (!city || !name || !address || !type) {
      throw new Error("Please complete all required fields.");
    }
  } else {
    if (value.city !== undefined && !city) throw new Error("City is required.");
    if (value.name !== undefined && !name) throw new Error("Transport Name is required.");
    if (value.address !== undefined && !address) throw new Error("Address is required.");
    if (value.type !== undefined && !type) throw new Error("Transport Type is required.");
  }

  const payload: Record<string, string> = {};
  if (requireAll || value.city !== undefined) payload.city = city;
  if (requireAll || value.name !== undefined) payload.name = name;
  if (requireAll || value.address !== undefined) payload.address = address;
  if (requireAll || value.type !== undefined) payload.type = type;
  if (requireAll || value.status !== undefined) payload.status = status;

  return payload;
}

export async function GET() {
  try {
    const records = await (await getMongoDb())
      .collection<TransportDocument>(collectionName)
      .find({})
      .sort({ city: 1, name: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      records: records.map((record) => serialize(record)).filter(Boolean),
    });
  } catch (error) {
    console.error("Transport fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unable to fetch transport records.";
    const status = /ECONNREFUSED|ENOTFOUND|querySrv|MongoDB Atlas connection failed/i.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const payload = normalizePayload(await request.json(), true);
    const collection = (await getMongoDb()).collection<TransportDocument>(collectionName);

    const duplicate = await collection.findOne({
      city: payload.city,
      name: payload.name,
    });

    if (duplicate) {
      return NextResponse.json({ error: "This City and Transport Name combination already exists." }, { status: 409 });
    }

    const inserted = await collection.insertOne({
      city: payload.city,
      name: payload.name,
      address: payload.address,
      type: payload.type,
      status: payload.status as TransportStatus,
    });

    const record = await collection.findOne({ _id: inserted.insertedId });
    return NextResponse.json({ success: true, record: serialize(record) }, { status: 201 });
  } catch (error) {
    console.error("Transport create failed:", error);
    const message = error instanceof Error ? error.message : "Unable to create transport record.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
