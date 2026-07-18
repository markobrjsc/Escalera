import { describe, expect, it, vi } from "vitest";
import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";

function createGateway(playerIds = ["host", "guest"]) {
  const emit = vi.fn();
  const to = vi.fn().mockReturnValue({ emit });
  const lobbies = { getRealtimeUpdate: vi.fn().mockResolvedValue({ playerIds }) };
  const lifecycle = { onDeleted: vi.fn() };
  const gateway = new RealtimeGateway({} as never, lobbies as never, {} as never, {} as never, lifecycle as never);
  gateway.server = { to } as never;
  return { gateway, emit, to, lobbies };
}

describe("Voice-Signalisierung", () => {
  it("leitet ein Signal nur in den privaten Raum des Lobby-Mitglieds", async () => {
    const { gateway, emit, to } = createGateway();
    const client = { data: { userId: "host", watchedCodes: new Set(["ABC123"]) } };
    const description = { type: "offer", sdp: "test-offer" };

    await gateway.relayVoiceSignal(client as never, { code: "abc123", targetUserId: "guest", description });

    expect(to).toHaveBeenCalledWith("lobby:ABC123:player:guest");
    expect(emit).toHaveBeenCalledWith("voice:signal", { code: "ABC123", senderUserId: "host", description });
  });

  it("ignoriert Signale außerhalb der beobachteten Lobby", async () => {
    const { gateway, emit, lobbies } = createGateway();
    const client = { data: { userId: "host", watchedCodes: new Set<string>() } };

    await gateway.relayVoiceSignal(client as never, { code: "ABC123", targetUserId: "guest", candidate: { candidate: "test" } });

    expect(lobbies.getRealtimeUpdate).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it("ignoriert Ziele, die nicht zur Lobby gehören", async () => {
    const { gateway, emit } = createGateway(["host"]);
    const client = { data: { userId: "host", watchedCodes: new Set(["ABC123"]) } };

    await gateway.relayVoiceSignal(client as never, { code: "ABC123", targetUserId: "outsider", candidate: { candidate: "test" } });

    expect(emit).not.toHaveBeenCalled();
  });
});
