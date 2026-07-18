import { describe, expect, it } from "vitest";
import { PresenceService } from "../src/realtime/presence.service.js";

describe("Lobby-Präsenz", () => {
  it("setzt einen Spieler erst nach Trennung seiner letzten Socket-Verbindung offline", () => {
    const presence = new PresenceService();
    presence.connect("ABC", "p1", "socket-1");
    presence.connect("ABC", "p1", "socket-2");
    presence.connect("ABC", "p2", "socket-3");
    expect(presence.connectedUserIds("ABC")).toEqual(["p1", "p2"]);
    presence.disconnect("ABC", "p2", "socket-3");
    expect(presence.connectedCount("ABC")).toBe(1);
    expect(presence.disconnect("ABC", "p1", "socket-1")).toBe(false);
    expect(presence.isConnected("ABC", "p1")).toBe(true);
    expect(presence.disconnect("ABC", "p1", "socket-2")).toBe(true);
    expect(presence.connectedCount("ABC")).toBe(0);
  });
});
