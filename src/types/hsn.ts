export type HsnStatus = "Active" | "Inactive";

export type HsnRecord = {
  id: number;
  hsnCode: string;
  category: string;
  status: HsnStatus;
};

export type HsnMongoRecord = {
  _id: string;
  hsnCode: string;
  category: string;
  status: HsnStatus;
};
