import type { AuthenticatedUser } from "@/models/user.model";
import type { LoginCredentials, RegistrationData } from "@/types/auth";

const AUTH_KEY = "medistores_auth";
const USER_KEY = "medistores_user";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  return [window.localStorage, window.sessionStorage];
}

export const authService = {
  async login({ identifier, password, rememberMe }: LoginCredentials): Promise<AuthenticatedUser> {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });
      const result = await response.json() as { message?: string } | AuthenticatedUser;
      if (!response.ok || typeof window === "undefined") throw new Error("message" in result ? result.message : "Unable to sign in.");
      const user = result as AuthenticatedUser;

      const target = rememberMe ? window.localStorage : window.sessionStorage;
      const other = rememberMe ? window.sessionStorage : window.localStorage;
      target.setItem(AUTH_KEY, "1");
      target.setItem(USER_KEY, JSON.stringify(user));
      other.removeItem(AUTH_KEY);
      other.removeItem(USER_KEY);
      return user;
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

  getCurrentUser(): AuthenticatedUser | null {
    const storage = getStorages().find(item => item.getItem(AUTH_KEY) === "1");
    const rawUser = storage?.getItem(USER_KEY);
    if (!rawUser) return null;
    try { return JSON.parse(rawUser) as AuthenticatedUser; } catch { return null; }
  },

  getUser(): AuthenticatedUser | null { return this.getCurrentUser(); },

  async logout(): Promise<void> {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* Local cleanup must still complete. */ }
    getStorages().forEach(storage => {
      storage.removeItem(AUTH_KEY);
      storage.removeItem(USER_KEY);
    });
  },
};
