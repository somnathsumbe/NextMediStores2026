import { NextResponse } from "next/server";

import { getMongoDb } from "@/lib/mongodb";

const normalizeSalesmanRecord = (record: any) => ({
  ...record,
  _id: record._id?.toString?.() ?? record._id,
  id: record._id?.toString?.() ?? record._id,
  fullName: String(record.fullName ?? "").trim(),
  mobileNumber: String(record.mobileNumber ?? "").trim(),
  isActive: record.isActive !== false,
});

export async function GET() {
  try {
    const db = await getMongoDb();
    const records = await db.collection("salesmen").find({}).sort({ fullName: 1 }).toArray();

    return NextResponse.json({
      success: true,
      records: records.map(normalizeSalesmanRecord),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to fetch salesmen." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = String(body?.fullName ?? "").trim();
    const mobileNumber = String(body?.mobileNumber ?? "").trim();

    if (!fullName) {
      return NextResponse.json({ error: "Salesman name is required." }, { status: 400 });
    }

    if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
      return NextResponse.json({ error: "Mobile number must be 10 digits." }, { status: 400 });
    }

    const db = await getMongoDb();
    const collection = db.collection("salesmen");

    if (mobileNumber) {
      const existing = await collection.findOne({ mobileNumber });
      if (existing) {
        return NextResponse.json({ error: "A salesman with this mobile number already exists." }, { status: 409 });
      }
    }

    const createdAt = new Date().toISOString();
    const inserted = await collection.insertOne({
      fullName,
      mobileNumber,
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    });

    const record = await collection.findOne({ _id: inserted.insertedId });

    return NextResponse.json({
      success: true,
      record: normalizeSalesmanRecord(record),
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to create salesman." },
      { status: 500 },
    );
  }
}
