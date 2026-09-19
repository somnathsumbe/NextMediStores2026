export interface Product {
  id: number;
  productName: string;
  batchNumber: string;
  mrp: number;
  gst: number;
  retailerMargin: number;
  ptrSellRate: number;
  manufacturer: string;
  manufactureDate: string;
  expiryDate: string;
  drugContent: string;
  packingDescription: string;
  replacement: boolean;
  discountAllow: boolean;
  dpcoProduct: boolean;
  availableQuantity: number;
  drugGroup: string;
  unitType: string;
  unitQuantity: number;
  hsn: string;
}
