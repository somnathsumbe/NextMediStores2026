import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RegistrationData } from "@/types/auth";

export type StoredUser = Omit<RegistrationData, "confirmPassword"> & { createdAt: string };
const usersPath = path.join(process.cwd(), "src", "data", "users.json");

export async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(usersPath, "utf8");
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users as StoredUser[] : [];
  } catch {
    return [];
  }
}

export async function writeUsers(users: StoredUser[]) {
  await writeFile(usersPath, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}
