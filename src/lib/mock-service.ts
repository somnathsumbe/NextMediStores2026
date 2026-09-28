export type AnyRecord = Record<string, any>;
const KEY = "medistores_db";

let cachedDb: AnyRecord | null = null;
let cachedRaw: string | null = null;

function readDb(): AnyRecord {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw && cachedDb) return cachedDb;
  if (!raw) {
    cachedRaw = JSON.stringify({});
    cachedDb = {};
    return cachedDb;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = parsed && typeof parsed === "object" ? parsed : {};
    cachedRaw = JSON.stringify(normalized);
    cachedDb = normalized;
    return normalized;
  } catch {
    cachedRaw = null;
    cachedDb = {};
    return cachedDb;
  }
}

function writeDb(db: AnyRecord) {
  const serialized = JSON.stringify(db);
  localStorage.setItem(KEY, serialized);
  cachedRaw = serialized;
  cachedDb = db;
}

export const mockService = {
  get<T = AnyRecord[]>(collection: string): T[] { return (readDb()[collection] || []) as T[]; },
  getOrSeed<T = AnyRecord[]>(collection: string, seedItems: T[]): T[] {
    const db = readDb();
    if (!Array.isArray(db[collection])) {
      db[collection] = structuredClone(seedItems);
      writeDb(db);
    }
    return db[collection] as T[];
  },
  getMany<T = AnyRecord[]>(collections: string[]): Record<string, T[]> {
    const db = readDb();
    return Object.fromEntries(collections.map((collection) => [collection, (db[collection] || []) as T[]]));
  },
  save<T extends AnyRecord>(collection: string, item: T) {
    const db = readDb();
    const list = Array.isArray(db[collection]) ? db[collection] : [];
    const nextId = list.reduce((max: number, entry: any) => Math.max(max, Number(entry.id) || 0), 0) + 1;
    const value = { ...item, id: item.id ?? nextId };
    db[collection] = [value, ...list];
    writeDb(db);
    return value;
  },
  update<T extends AnyRecord>(collection: string, id: any, patch: Partial<T>) {
    const db = readDb();
    db[collection] = (db[collection] || []).map((entry: any) => entry.id === id ? { ...entry, ...patch } : entry);
    writeDb(db);
  },
  replace<T extends AnyRecord>(collection: string, items: T[]) {
    const db = readDb();
    db[collection] = structuredClone(items);
    writeDb(db);
  },
  remove(collection: string, id: any) {
    const db = readDb();
    db[collection] = (db[collection] || []).filter((entry: any) => entry.id !== id);
    writeDb(db);
  },
  reset() {
    localStorage.removeItem(KEY);
    cachedRaw = null;
    cachedDb = null;
  },
};
