export type AnyRecord = Record<string, any>;
const KEY = "medistores_db";
import seed from "../data/mock.json";

function readDb(): AnyRecord {
  if (typeof window === "undefined") return structuredClone(seed);
  const raw = localStorage.getItem(KEY);
  if (!raw) { localStorage.setItem(KEY, JSON.stringify(seed)); return structuredClone(seed); }
  try { return JSON.parse(raw); } catch { return structuredClone(seed); }
}
function writeDb(db: AnyRecord) { localStorage.setItem(KEY, JSON.stringify(db)); }

export const mockService = {
  get<T=AnyRecord[]>(collection:string): T[] { return (readDb()[collection] || []) as T[]; },
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
  reset() { localStorage.removeItem(KEY); }
};
