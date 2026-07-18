import { describe, expect, it } from "vitest";
import { applySelfMute, normalizeParticipantVolume, readSelfMuted, writeSelfMuted } from "./voiceChat.js";

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

  it("deaktiviert ausschließlich die sendenden Mikrofon-Tracks", () => {
    const tracks = [{ enabled: true }, { enabled: true }];
    const stream = { getAudioTracks: () => tracks } as unknown as Pick<MediaStream, "getAudioTracks">;

    applySelfMute(stream, true);
    expect(tracks.every((track) => !track.enabled)).toBe(true);
    applySelfMute(stream, false);
    expect(tracks.every((track) => track.enabled)).toBe(true);
  });

  it("bewahrt Self-Mute über einen Reconnect hinweg auf", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };

    writeSelfMuted(storage, true);
    expect(readSelfMuted(storage)).toBe(true);
    writeSelfMuted(storage, false);
    expect(readSelfMuted(storage)).toBe(false);
  });
});
