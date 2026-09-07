import type { AuthUser, LoginCredentials, RegistrationData } from "@/types/auth";

const AUTH_KEY = "medistores_auth";
const USER_KEY = "medistores_user";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  return [window.localStorage, window.sessionStorage];
}

export const authService = {
  async login({ identifier, password, rememberMe }: LoginCredentials): Promise<AuthUser | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      if (!response.ok || typeof window === "undefined") return null;
      const user = await response.json() as AuthUser;

      const target = rememberMe ? window.localStorage : window.sessionStorage;
      const other = rememberMe ? window.sessionStorage : window.localStorage;
      target.setItem(AUTH_KEY, "1");
      target.setItem(USER_KEY, user.username);
      other.removeItem(AUTH_KEY);
      other.removeItem(USER_KEY);
      return user;
    } catch {
      return null;
    }
  },

  async register(data: RegistrationData): Promise<{ ok: boolean; message?: string }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json() as { message?: string };
      return { ok: response.ok, message: result.message };
    } catch {
      return { ok: false, message: "Unable to reach the registration service." };
    }
  },

  isAuthenticated(): boolean {
    return getStorages().some(storage => storage.getItem(AUTH_KEY) === "1");
  },

  getUser(): AuthUser | null {
    const storage = getStorages().find(item => item.getItem(AUTH_KEY) === "1");
    const username = storage?.getItem(USER_KEY);
    return username ? { username } : null;
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    getStorages().forEach(storage => {
      storage.removeItem(AUTH_KEY);
      storage.removeItem(USER_KEY);
    });
  },
};
