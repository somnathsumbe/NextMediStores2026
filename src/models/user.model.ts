export interface User {
  _id?: string | { toString(): string };
  id?: number | string;
  username: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: string;
  active: boolean;
}

export type AuthenticatedUser = Omit<User, "password" | "passwordHash"> & { id: number | string };

export type SessionUser = {
  id: string;
  name: string;
  ownerName: string;
  username: string;
  email: string;
  businessName: string;
  mobile: string;
  role: string;
  active: true;
  address: string;
  city: string;
  state: string;
  pincode: string;
};
