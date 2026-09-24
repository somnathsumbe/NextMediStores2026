import hsnData from "@/data/hsn.json";
import { mockService } from "@/lib/mock-service";
import type { HsnRecord, HsnStatus } from "@/types/hsn";

type HsnCategoryEntry = { id: string; recordType: "category"; name: string; hsnCode: string };
type HsnEntry = HsnRecord | HsnCategoryEntry;
const COLLECTION = "hsnMaster";

const seedEntries: HsnEntry[] = [
  ...hsnData.records.map((record) => ({ ...record, hsnCode: String(record.hsnCode), status: record.status === "Inactive" ? "Inactive" as HsnStatus : "Active" as HsnStatus })),
  ...hsnData.categories.map((category) => ({ id: `category-${category.name}`, recordType: "category" as const, name: category.name, hsnCode: category.hsnCode })),
];

function entries() { return mockService.getOrSeed<HsnEntry>(COLLECTION, seedEntries); }
function isRecord(entry: HsnEntry): entry is HsnRecord { return !("recordType" in entry); }
function normalize(record: Partial<HsnRecord>): HsnRecord {
  const hsnCode = String(record.hsnCode ?? "").trim();
  return { id: Number(record.id), hsnCode, category: String(record.category ?? "").trim(), status: record.status === "Inactive" ? "Inactive" : "Active" };
}

export const hsnService = {
  list(): HsnRecord[] { return entries().filter(isRecord).map(normalize); },
  categories(): string[] {
    return Array.from(new Set(entries().map((entry) => isRecord(entry) ? entry.category : entry.name).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  },
  categoryCode(category: string): string { return entries().find((entry) => !isRecord(entry) && entry.name === category)?.hsnCode ?? this.list().find((record) => record.category === category)?.hsnCode ?? ""; },
  activeValid(): HsnRecord[] { return this.list().filter((record) => record.status === "Active"); },
  create(input: Omit<HsnRecord, "id">): HsnRecord {
    this.assertCode(input.hsnCode);
    this.assertCategory(input.category, input.hsnCode);
    this.assertUnique(input.hsnCode);
    const record = { ...input, hsnCode: input.hsnCode.trim(), category: input.category.trim() };
    return mockService.save(COLLECTION, record) as HsnRecord;
  },
  update(id: number, input: Omit<HsnRecord, "id">): void {
    this.assertCode(input.hsnCode);
    this.assertCategory(input.category, input.hsnCode, id);
    this.assertUnique(input.hsnCode, id);
    mockService.update(COLLECTION, id, { ...input, hsnCode: input.hsnCode.trim(), category: input.category.trim() });
  },
  toggleStatus(id: number, status: HsnStatus): void { mockService.update(COLLECTION, id, { status }); },
  addCategory(name: string, code: string): HsnRecord {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");
    if (this.categories().some((category) => category.toLowerCase() === trimmed.toLowerCase())) throw new Error("This category already exists.");
    this.assertCode(code);
    const normalizedCode = code.trim();
    if (entries().some((entry) => entry.hsnCode === normalizedCode)) throw new Error("This HSN Code already exists. Enter a unique code.");
    mockService.save(COLLECTION, { id: `category-${Date.now()}`, recordType: "category", name: trimmed, hsnCode: code.trim() });
    return this.create({ category: trimmed, hsnCode: normalizedCode, status: "Active" });
  },
  assertCode(code: string): void { if (!/^\d{4}$/.test(code.trim())) throw new Error("HSN Code must contain exactly four digits."); },
  assertUnique(code: string, exceptId?: number): void { if (this.list().some((record) => record.id !== exceptId && record.hsnCode === code.trim())) throw new Error("This HSN Code already exists. Enter a unique code."); },
  assertCategory(category: string, code: string, exceptId?: number): void {
    const trimmedCategory = category.trim();
    const mappedCode = this.categoryCode(trimmedCategory);
    if (!mappedCode) throw new Error("Select a valid HSN Category.");
    if (mappedCode !== code.trim()) throw new Error("HSN Code must match the selected category.");
    if (this.list().some((record) => record.id !== exceptId && record.category.toLowerCase() === trimmedCategory.toLowerCase())) throw new Error("This HSN Category already has an HSN record.");
  },
};
