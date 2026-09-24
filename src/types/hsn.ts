export type HsnStatus = "Active" | "Inactive";

export type HsnRecord = {
  id: number;
  hsnCode: string;
  category: string;
  status: HsnStatus;
};
