export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  name: string;
  role: string;
  active: boolean;
}

export type AuthenticatedUser = Omit<User, "password">;
