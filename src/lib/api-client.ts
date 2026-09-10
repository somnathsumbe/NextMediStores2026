export type ApiOptions = Omit<RequestInit, "body"> & { body?: BodyInit | Record<string, unknown>; token?: string };
export class ApiError extends Error { constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; } }

const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const jsonBody = options.body && typeof options.body === "object" && !(options.body instanceof FormData);
  if (jsonBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
  const { body, token: _token, ...requestOptions } = options;
  const requestBody: BodyInit | undefined = body && typeof body === "object" && !(body instanceof FormData)
    ? JSON.stringify(body)
    : body as BodyInit | undefined;
  const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, { ...requestOptions, body: requestBody, headers, credentials: "include", cache: "no-store" });
  const result = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
  if (!response.ok) throw new ApiError(result?.message ?? `API request failed: ${response.status}`, response.status);
  return result as T;
}
