import type { Salesman } from "@/types/salesman";

function normalizeSalesman(record: Partial<Salesman> & { _id?: string; id?: string }): Salesman {
  const idValue = String(record._id ?? record.id ?? "");
  return {
    _id: idValue,
    id: idValue,
    fullName: String(record.fullName ?? "").trim(),
    mobileNumber: String(record.mobileNumber ?? "").trim(),
    isActive: record.isActive !== false,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to process Salesman request.");
  }

  return payload as T;
}

export const salesmanService = {
  async list(): Promise<Salesman[]> {
    const payload = await request<{ records: Array<Partial<Salesman> & { _id?: string }> }>('/api/salesmen');
    return (payload.records ?? []).map((record) => normalizeSalesman(record));
  },
  async active(): Promise<Salesman[]> {
    const records = await this.list();
    return records.filter((salesman) => salesman.isActive);
  },
  async create(input: Pick<Salesman, "fullName" | "mobileNumber">): Promise<Salesman> {
    const payload = await request<{ record: Partial<Salesman> & { _id?: string } }>('/api/salesmen', {
      method: 'POST',
      body: JSON.stringify({
        fullName: input.fullName.trim(),
        mobileNumber: input.mobileNumber.trim(),
      }),
    });
    return normalizeSalesman(payload.record ?? {});
  },
  async update(id: string, input: Partial<Pick<Salesman, "fullName" | "mobileNumber" | "isActive">>): Promise<Salesman> {
    const payload = await request<{ record: Partial<Salesman> & { _id?: string } }>(`/api/salesmen/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return normalizeSalesman(payload.record ?? { _id: id, ...input });
  },
  async delete(id: string): Promise<void> {
    await request<{ success: true }>(`/api/salesmen/${id}`, { method: 'DELETE' });
  },
};
