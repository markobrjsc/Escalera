import type { User } from "../lib/types.js";

// Pure routing/authorisation helpers for the dev component gallery (#89). Kept
// free of React so they can be unit-tested directly.

export type DevRoute = { kind: "gallery" } | { kind: "component"; id: string };

// Only logged-in admin accounts may open the dev routes. Everyone else — guests
// and normal players — is redirected to the main screen.
export function isDevAuthorized(user: Pick<User, "isAdmin"> | null | undefined): boolean {
  return Boolean(user?.isAdmin);
}

function normalize(value: string): string {
  return value.replace(/^#/, "").replace(/\/+$/, "");
}

// A request targets the dev system when it points at /dev, /dev/<id> or the
// legacy /design/piles lab (path or hash form).
export function isDevPath(pathname: string, hash: string): boolean {
  const path = normalize(pathname);
  const hashPath = normalize(hash);
  const matches = (value: string) => value === "/dev" || value.startsWith("/dev/") || value === "/design/piles";
  return matches(path) || matches(hashPath);
}

// Resolve which preview to show: a specific component or the gallery overview.
export function parseDevRoute(pathname: string, hash: string): DevRoute {
  const path = normalize(pathname);
  const hashPath = normalize(hash);
  if (path === "/design/piles" || hashPath === "/design/piles") return { kind: "component", id: "PileDesignView" };
  const fromHash = hashPath.startsWith("/dev/") ? hashPath.slice("/dev/".length) : "";
  const fromPath = path.startsWith("/dev/") ? path.slice("/dev/".length) : "";
  const id = fromHash || fromPath;
  return id ? { kind: "component", id } : { kind: "gallery" };
}
