import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";
import { isAdminUsername } from "../src/auth/auth.types.js";

function setup() {
  const createdUser = { id: "user", username: "NeuerName", avatarKey: null, tutorialCompleted: false, tutorialStep: 0, tutorialReadMask: 0 };
  const prisma = {
    user: { findUnique: vi.fn(async () => null), create: vi.fn(async () => createdUser) },
    session: { create: vi.fn(async () => ({})) }
  };
  return { service: new AuthService(prisma as never), prisma };
}

describe("bewusste Registrierung", () => {
  it("legt ohne Passwortwiederholung und Verlustbestätigung kein Konto an", async () => {
    const { service, prisma } = setup();
    await expect(service.access({ username: "NeuerName", password: "sehr-sicheres-passwort" })).rejects.toThrow("Passwörter stimmen nicht überein");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("registriert nach vollständiger Bestätigung und kennzeichnet die Antwort", async () => {
    const { service, prisma } = setup();
    const result = await service.access({
      username: "NeuerName",
      password: "sehr-sicheres-passwort",
      passwordConfirmation: "sehr-sicheres-passwort",
      acceptPasswordLoss: true
    });
    expect(result.created).toBe(true);
    expect(result.user.tutorialCompleted).toBe(false);
    expect(result.user.tutorialStep).toBe(0);
    expect(result.user.tutorialReadMask).toBe(0);
    expect(prisma.session.create).toHaveBeenCalledOnce();
  });
});

describe("Admin-Erkennung", () => {
  afterEach(() => { delete process.env.ADMIN_USERNAMES; });

  it("erkennt in der Allowlist gelistete Konten unabhängig von Schreibweise und Leerraum", () => {
    process.env.ADMIN_USERNAMES = "Marko, spielleitung";
    expect(isAdminUsername("marko")).toBe(true);
    expect(isAdminUsername("  SPIELLEITUNG ")).toBe(true);
    expect(isAdminUsername("gast")).toBe(false);
  });

  it("kennzeichnet den öffentlichen Nutzer als Admin nur bei Allowlist-Treffer", () => {
    const { service } = setup();
    process.env.ADMIN_USERNAMES = "marko";
    expect(service.publicUser({ id: "1", username: "Marko" }).isAdmin).toBe(true);
    expect(service.publicUser({ id: "2", username: "Gast" }).isAdmin).toBe(false);
  });

  it("liefert gespeicherten Tutorial-Fortschritt in eigenen Benutzerantworten", () => {
    const { service } = setup();
    expect(service.publicUser({
      id: "1",
      username: "Marko",
      tutorialCompleted: true,
      tutorialStep: 9,
      tutorialReadMask: 767
    })).toMatchObject({ tutorialCompleted: true, tutorialStep: 9, tutorialReadMask: 767 });
  });

  it("macht ohne Allowlist niemanden zum Admin", () => {
    expect(isAdminUsername("marko")).toBe(false);
  });
});
