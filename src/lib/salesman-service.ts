import { mockService } from "@/lib/mock-service";
import salesmanData from "@/data/salesman.json";
import type { Salesman } from "@/types/salesman";

const COLLECTION = "salesmen";
const SOURCE_META = "salesmenSourceMeta";
const seedSalesmen = salesmanData as Array<Partial<Salesman> & { id: number }>;
const sourceSignature = JSON.stringify(seedSalesmen);

function normalize(record: Partial<Salesman> & { id: number }): Salesman {
  return {
    id: Number(record.id),
    fullName: String(record.fullName ?? "").trim(),
    mobileNumber: String(record.mobileNumber ?? "").trim(),
    isActive: record.isActive !== false,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export const salesmanService = {
  list(): Salesman[] {
    if (typeof window !== "undefined") {
      const sourceMeta = mockService.get<{ id: string; sourceSignature: string }>(SOURCE_META)[0];
      if (sourceMeta?.sourceSignature !== sourceSignature) {
        mockService.replace(COLLECTION, seedSalesmen as Salesman[]);
        mockService.replace(SOURCE_META, [{ id: "source", sourceSignature }]);
      }
    }
    return mockService.getOrSeed<Salesman>(COLLECTION, seedSalesmen as Salesman[]).map(normalize);
  },
  active(): Salesman[] {
    return this.list().filter((salesman) => salesman.isActive);
  },
  create(input: Pick<Salesman, "fullName" | "mobileNumber">): Salesman {
    if (this.list().length >= 5) throw new Error("Maximum 5 salesman records are allowed.");
    return normalize(mockService.save(COLLECTION, {
      fullName: input.fullName.trim(),
      mobileNumber: input.mobileNumber.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    }));
  },
  update(id: number, input: Partial<Pick<Salesman, "fullName" | "mobileNumber" | "isActive">>): void {
    mockService.update(COLLECTION, id, { ...input, updatedAt: new Date().toISOString() });
  },
};
