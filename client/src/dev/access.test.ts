import { describe, expect, it } from "vitest";
import { isDevAuthorized, isDevPath, parseDevRoute } from "./access.js";

describe("Dev-Route-Berechtigung", () => {
  it("lässt nur eingeloggte Admin-Konten zu", () => {
    expect(isDevAuthorized({ isAdmin: true })).toBe(true);
    expect(isDevAuthorized({ isAdmin: false })).toBe(false);
    expect(isDevAuthorized(null)).toBe(false);
    expect(isDevAuthorized(undefined)).toBe(false);
  });
});

describe("Dev-Route-Erkennung", () => {
  it("erkennt Dev- und Design-Pfade in Pfad- und Hash-Form", () => {
    expect(isDevPath("/dev", "")).toBe(true);
    expect(isDevPath("/dev/Avatar", "")).toBe(true);
    expect(isDevPath("/design/piles", "")).toBe(true);
    expect(isDevPath("/", "#/dev/Avatar")).toBe(true);
    expect(isDevPath("/", "")).toBe(false);
    expect(isDevPath("/lobby", "")).toBe(false);
  });
});

describe("Dev-Route-Auflösung", () => {
  it("liefert die Galerie ohne konkrete Komponente", () => {
    expect(parseDevRoute("/dev", "")).toEqual({ kind: "gallery" });
    expect(parseDevRoute("/dev/", "")).toEqual({ kind: "gallery" });
  });

  it("liest die Komponenten-ID aus Pfad oder Hash", () => {
    expect(parseDevRoute("/dev/Avatar", "")).toEqual({ kind: "component", id: "Avatar" });
    expect(parseDevRoute("/", "#/dev/PileStack")).toEqual({ kind: "component", id: "PileStack" });
  });

  it("bildet die Design-Route auf die PileDesignView-Vorschau ab", () => {
    expect(parseDevRoute("/design/piles", "")).toEqual({ kind: "component", id: "PileDesignView" });
    expect(parseDevRoute("/", "#/design/piles")).toEqual({ kind: "component", id: "PileDesignView" });
  });
});
