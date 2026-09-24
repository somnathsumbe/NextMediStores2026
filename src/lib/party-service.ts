import partyData from "@/data/party.json";
import { mockService } from "@/lib/mock-service";
import type { Party } from "@/types/party";

const COLLECTION = "partyDetails";
const SOURCE_META = "partyDetailsMeta";
type PartySeed = Omit<Party, "registeredGSTN" | "gstnNumber"> & { registeredGSTN?: boolean; gstnNumber?: string; gstn?: string };
const seedRecords: Party[] = partyData.records.map((record) => normalize({ ...record } as PartySeed));
const sourceSignature = JSON.stringify(seedRecords);

type SourceMeta = { id: "source"; sourceSignature: string };

function normalize(record: PartySeed): Party {
  const registeredGSTN = Boolean(record.registeredGSTN ?? record.gstn);
  return {
    ...record,
    id: Number(record.id),
    customerType: record.customerType === "Retailer" || record.customerType === "Other" ? record.customerType : "Dealer",
    registeredGSTN,
    gstnNumber: registeredGSTN ? String(record.gstnNumber ?? record.gstn ?? "").trim().toUpperCase() : "",
    active: Boolean(record.active),
    discount: Number(record.discount ?? 0),
    creditLimit: Number(record.creditLimit ?? 0),
    openingBalance: Number(record.openingBalance ?? 0),
    closingBalance: Number(record.closingBalance ?? 0),
    outstandingBalance: Number(record.outstandingBalance ?? 0),
    creditLocked: Boolean(record.creditLocked),
  };
}

function entries(): Party[] {
  if (typeof window === "undefined") return structuredClone(seedRecords);
  const stored = mockService.getOrSeed<Party>(COLLECTION, seedRecords);
  const metadata = mockService.get<SourceMeta>(SOURCE_META)[0];
  if (metadata?.sourceSignature !== sourceSignature) {
    mockService.replace(COLLECTION, seedRecords);
    mockService.replace(SOURCE_META, [{ id: "source", sourceSignature }]);
    return mockService.get<Party>(COLLECTION);
  }
  return stored.map((record) => normalize(record));
}

function assertGstn(party: Pick<Party, "registeredGSTN" | "gstnNumber">, exceptId?: number) {
  const gstnNumber = party.registeredGSTN ? party.gstnNumber.trim().toUpperCase() : "";
  if (party.registeredGSTN && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstnNumber)) throw new Error("Enter a valid GSTN number.");
  if (gstnNumber && entries().some((record) => record.id !== exceptId && record.gstnNumber.toUpperCase() === gstnNumber)) throw new Error("This GSTN number already exists.");
}

export const partyService = {
  list(): Party[] { return entries(); },
  cities(): string[] { return Array.from(new Set(partyData.cities)).sort((a, b) => a.localeCompare(b)); },
  states(): string[] { return Array.from(new Set(partyData.states)).sort((a, b) => a.localeCompare(b)); },
  schemes(): string[] { return Array.from(new Set(partyData.schemes)).sort((a, b) => a.localeCompare(b)); },
  create(input: Omit<Party, "id">): Party {
    assertGstn(input);
    const record = normalize({ ...input, id: 0 });
    return mockService.save(COLLECTION, record) as Party;
  },
  update(id: number, input: Omit<Party, "id">): void {
    if (!entries().some((record) => record.id === id)) throw new Error("Party record not found.");
    assertGstn(input, id);
    mockService.update(COLLECTION, id, normalize({ ...input, id }));
  },
  delete(id: number): void { if (!entries().some((record) => record.id === id)) throw new Error("Party record not found."); mockService.remove(COLLECTION, id); },
  toggleStatus(id: number): void { const record = entries().find((item) => item.id === id); if (record) mockService.update(COLLECTION, id, { active: !record.active }); },
  toggleCreditLock(id: number): void { const record = entries().find((item) => item.id === id); if (record) mockService.update(COLLECTION, id, { creditLocked: !record.creditLocked }); },
};
