import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "escalera_session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function normalizeUsername(username: string): string {
  return username.trim().normalize("NFKC").toLocaleLowerCase("de-DE");
}

// Admin accounts are configured through the ADMIN_USERNAMES env var (comma or
// whitespace separated). The comparison runs on normalized usernames so the
// allowlist matches regardless of casing or surrounding whitespace. An empty
// or missing list means there is no admin — the dev routes stay closed.
export function adminUsernameSet(): Set<string> {
  return new Set(
    (process.env.ADMIN_USERNAMES ?? "")
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => normalizeUsername(entry))
  );
}

export function isAdminUsername(username: string): boolean {
  const admins = adminUsernameSet();
  return admins.size > 0 && admins.has(normalizeUsername(username));
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
