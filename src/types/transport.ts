export type TransportStatus = "Active" | "Inactive";

export type TransportRecord = {
  _id: string;
  id: string;
  city: string;
  name: string;
  address: string;
  type: string;
  status: TransportStatus;
};
