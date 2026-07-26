// Shared HTTP access for every screen and component. Extracted verbatim from the
// former App.tsx (#89) so components can talk to the API without importing the
// root module.

export const API_URL = "/api";
// Guarded so the module can be imported in a non-browser context (e.g. unit
// tests that render components in isolation); the socket is only dialled in the
// browser anyway.
export const SOCKET_URL = typeof window !== "undefined" ? window.location.origin : "";

export class ApiError extends Error {
  constructor(message: string, readonly body: unknown) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}) {
  const jsonBody = options.body && !(options.body instanceof FormData);
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", headers: { ...(jsonBody ? { "content-type": "application/json" } : {}), ...options.headers }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Etwas ist schiefgelaufen.", body); }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

export function message(reason: unknown) { return reason instanceof Error ? reason.message : "Aktion konnte nicht ausgeführt werden."; }

export function hasSessionFlag(key: string | null) {
  if (!key) return false;
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}
