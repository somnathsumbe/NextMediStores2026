export type LoginCredentials = {
  identifier: string;
  password: string;
  rememberMe: boolean;
};

export type RegistrationData = {
  businessName: string;
  ownerName: string;
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  drugLicenseNumber: string;
  gstNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  role: "dealer" | "retailer";
};
