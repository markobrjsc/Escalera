import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/auth/auth.service.js";

function setup() {
  const createdUser = { id: "user", username: "NeuerName", avatarKey: null, tutorialCompleted: false };
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
    expect(prisma.session.create).toHaveBeenCalledOnce();
  });
});
