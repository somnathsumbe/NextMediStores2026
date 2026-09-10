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
  async login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
    const result = await response.json() as { message?: string } | AuthenticatedUser;
    if (!response.ok || typeof window === "undefined") throw new Error("message" in result ? result.message : "Unable to sign in.");
    const user = result as AuthenticatedUser;
    const target = credentials.rememberMe ? window.localStorage : window.sessionStorage;
    const other = credentials.rememberMe ? window.sessionStorage : window.localStorage;
    target.setItem(AUTH_KEY, "1"); target.setItem(USER_KEY, JSON.stringify(user));
    other.removeItem(AUTH_KEY); other.removeItem(USER_KEY);
    return user;
  },
  async register(data: RegistrationData) {
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json() as { message?: string };
      return { ok: response.ok, message: result.message };
    } catch { return { ok: false, message: "Unable to reach the registration service." }; }
  },
  isAuthenticated() { return getStorages().some(storage => storage.getItem(AUTH_KEY) === "1"); },
  async logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* Local cleanup still completes. */ }
    getStorages().forEach(storage => { storage.removeItem(AUTH_KEY); storage.removeItem(USER_KEY); });
  },
};
