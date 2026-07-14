import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "escalera_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function normalizeUsername(username: string): string {
  return username.trim().normalize("NFKC").toLocaleLowerCase("de-DE");
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
