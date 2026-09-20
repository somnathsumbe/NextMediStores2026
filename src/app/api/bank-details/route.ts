import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src", "data", "bankinfo.json");
const maharashtraCities = ["Ahilyanagar", "Akola", "Amravati", "Chhatrapati Sambhajinagar", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Dharashiv", "Wardha", "Washim", "Yavatmal"];
const defaultBanks = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Bank of Maharashtra", "Bank of India", "Canara Bank", "Union Bank of India", "Indian Bank", "Central Bank of India", "Punjab National Bank", "UCO Bank", "IDBI Bank", "Federal Bank", "IndusInd Bank", "Yes Bank", "Bandhan Bank", "AU Small Finance Bank", "RBL Bank"];
export const dynamic = "force-static";

type BankDetails = { id: number; party: string; bankName: string; address: string; state: string; city: string; ifsc: string; accountNo: string; accountType?: "Savings" | "Current" | "OD" | "CC"; isDefault: boolean; status: "Active" | "Inactive" };
type Store = { parties: string[]; banks: string[]; cities: string[]; records: Array<Record<string, unknown>> };

async function readStore(): Promise<Store> {
  const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as Partial<Store>;
  const cities = Array.from(new Set([...(parsed.cities ?? []), ...maharashtraCities]));
  const banks = Array.from(new Set([...(parsed.banks ?? []), ...defaultBanks]));
  const records = (parsed.records ?? []).map((record) => ({
    ...record,
    state: String(record.state ?? "Maharashtra"),
    accountType: record.accountType as BankDetails["accountType"],
    accountNo: String(record.accountNo ?? ""),
  }));
  return { parties: parsed.parties ?? [], banks, cities, records };
}

async function writeStore(store: Store) {
  await fs.writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function validRecord(value: Partial<BankDetails>) {
  return Boolean(value.party && value.bankName && value.address && value.address.trim().length >= 5 && value.state && value.city && value.ifsc && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.ifsc) && value.accountNo && /^[0-9]{9,18}$/.test(value.accountNo));
}

export async function GET() {
  try {
    return Response.json(await readStore());
  } catch {
    return Response.json({ error: "Unable to load bank details." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<BankDetails> & { masterType?: string; name?: string; state?: string };
    const store = await readStore();
    if (body.masterType && body.name?.trim()) {
      const name = body.name.trim();
      if (body.masterType === "party" && !store.parties.includes(name)) store.parties.push(name);
      if (body.masterType === "bank" && !store.banks.includes(name)) store.banks.push(name);
      if (body.masterType === "city" && !store.cities.includes(name)) store.cities.push(name);
      await writeStore(store);
      return Response.json({ name });
    }
    const record = { ...body, id: Math.max(0, ...store.records.map((item) => Number(item.id) || 0)) + 1, ifsc: String(body.ifsc ?? "").replace(/\s/g, "").toUpperCase(), accountNo: String(body.accountNo ?? "").replace(/\s/g, ""), state: body.state ?? "Maharashtra", isDefault: Boolean(body.isDefault), status: body.status === "Inactive" ? "Inactive" : "Active" } as BankDetails;
    if (!validRecord(record)) return Response.json({ error: "Please enter valid bank details." }, { status: 400 });
    if (store.records.some((item) => item.party === record.party && item.bankName === record.bankName && item.accountNo === record.accountNo)) return Response.json({ error: "Bank account already exists for this Party." }, { status: 409 });
    if (record.isDefault) store.records = store.records.map((item) => item.party === record.party ? { ...item, isDefault: false } : item);
    store.records.push(record);
    await writeStore(store);
    return Response.json(record, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to save bank details." }, { status: 500 });
  }
}