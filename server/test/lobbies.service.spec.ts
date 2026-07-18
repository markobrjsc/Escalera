import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LobbiesService } from "../src/lobbies/lobbies.service.js";

describe("Spielstart-Statistik", () => {
  it("nutzt den OPEN-ACTIVE-Wechsel als Idempotenzgrenze", async () => {
    const transaction = {
      lobby: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }) },
      game: { create: vi.fn() },
      userStatistic: { upsert: vi.fn() }
    };
    const prisma = { $transaction: vi.fn(async (work: (tx: typeof transaction) => Promise<void>) => work(transaction)) };
    const statistics = { recordGameStarted: vi.fn() };
    const service = new LobbiesService(prisma as never, {} as never, {} as never, statistics as never);
    const lobby = {
      id: "lobby-1",
      code: "ABC123",
      jokersPerPlayer: 1,
      maxTurnSeconds: null,
      players: [{ userId: "p1" }, { userId: "p2" }]
    };
    const createGame = (service as unknown as { createGame(value: typeof lobby): Promise<void> }).createGame.bind(service);

    await createGame(lobby);
    await createGame(lobby);

    expect(transaction.game.create).toHaveBeenCalledTimes(1);
    expect(statistics.recordGameStarted).toHaveBeenCalledTimes(1);
    expect(statistics.recordGameStarted).toHaveBeenCalledWith(transaction, ["p1", "p2"]);
  });
});

describe("LobbiesService.kick", () => {
  const lobby = {
    id: "lobby-1",
    code: "ABC123",
    name: "Testlobby",
    hostId: "host",
    host: { id: "host", username: "Host", avatarKey: null },
    status: "OPEN",
    maxPlayers: 4,
    jokersPerPlayer: 1,
    maxTurnSeconds: 60,
    streetsRequireSameSuit: true,
    confirmTurnEnd: true,
    players: [
      { id: "membership-host", userId: "host", ready: false, user: { id: "host", username: "Host", avatarKey: null } },
      { id: "membership-guest", userId: "guest", ready: false, user: { id: "guest", username: "Guest", avatarKey: null } }
    ]
  };
  const playerDelete = vi.fn();
  const lobbyFindUnique = vi.fn();
  let service: LobbiesService;

  beforeEach(() => {
    vi.clearAllMocks();
    lobbyFindUnique.mockResolvedValue(lobby);
    playerDelete.mockResolvedValue({});
    service = new LobbiesService({
      lobby: { findUnique: lobbyFindUnique },
      lobbyPlayer: { delete: playerDelete }
    } as never, { isConnected: vi.fn().mockReturnValue(false) } as never, {} as never, {} as never);
  });

  it("entfernt als Gastgeber ein Lobby-Mitglied", async () => {
    const result = await service.kick("host", "abc123", "guest");

    expect(playerDelete).toHaveBeenCalledWith({ where: { id: "membership-guest" } });
    expect(result.code).toBe("ABC123");
    expect(result.lobby.settings.maxPlayers).toBe(4);
  });

  it("weist Kick-Versuche anderer Mitglieder zurück", async () => {
    await expect(service.kick("guest", "ABC123", "host")).rejects.toBeInstanceOf(ForbiddenException);
    expect(playerDelete).not.toHaveBeenCalled();
  });

  it("lässt den Gastgeber nicht sich selbst kicken", async () => {
    await expect(service.kick("host", "ABC123", "host")).rejects.toBeInstanceOf(BadRequestException);
    expect(playerDelete).not.toHaveBeenCalled();
  });
});
