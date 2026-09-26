import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getMongoDb } from "@/lib/mongodb";

const normalizeSalesmanRecord = (record: any) => ({
  ...record,
  _id: record._id?.toString?.() ?? record._id,
  id: record._id?.toString?.() ?? record._id,
  fullName: String(record.fullName ?? "").trim(),
  mobileNumber: String(record.mobileNumber ?? "").trim(),
  isActive: record.isActive !== false,
});

const parseObjectId = (id: string) => {
  if (!id || id === "undefined") return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id;
    const objectId = parseObjectId(id);
    const db = await getMongoDb();
    const recordFilter: any = objectId ? { _id: objectId } : { _id: id };
    const record = await db.collection("salesmen").findOne(recordFilter);

    if (!record) {
      return NextResponse.json({ error: "Salesman not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, record: normalizeSalesmanRecord(record) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to fetch salesman." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const id = params?.id;
    const objectId = parseObjectId(id);
    const db = await getMongoDb();
    const collection = db.collection("salesmen");
    const payload: Record<string, any> = {};
    const idFilter: any = objectId ? { _id: objectId } : { _id: id };

    if (body?.fullName !== undefined) {
      const fullName = String(body.fullName ?? "").trim();
      if (!fullName) {
        return NextResponse.json({ error: "Salesman name is required." }, { status: 400 });
      }
      payload.fullName = fullName;
    }

    if (body?.mobileNumber !== undefined) {
      const mobileNumber = String(body.mobileNumber ?? "").trim();
      if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
        return NextResponse.json({ error: "Mobile number must be 10 digits." }, { status: 400 });
      }
      payload.mobileNumber = mobileNumber;
    }

    if (body?.isActive !== undefined) {
      payload.isActive = Boolean(body.isActive);
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "No valid fields were provided for update." }, { status: 400 });
    }

    if (payload.mobileNumber) {
      const duplicateFilter: any = {
        mobileNumber: payload.mobileNumber,
        ...(objectId ? { _id: { $ne: objectId } } : { _id: { $ne: id } }),
      };
      const existing = await collection.findOne(duplicateFilter);
      if (existing) {
        return NextResponse.json({ error: "A salesman with this mobile number already exists." }, { status: 409 });
      }
    }

    payload.updatedAt = new Date().toISOString();

    const result = await collection.updateOne(idFilter, { $set: payload });
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Salesman not found." }, { status: 404 });
    }

    const updated = await collection.findOne(idFilter);
    return NextResponse.json({ success: true, record: normalizeSalesmanRecord(updated) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to update salesman." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id;
    const objectId = parseObjectId(id);
    const db = await getMongoDb();
    const deleteFilter: any = objectId ? { _id: objectId } : { _id: id };
    const result = await db.collection("salesmen").deleteOne(deleteFilter);

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Salesman not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to delete salesman." },
      { status: 500 },
    );
  }
}
