import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service.js";
import { SESSION_COOKIE } from "../auth/auth.types.js";
import { LobbiesService } from "../lobbies/lobbies.service.js";
import { GamesService } from "../game/games.service.js";
import { PresenceService } from "./presence.service.js";
import { LobbyLifecycleService } from "../lobbies/lobby-lifecycle.service.js";

type WatchLobbyPayload = { code?: string };
type RealtimeSocket = Socket & { data: { userId?: string; watchedCodes?: Set<string> } };

@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: process.env.CLIENT_ORIGIN ?? false, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly lobbies: LobbiesService,
    private readonly games: GamesService,
    private readonly presence: PresenceService,
    private readonly lifecycle: LobbyLifecycleService
  ) {
    this.lifecycle.onDeleted((code) => {
      this.server?.to(this.room(code)).emit("lobby:deleted", { code, reason: "expired" });
      this.publishLobbyList();
    });
  }

  async handleConnection(client: RealtimeSocket) {
    const token = this.readCookie(client.handshake.headers.cookie, SESSION_COOKIE);
    const user = await this.auth.getSessionUser(token);
    if (!user) return client.disconnect(true);
    client.data.userId = user.id;
    client.join(this.authenticatedRoom());
    client.emit("realtime:connected", { user });
  }

  async handleDisconnect(client: RealtimeSocket) {
    if (!client.data.userId) return;
    await Promise.all([...(client.data.watchedCodes ?? [])].map((code) => this.disconnectFromLobby(client, code)));
  }

  @SubscribeMessage("lobby:watch")
  async watchLobby(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: WatchLobbyPayload) {
    const code = input?.code?.toUpperCase();
    if (!code || !client.data.userId) return;
    await this.lobbies.getView(client.data.userId, code);
    if (client.data.watchedCodes?.has(code)) return;
    client.join(this.room(code));
    client.join(this.playerRoom(code, client.data.userId));
    client.data.watchedCodes ??= new Set<string>();
    client.data.watchedCodes.add(code);
    this.presence.connect(code, client.data.userId, client.id);
    await this.publishLobby(code);
  }

  @SubscribeMessage("lobby:unwatch")
  async unwatchLobby(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: WatchLobbyPayload) {
    const code = input?.code?.toUpperCase();
    if (!code || !client.data.userId) return;
    await this.disconnectFromLobby(client, code);
  }

  async publishLobby(code: string) {
    const update = await this.lobbies.getRealtimeUpdate(code);
    this.server.to(this.room(code)).emit("lobby:update", update.lobby);
    await Promise.all(update.playerIds.map((userId) => this.emitGameToPlayer(code, userId)));
    await this.lifecycle.refresh(code);
    this.publishLobbyList();
  }

  publishLobbyList() {
    this.server?.to(this.authenticatedRoom()).emit("lobbies:update", { changedAt: new Date().toISOString() });
  }

  private async emitGameToPlayer(code: string, userId: string) {
    try {
      const game = await this.lobbies.getGameView(userId, code);
      this.server.to(this.playerRoom(code, userId)).emit("game:update", game);
    } catch {
      // Vor dem Spielstart gibt es bewusst noch keinen privaten Spielzustand.
    }
  }

  private async disconnectFromLobby(client: RealtimeSocket, code: string) {
    const userId = client.data.userId;
    if (!userId || !client.data.watchedCodes?.delete(code)) return;
    client.leave(this.room(code));
    client.leave(this.playerRoom(code, userId));
    const fullyDisconnected = this.presence.disconnect(code, userId, client.id);
    if (!fullyDisconnected) return;
    try {
      await this.games.skipDisconnected(code, userId);
      await this.publishLobby(code);
    } catch {
      // Die Lobby kann durch bewusstes Verlassen bereits entfernt worden sein.
    }
  }

  private room(code: string) {
    return `lobby:${code}`;
  }

  private authenticatedRoom() {
    return "authenticated";
  }

  private playerRoom(code: string, userId: string) {
    return `lobby:${code}:player:${userId}`;
  }

  private readCookie(header: string | undefined, name: string) {
    const entry = header?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
  }
}
