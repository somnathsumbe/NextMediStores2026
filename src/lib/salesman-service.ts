import { mockService } from "@/lib/mock-service";
import type { Salesman } from "@/types/salesman";

const COLLECTION = "salesmen";

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
    return mockService.get<Salesman>(COLLECTION).map(normalize);
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
