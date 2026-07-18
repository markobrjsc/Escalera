import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { GameState } from "../game/game-state.js";
import { createInitialGameState, toPlayerGameView } from "../game/game-state.js";
import { PrismaService } from "../prisma.service.js";
import { CreateLobbyDto } from "./lobby.dto.js";
import { PresenceService } from "../realtime/presence.service.js";
import { LobbyLifecycleService } from "./lobby-lifecycle.service.js";
import { StatisticsService } from "../profiles/statistics.service.js";

const lobbyInclude = {
  host: { select: { id: true, username: true, avatarKey: true } },
  players: { include: { user: { select: { id: true, username: true, avatarKey: true } } }, orderBy: { joinedAt: "asc" as const } },
  game: true
};

@Injectable()
export class LobbiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly lifecycle: LobbyLifecycleService,
    private readonly statistics: StatisticsService
  ) {}

  async create(userId: string, input: CreateLobbyDto) {
    await this.assertNoOtherLobby(userId);
    const code = await this.newCode();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } });
    return this.prisma.lobby.create({
      data: { ...input, name: input.name?.trim() || `${user.username}'s Lobby`, code, hostId: userId, players: { create: { userId } } },
      include: lobbyInclude
    });
  }

  async listOpen(search?: string) {
    const query = search?.trim();
    const lobbies = await this.prisma.lobby.findMany({
      where: {
        status: "OPEN",
        ...(query ? { OR: [{ code: { contains: query.toUpperCase() } }, { name: { contains: query, mode: "insensitive" } }, { host: { username: { contains: query, mode: "insensitive" } } }] } : {})
      },
      include: lobbyInclude,
      orderBy: { createdAt: "desc" },
      take: 30
    });
    return lobbies.map((lobby) => this.publicLobby(lobby));
  }

  async join(userId: string, code: string) {
    const lobby = await this.getLobby(code);
    if (lobby.status !== "OPEN") throw new BadRequestException("Diese Lobby ist nicht mehr offen.");
    if (lobby.players.some((player) => player.userId === userId)) return lobby;
    await this.assertNoOtherLobby(userId);
    if (lobby.players.length >= lobby.maxPlayers) throw new BadRequestException("Die Lobby ist voll.");
    return this.prisma.lobby.update({
      where: { id: lobby.id },
      data: { players: { create: { userId } } },
      include: lobbyInclude
    });
  }

  async setReady(userId: string, code: string, ready: boolean) {
    const lobby = await this.getLobby(code);
    const player = lobby.players.find((entry) => entry.userId === userId);
    if (!player) throw new ForbiddenException("Du bist nicht Mitglied dieser Lobby.");
    await this.prisma.lobbyPlayer.update({ where: { id: player.id }, data: { ready } });
    const updatedLobby = await this.getLobby(code);
    if (ready && updatedLobby.status === "OPEN" && updatedLobby.players.length >= 2 && updatedLobby.players.every((entry) => entry.ready)) {
      await this.createGame(updatedLobby);
      return this.getLobby(code);
    }
    return updatedLobby;
  }

  async updateSettings(userId: string, code: string, input: CreateLobbyDto) {
    const lobby = await this.getLobby(code);
    if (lobby.hostId !== userId) throw new ForbiddenException("Nur der Gastgeber kann Einstellungen ändern.");
    if (lobby.status !== "OPEN") throw new BadRequestException("Die Partie wurde bereits gestartet.");
    if (input.maxPlayers < lobby.players.length) throw new BadRequestException("Das Spielerlimit ist kleiner als die aktuelle Spielerzahl.");
    return this.prisma.lobby.update({ where: { id: lobby.id }, data: input, include: lobbyInclude });
  }

  async leave(userId: string, code: string) {
    const lobby = await this.getLobby(code);
    const player = lobby.players.find((entry) => entry.userId === userId);
    if (!player) throw new ForbiddenException("Du bist nicht Mitglied dieser Lobby.");
    const remaining = lobby.players.filter((entry) => entry.userId !== userId);
    if (remaining.length === 0) {
      await this.prisma.lobby.delete({ where: { id: lobby.id } });
      await this.lifecycle.cancel(lobby.code);
      return { deleted: true as const, code: lobby.code };
    }
    await this.prisma.$transaction([
      this.prisma.lobbyPlayer.delete({ where: { id: player.id } }),
      ...(lobby.hostId === userId ? [this.prisma.lobby.update({ where: { id: lobby.id }, data: { hostId: remaining[0].userId } })] : [])
    ]);
    return { deleted: false as const, code: lobby.code, lobby: await this.getLobby(lobby.code) };
  }

  async start(userId: string, code: string) {
    const lobby = await this.getLobby(code);
    if (lobby.hostId !== userId) throw new ForbiddenException("Nur der Gastgeber kann starten.");
    if (lobby.status !== "OPEN") throw new BadRequestException("Diese Lobby wurde bereits gestartet.");
    if (lobby.players.length < 2) throw new BadRequestException("Mindestens zwei Spieler werden benötigt.");
    if (!lobby.players.every((player) => player.ready)) throw new BadRequestException("Alle Spieler müssen bereit sein.");

    await this.createGame(lobby);
    return this.getLobby(code);
  }

  private async createGame(lobby: Awaited<ReturnType<LobbiesService["getLobby"]>>) {
    const state = createInitialGameState(lobby.players.map((player) => player.userId), lobby.jokersPerPlayer, undefined, lobby.maxTurnSeconds);
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.lobby.updateMany({ where: { id: lobby.id, status: "OPEN" }, data: { status: "ACTIVE" } });
      if (updated.count !== 1) return;
      await transaction.game.create({ data: { lobbyId: lobby.id, state: state as unknown as Prisma.InputJsonValue } });
      await this.statistics.recordGameStarted(transaction, lobby.players.map((player) => player.userId));
    });
  }

  async getView(userId: string, code: string) {
    const lobby = await this.getLobby(code);
    if (!lobby.players.some((player) => player.userId === userId)) throw new ForbiddenException("Du bist nicht Mitglied dieser Lobby.");
    return this.publicLobby(lobby);
  }

  async getCurrent(userId: string) {
    const membership = await this.prisma.lobbyPlayer.findUnique({ where: { userId }, include: { lobby: { include: lobbyInclude } } });
    if (!membership) return null;
    return this.publicLobby(membership.lobby);
  }

  async getGameView(userId: string, code: string) {
    const lobby = await this.getLobby(code);
    if (!lobby.players.some((player) => player.userId === userId)) throw new ForbiddenException("Du bist nicht Mitglied dieser Lobby.");
    if (!lobby.game) throw new NotFoundException("Für diese Lobby gibt es noch keine Partie.");
    return { version: lobby.game.version, state: toPlayerGameView(lobby.game.state as unknown as GameState, userId) };
  }

  async getRealtimeUpdate(code: string) {
    const lobby = await this.getLobby(code);
    return { lobby: this.publicLobby(lobby), playerIds: lobby.players.map((player) => player.userId) };
  }

  private async getLobby(code: string) {
    const lobby = await this.prisma.lobby.findUnique({ where: { code: code.toUpperCase() }, include: lobbyInclude });
    if (!lobby) throw new NotFoundException("Lobby nicht gefunden.");
    return lobby;
  }

  private publicLobby(lobby: Awaited<ReturnType<LobbiesService["getLobby"]>>) {
    return {
      code: lobby.code,
      name: lobby.name,
      status: lobby.status,
      host: lobby.host,
      settings: {
        maxPlayers: lobby.maxPlayers,
        jokersPerPlayer: lobby.jokersPerPlayer,
        maxTurnSeconds: lobby.maxTurnSeconds,
        streetsRequireSameSuit: lobby.streetsRequireSameSuit,
        confirmTurnEnd: lobby.confirmTurnEnd
      },
      players: lobby.players.map((player) => ({ user: player.user, ready: player.ready, connected: this.presence.isConnected(lobby.code, player.userId) }))
    };
  }

  private async newCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomBytes(3).toString("hex").toUpperCase();
      if (!(await this.prisma.lobby.findUnique({ where: { code }, select: { id: true } }))) return code;
    }
    throw new BadRequestException("Lobby-Code konnte nicht erzeugt werden.");
  }

  private async assertNoOtherLobby(userId: string) {
    const membership = await this.prisma.lobbyPlayer.findUnique({ where: { userId }, select: { lobby: { select: { code: true } } } });
    if (membership) throw new ConflictException(`Du bist bereits Mitglied der Lobby ${membership.lobby.code}.`);
  }
}
