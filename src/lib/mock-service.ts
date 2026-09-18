export type AnyRecord = Record<string, any>;
const KEY = "medistores_db";
import seed from "../data/mock.json";

function createProductSeed(): any[] {
  const productCatalog = [
    { name: "Paracetamol", scientificName: "Acetaminophen", manufacturer: "Cipla Ltd.", group: "Tablets", unit: "Strip", categoryId: "CAT-PAIN-01", hsn: "3004", dose: "500 mg" },
    { name: "Amoxicillin", scientificName: "Amoxicillin Trihydrate", manufacturer: "Sun Pharma", group: "Capsules", unit: "Box", categoryId: "CAT-ANTI-02", hsn: "3004", dose: "250 mg" },
    { name: "Cough Syrup", scientificName: "Dextromethorphan + Guaifenesin", manufacturer: "Mankind Pharma", group: "Syrup", unit: "Bottle", categoryId: "CAT-RESP-03", hsn: "3004", dose: "100 ml" },
    { name: "Vitamin D3", scientificName: "Cholecalciferol", manufacturer: "Abbott India", group: "Capsules", unit: "Pack", categoryId: "CAT-VIT-04", hsn: "3004", dose: "60,000 IU" },
    { name: "Metformin", scientificName: "Metformin Hydrochloride", manufacturer: "Zydus Lifesciences", group: "Tablets", unit: "Strip", categoryId: "CAT-DIAB-05", hsn: "3004", dose: "500 mg" },
    { name: "Pantoprazole", scientificName: "Pantoprazole Sodium", manufacturer: "Dr. Reddy's", group: "Tablets", unit: "Strip", categoryId: "CAT-GAST-06", hsn: "3004", dose: "40 mg" },
    { name: "Amlodipine", scientificName: "Amlodipine Besylate", manufacturer: "Lupin", group: "Tablets", unit: "Strip", categoryId: "CAT-CARD-07", hsn: "3004", dose: "5 mg" },
    { name: "Cetirizine", scientificName: "Cetirizine Hydrochloride", manufacturer: "Cipla Ltd.", group: "Tablets", unit: "Strip", categoryId: "CAT-ALL-08", hsn: "3004", dose: "10 mg" },
    { name: "Levocetirizine", scientificName: "Levocetirizine Dihydrochloride", manufacturer: "Macleods Pharma", group: "Syrup", unit: "Bottle", categoryId: "CAT-ALL-09", hsn: "3004", dose: "60 ml" },
    { name: "Azithromycin", scientificName: "Azithromycin Dihydrate", manufacturer: "Alkem", group: "Tablets", unit: "Strip", categoryId: "CAT-ANTI-10", hsn: "3004", dose: "500 mg" },
  ];

  return Array.from({ length: 100 }, (_, index) => {
    const template = productCatalog[index % productCatalog.length];
    const id = index + 1;
    const quantity = 80 + ((index * 17) % 240);
    const minQty = 10 + (index % 12) * 5;
    const mrp = 30 + ((index * 13) % 240) + ((index % 4) * 4.5);
    const sellRate = Number((mrp * (0.88 + (index % 5) * 0.03)).toFixed(2));
    const today = new Date();
    today.setDate(today.getDate() + (index % 14) * 5);
    const manufactureDate = new Date(today.getFullYear() - 1, (index % 12), (index % 28) + 1)
      .toISOString()
      .slice(0, 10);
    const expiryDate = new Date(today.getFullYear() + 2, (index % 12), (index % 28) + 1)
      .toISOString()
      .slice(0, 10);

    return {
      id,
      productName: `${template.name} ${template.dose}`,
      description: `${template.name} ${template.dose} for effective treatment and daily support.`,
      scientificName: template.scientificName,
      batchNumber: `B${String(id).padStart(5, "0")}`,
      mrp,
      sellRate,
      manufacturer: template.manufacturer,
      manufactureDate,
      expiryDate,
      drugContent: template.dose,
      packingDescription: `${template.unit} of ${1 + (index % 6) * 5} units`,
      replacement: index % 3 === 0,
      discountAllow: index % 2 === 0,
      dpcoProduct: index % 5 === 0,
      availableQuantity: quantity,
      minQuantity: minQty,
      maxQuantity: quantity + 80 + (index % 9) * 10,
      drugGroup: template.group,
      unit: template.unit,
      categoryId: template.categoryId,
      calculate: index % 2 === 0 ? "GST Inclusive" : "GST Exclusive",
      saleRateMethod: ["MRP", "Discounted", "Cost Plus", "Custom"][index % 4],
      hsn: template.hsn,
    };
  });
}

function syncSeedData(db: AnyRecord): AnyRecord {
  const next: AnyRecord = { ...seed, ...db };

  Object.entries(seed).forEach(([key, seedValue]) => {
    const currentValue = db[key];
    if (Array.isArray(seedValue) && Array.isArray(currentValue) && currentValue.length < seedValue.length) {
      next[key] = structuredClone(seedValue);
    }
  });

  if (!Array.isArray(next.products) || next.products.length < 100) {
    next.products = createProductSeed();
  }

  return next;
}

function readDb(): AnyRecord {
  if (typeof window === "undefined") return structuredClone(seed);
  const raw = localStorage.getItem(KEY);
  if (!raw) { localStorage.setItem(KEY, JSON.stringify(seed)); return structuredClone(seed); }
  try {
    const parsed = JSON.parse(raw);
    const synced = syncSeedData(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(synced)) {
      localStorage.setItem(KEY, JSON.stringify(synced));
    }
    return synced;
  } catch {
    return structuredClone(seed);
  }
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
