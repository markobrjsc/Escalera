import { describe, expect, it, vi } from "vitest";
import { LobbyLifecycleService } from "../src/lobbies/lobby-lifecycle.service.js";

function setup() {
  let connected = 1;
  let lobby: { id: string; code: string; status: "ACTIVE" | "CLOSED"; expiresAt: Date | null } | null = { id: "l1", code: "ABC", status: "ACTIVE", expiresAt: null };
  const prisma = { lobby: {
    findUnique: vi.fn(async () => lobby),
    update: vi.fn(async ({ data }: { data: { expiresAt: Date } }) => { if (lobby) lobby.expiresAt = data.expiresAt; return lobby; }),
    updateMany: vi.fn(async ({ data }: { data: { expiresAt?: Date | null; status?: "CLOSED" } }) => { if (!lobby) return { count: 0 }; lobby = { ...lobby, ...data }; return { count: 1 }; }),
    deleteMany: vi.fn(async () => { const count = lobby ? 1 : 0; lobby = null; return { count }; })
  } };
  const redis = {
    schedule: vi.fn(async () => undefined), unschedule: vi.fn(async () => undefined), due: vi.fn(async () => ["ABC"]),
    withLock: vi.fn(async (_key: string, action: () => Promise<unknown>) => action())
  };
  const presence = { connectedCount: vi.fn(() => connected) };
  const service = new LobbyLifecycleService(prisma as never, redis as never, presence as never);
  return { service, prisma, redis, setConnected: (value: number) => { connected = value; }, getLobby: () => lobby };
}

describe("Lobby-Lebensdauer", () => {
  it("setzt bei zu wenigen Spielern zwei Minuten Frist und hebt sie bei Wiedereintritt auf", async () => {
    const context = setup();
    await context.service.refresh("ABC", 1_000);
    expect(context.getLobby()?.expiresAt?.getTime()).toBe(121_000);
    context.setConnected(2);
    await context.service.refresh("ABC", 2_000);
    expect(context.getLobby()?.expiresAt).toBeNull();
    expect(context.redis.unschedule).toHaveBeenCalled();
  });

  it("wendet die Zwei-Minuten-Frist auch auf eine noch offene Lobby an", async () => {
    const context = setup();
    const lobby = context.getLobby();
    if (lobby) lobby.status = "OPEN" as never;
    await context.service.refresh("ABC", 5_000);
    expect(context.getLobby()?.expiresAt?.getTime()).toBe(125_000);
  });

  it("löscht eine abgelaufene Lobby und benachrichtigt Listener", async () => {
    const context = setup();
    await context.service.refresh("ABC", 0);
    const listener = vi.fn();
    context.service.onDeleted(listener);
    await context.service.sweep(120_001);
    expect(context.getLobby()).toBeNull();
    expect(listener).toHaveBeenCalledWith("ABC");
  });
});
