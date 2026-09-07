import type { AuthUser, LoginCredentials } from "@/types/auth";

const AUTH_KEY = "medistores_auth";
const USER_KEY = "medistores_user";
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  return [window.localStorage, window.sessionStorage];
}

export const authService = {
  login({ username, password, rememberMe }: LoginCredentials): AuthUser | null {
    if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD || typeof window === "undefined") return null;

    const target = rememberMe ? window.localStorage : window.sessionStorage;
    const other = rememberMe ? window.sessionStorage : window.localStorage;
    target.setItem(AUTH_KEY, "1");
    target.setItem(USER_KEY, username);
    other.removeItem(AUTH_KEY);
    other.removeItem(USER_KEY);
    return { username };
  },

  isAuthenticated(): boolean {
    return getStorages().some(storage => storage.getItem(AUTH_KEY) === "1");
  },

  getUser(): AuthUser | null {
    const storage = getStorages().find(item => item.getItem(AUTH_KEY) === "1");
    const username = storage?.getItem(USER_KEY);
    return username ? { username } : null;
  },

  logout(): void {
    getStorages().forEach(storage => {
      storage.removeItem(AUTH_KEY);
      storage.removeItem(USER_KEY);
    });
  },
};
