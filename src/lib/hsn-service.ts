import hsnData from "@/data/hsn.json";
import { mockService } from "@/lib/mock-service";
import type { HsnRecord, HsnStatus } from "@/types/hsn";

type HsnCategoryEntry = { id: string; recordType: "category"; name: string; hsnCode: string };
type HsnEntry = HsnRecord | HsnCategoryEntry;
const COLLECTION = "hsnMaster";
const SOURCE_META = "hsnMasterMeta";

const seedEntries: HsnEntry[] = [
  ...hsnData.records.map((record) => ({ ...record, hsnCode: String(record.hsnCode), status: record.status === "Inactive" ? "Inactive" as HsnStatus : "Active" as HsnStatus })),
  ...hsnData.categories.map((category) => ({ id: `category-${category.name}`, recordType: "category" as const, name: category.name, hsnCode: category.hsnCode })),
];
const sourceSignature = JSON.stringify(seedEntries);
type HsnSourceMeta = { id: "source"; sourceSignature: string };

function entries() {
  if (typeof window === "undefined") return structuredClone(seedEntries);
  const stored = mockService.getOrSeed<HsnEntry>(COLLECTION, seedEntries);
  const metadata = mockService.get<HsnSourceMeta>(SOURCE_META)[0];
  if (metadata?.sourceSignature !== sourceSignature) {
    mockService.replace(COLLECTION, seedEntries);
    mockService.replace(SOURCE_META, [{ id: "source", sourceSignature }]);
    return mockService.get<HsnEntry>(COLLECTION);
  }
  return stored;
}
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
    const category = input.category.trim();
    const hsnCode = input.hsnCode.trim();
    const current = this.list().find((record) => record.id === id);
    if (!current) throw new Error("HSN record not found.");
    this.assertCode(hsnCode);
    this.assertUnique(hsnCode, id);
    const currentCategoryEntry = entries().find((entry) => !isRecord(entry) && entry.name.toLowerCase() === current.category.toLowerCase());
    const duplicateCategory = entries().some((entry) => !isRecord(entry) && entry.id !== currentCategoryEntry?.id && entry.name.toLowerCase() === category.toLowerCase());
    if (duplicateCategory || this.list().some((record) => record.id !== id && record.category.toLowerCase() === category.toLowerCase())) throw new Error("This HSN Category already has an HSN record.");
    if (entries().some((entry) => entry.id !== currentCategoryEntry?.id && entry.hsnCode === hsnCode)) throw new Error("This HSN Code already exists. Enter a unique code.");
    if (currentCategoryEntry) {
      mockService.update(COLLECTION, currentCategoryEntry.id, { name: category, hsnCode });
    } else {
      mockService.save(COLLECTION, { id: `category-${Date.now()}`, recordType: "category", name: category, hsnCode });
    }
    mockService.update(COLLECTION, id, { ...input, hsnCode, category });
  },
  toggleStatus(id: number, status: HsnStatus): void { mockService.update(COLLECTION, id, { status }); },
  delete(id: number): void {
    const record = this.list().find((item) => item.id === id);
    if (!record) throw new Error("HSN record not found.");
    const categoryEntry = entries().find((entry) => !isRecord(entry) && entry.name.toLowerCase() === record.category.toLowerCase());
    mockService.remove(COLLECTION, id);
    if (categoryEntry) mockService.remove(COLLECTION, categoryEntry.id);
  },
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
