import { describe, expect, it } from "vitest";
import { normalizeParticipantVolume } from "./voiceChat.js";

describe("Teilnehmerlautstärke", () => {
  it("begrenzt Werte auf den gültigen Web-Audio-Bereich", () => {
    expect(normalizeParticipantVolume(-0.2)).toBe(0);
    expect(normalizeParticipantVolume(0.45)).toBe(0.45);
    expect(normalizeParticipantVolume(1.8)).toBe(1);
  });

  it("fällt bei ungültigen Werten auf volle Lautstärke zurück", () => {
    expect(normalizeParticipantVolume(Number.NaN)).toBe(1);
    expect(normalizeParticipantVolume(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
