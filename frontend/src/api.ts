export type Role = "admin" | "user";
export type Theme = "light" | "dark" | "system";
export type User = {
  id: string; email: string; display_name: string; role: Role;
  is_active: boolean; theme: Theme; created_at: string;
};
export type AirfoilKind = "conventional" | "kfm1" | "kfm2" | "kfm4";
export type Airfoil = {
  id: string; name: string; kind: AirfoilKind; description: string | null;
  coordinates: number[][]; parameters: Record<string, number | string>;
  is_active: boolean; created_at: string;
};

let csrfToken = "";
export const setCsrf = (token: string) => { csrfToken = token; };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
  const response = await fetch(`/api/v1${path}`, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Die Anfrage ist fehlgeschlagen.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
