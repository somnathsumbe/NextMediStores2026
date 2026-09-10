import type { AuthenticatedUser } from "@/models/user.model";
import type { LoginCredentials, RegistrationData } from "@/types/auth";
import users from "@/data/users.json";

const AUTH_KEY = "medistores_auth";
const USER_KEY = "medistores_user";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorages(): StorageLike[] {
  if (typeof window === "undefined") return [];
  return [window.localStorage, window.sessionStorage];
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthenticatedUser> {
    if (typeof window === "undefined") throw new Error("Unable to sign in.");
    const registered = JSON.parse(localStorage.getItem("medistores_users") ?? "[]") as Array<typeof users[number]>;
    const user = [...users, ...registered].find(candidate => (candidate.username === credentials.identifier.trim().toLowerCase() || candidate.email === credentials.identifier.trim().toLowerCase()) && candidate.password === credentials.password);
    if (!user || !user.active) throw new Error("Invalid username or password.");
    const { password: _password, ...safeUser } = user;
    const target = credentials.rememberMe ? window.localStorage : window.sessionStorage;
    const other = credentials.rememberMe ? window.sessionStorage : window.localStorage;
    target.setItem(AUTH_KEY, "1"); target.setItem(USER_KEY, JSON.stringify(user));
    other.removeItem(AUTH_KEY); other.removeItem(USER_KEY);
    return user;
  },
  async register(data: RegistrationData) {
    if (typeof window === "undefined") return { ok: false, message: "Registration is available in the browser demo only." };
    if (data.password !== data.confirmPassword) return { ok: false, message: "Passwords do not match." };
    const registered = JSON.parse(localStorage.getItem("medistores_users") ?? "[]") as Array<typeof users[number]>;
    if ([...users, ...registered].some(user => user.email === data.email.trim().toLowerCase())) return { ok: false, message: "An account already exists with this email." };
    registered.push({ id: Date.now(), username: data.email.trim().toLowerCase(), email: data.email.trim().toLowerCase(), password: data.password, name: data.ownerName, role: data.role.toUpperCase(), active: true });
    localStorage.setItem("medistores_users", JSON.stringify(registered));
    return { ok: true, message: "Registration successful. You can now sign in." };
  },
  isAuthenticated() { return getStorages().some(storage => storage.getItem(AUTH_KEY) === "1"); },
  async logout() {
    getStorages().forEach(storage => { storage.removeItem(AUTH_KEY); storage.removeItem(USER_KEY); });
  },
};
