import type { AuthenticatedUser, SessionUser } from "@/models/user.model";

export const authService = {
  async getSession(): Promise<SessionUser | null> {
    const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error("Unable to verify your session.");
    const payload = await response.json() as { user?: SessionUser | null };
    return payload.user ?? null;
  },
  async login(identifier: string, password: string, rememberMe: boolean): Promise<AuthenticatedUser> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    const payload = await response.json().catch(() => ({} as { message?: string; user?: AuthenticatedUser }));
    if (!response.ok || !payload.user) throw new Error(payload.message ?? "Unable to sign in.");
    return payload.user;
  },
  async logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    for (const storage of [window.localStorage, window.sessionStorage]) {
      storage.removeItem("medistores_auth");
      storage.removeItem("medistores_user");
      storage.removeItem("medistores_users");
    }
  },
};
