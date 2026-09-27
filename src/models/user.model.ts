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
