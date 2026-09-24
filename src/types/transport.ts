export type TransportStatus = "Active" | "Inactive";

export type TransportRecord = {
  id: number;
  city: string;
  name: string;
  address: string;
  type: string;
  status: TransportStatus;
};
