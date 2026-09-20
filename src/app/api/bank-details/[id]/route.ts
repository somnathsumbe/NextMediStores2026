import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src", "data", "bankinfo.json");
export const dynamic = "force-static";
async function readStore() { return JSON.parse(await fs.readFile(filePath, "utf8")) as { records: Array<Record<string, any>>; parties: string[]; banks: string[]; cities: string[] }; }
async function writeStore(store: unknown) { await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8"); }

export async function generateStaticParams() {
  const store = await readStore();
  return store.records.map((record) => ({ id: String(record.id) }));
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const store = await readStore();
    const id = Number(params.id);
    const index = store.records.findIndex((record) => Number(record.id) === id);
    if (index < 0) return Response.json({ error: "Bank details not found." }, { status: 404 });
    const body = await request.json();
    const current = store.records[index];
    const updated = { ...current, ...body, id, ifsc: String(body.ifsc ?? current.ifsc).replace(/\s/g, "").toUpperCase(), accountNo: String(body.accountNo ?? current.accountNo).replace(/\s/g, ""), state: body.state ?? current.state ?? "Maharashtra" };
    const duplicate = store.records.some((record, recordIndex) => recordIndex !== index && record.party === updated.party && record.bankName === updated.bankName && record.accountNo === updated.accountNo);
    if (duplicate) return Response.json({ error: "Bank account already exists for this Party." }, { status: 409 });
    if (updated.isDefault) store.records = store.records.map((record) => record.party === updated.party ? { ...record, isDefault: Number(record.id) === id } : record);
    store.records[index] = updated;
    await writeStore(store);
    return Response.json(updated);
  } catch { return Response.json({ error: "Unable to update bank details." }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const store = await readStore();
    const id = Number(params.id);
    const index = store.records.findIndex((record) => Number(record.id) === id);
    if (index < 0) return Response.json({ error: "Bank details not found." }, { status: 404 });
    const body = await request.json();
    if (body.action === "default") store.records = store.records.map((record) => record.party === store.records[index].party ? { ...record, isDefault: Number(record.id) === id } : record);
    if (body.action === "status") store.records[index].status = store.records[index].status === "Active" ? "Inactive" : "Active";
    await writeStore(store);
    return Response.json(store.records[index]);
  } catch { return Response.json({ error: "Unable to update bank details." }, { status: 500 }); }
}