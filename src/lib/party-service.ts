import type { Party } from "@/types/party";

type PartyInput = Omit<Party, "id" | "_id">;
type PartyResponse = { record?: Party | null; records?: Party[]; error?: string };

async function request<T extends PartyResponse>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T;
  if (!response.ok) throw new Error(payload.error || "Unable to process Party request.");
  return payload;
}

async function list(): Promise<Party[]> {
  const payload = await request<{ records?: Party[] }>("/api/parties");
  return payload.records ?? [];
}

function toPartyInput(party: Party): PartyInput {
  const { id: _id, _id: mongoId, ...input } = party;
  void _id;
  void mongoId;
  return input;
}

async function update(id: string, input: PartyInput): Promise<void> {
  await request(`/api/parties/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export const partyService = {
  list,
  async cities(): Promise<string[]> {
    const parties = await list();
    return Array.from(new Set(parties.map((party) => party.city).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  },
  async states(): Promise<string[]> {
    const parties = await list();
    return Array.from(new Set(parties.map((party) => party.state).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  },
  async schemes(): Promise<string[]> {
    const parties = await list();
    return Array.from(new Set(parties.map((party) => party.scheme).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  },
  async create(input: PartyInput): Promise<Party> {
    const payload = await request<{ record?: Party | null }>("/api/parties", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (!payload.record) throw new Error("Party API did not return the created record.");
    return payload.record;
  },
  update,
  async delete(id: string): Promise<void> {
    await request(`/api/parties/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async toggleStatus(id: string): Promise<void> {
    const party = (await list()).find((record) => String(record.id) === id);
    if (party) await update(id, { ...toPartyInput(party), active: !party.active });
  },
  async toggleCreditLock(id: string): Promise<void> {
    const party = (await list()).find((record) => String(record.id) === id);
    if (party) await update(id, { ...toPartyInput(party), creditLocked: !party.creditLocked });
  },
};
