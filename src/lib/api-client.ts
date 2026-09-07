export type ApiOptions = RequestInit & { token?: string };

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
