import { NextResponse } from "next/server";
import { dbName, getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await getMongoDb();
    await database.command({ ping: 1 });
    return NextResponse.json({ success: true, database: dbName });
  } catch (error) {
    console.error("MongoDB health check failed:", error);
    return NextResponse.json(
      { success: false, error: "MongoDB connection unavailable." },
      { status: 503 },
    );
  }
}
