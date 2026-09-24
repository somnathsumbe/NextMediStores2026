export type AnyRecord = Record<string, any>;
const KEY = "medistores_db";
import seedData from "../data/products.json";

const seed = Array.isArray(seedData) ? { products: seedData } : (seedData ?? {});
let cachedDb: AnyRecord | null = null;
let cachedRaw: string | null = null;

function syncSeedData(db: AnyRecord): AnyRecord {
  const next: AnyRecord = { ...seed, ...db };

  const seededProducts = Array.isArray(seed.products) ? seed.products : [];
  const currentProducts = Array.isArray(next.products) ? next.products : [];

  const productsById = new Map<number, AnyRecord>();
  seededProducts.forEach((product: AnyRecord) => {
    productsById.set(Number(product.id), structuredClone(product));
  });
  currentProducts.forEach((product: AnyRecord) => {
    const id = Number(product.id);
    const seedProduct = productsById.get(id);
    productsById.set(id, seedProduct ? { ...seedProduct, ...structuredClone(product) } : structuredClone(product));
  });
  next.products = Array.from(productsById.values());

  next.products = next.products.map((product: AnyRecord) => {
    const normalizedProduct = { ...product };
    const legacyPtrKey = ["p", "tr"].join("");
    const legacySellRateKey = ["sell", "Rate"].join("");
    if (normalizedProduct.ptrSellRate === undefined) {
      normalizedProduct.ptrSellRate = normalizedProduct[legacyPtrKey] ?? normalizedProduct[legacySellRateKey] ?? normalizedProduct.mrp ?? 0;
    }
    delete normalizedProduct[legacyPtrKey];
    delete normalizedProduct[legacySellRateKey];
    return normalizedProduct;
  });

  return next;
}

function readDb(): AnyRecord {
  const normalizedSeed = Array.isArray(seedData) ? { products: seedData } : (seedData ?? {});
  if (typeof window === "undefined") return structuredClone(normalizedSeed);
  const raw = localStorage.getItem(KEY);
  if (raw === cachedRaw && cachedDb) return cachedDb;
  if (!raw) {
    const serializedSeed = JSON.stringify(normalizedSeed);
    localStorage.setItem(KEY, serializedSeed);
    cachedRaw = serializedSeed;
    cachedDb = structuredClone(normalizedSeed);
    return cachedDb;
  }
  try {
    const parsed = JSON.parse(raw);
    const normalizedParsed = Array.isArray(parsed) ? { products: parsed } : (parsed ?? {});
    const synced = syncSeedData(normalizedParsed);
    const serialized = JSON.stringify(synced);
    if (serialized !== raw) {
      localStorage.setItem(KEY, serialized);
    }
    cachedRaw = serialized;
    cachedDb = synced;
    return cachedDb;
  } catch {
    cachedRaw = null;
    cachedDb = structuredClone(normalizedSeed);
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
  get<T=AnyRecord[]>(collection:string): T[] { return (readDb()[collection] || []) as T[]; },
  getOrSeed<T=AnyRecord[]>(collection: string, seedItems: T[]): T[] {
    const db = readDb();
    if (!Array.isArray(db[collection])) {
      db[collection] = structuredClone(seedItems);
      writeDb(db);
    }
    return db[collection] as T[];
  },
  getMany<T=AnyRecord[]>(collections: string[]): Record<string, T[]> {
    const db = readDb();
    return Object.fromEntries(collections.map((collection) => [collection, (db[collection] || []) as T[]]));
  },
  save<T extends AnyRecord>(collection:string, item:T) {
    const db=readDb(); const list=db[collection] || [];
    const nextId = list.reduce((m:any,x:any)=>Math.max(m,Number(x.id)||0),0)+1;
    const value={...item,id:item.id ?? nextId}; db[collection]=[value,...list]; writeDb(db); return value;
  },
  update<T extends AnyRecord>(collection:string,id:any,patch:Partial<T>) {
    const db=readDb(); db[collection]=(db[collection]||[]).map((x:any)=>x.id===id?{...x,...patch}:x); writeDb(db);
  },
  remove(collection:string,id:any) {
    const db=readDb(); db[collection]=(db[collection]||[]).filter((x:any)=>x.id!==id); writeDb(db);
  },
  reset() { localStorage.removeItem(KEY); cachedRaw = null; cachedDb = null; }
};
