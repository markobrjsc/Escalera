import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service.js";
import { SESSION_COOKIE } from "../auth/auth.types.js";
import { LobbiesService } from "../lobbies/lobbies.service.js";

type WatchLobbyPayload = { code?: string };
type RealtimeSocket = Socket & { data: { userId?: string } };

@WebSocketGateway({
  namespace: "/realtime",
  cors: { origin: process.env.CLIENT_ORIGIN ?? false, credentials: true }
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly lobbies: LobbiesService
  ) {}

  async handleConnection(client: RealtimeSocket) {
    const token = this.readCookie(client.handshake.headers.cookie, SESSION_COOKIE);
    const user = await this.auth.getSessionUser(token);
    if (!user) return client.disconnect(true);
    client.data.userId = user.id;
    client.emit("realtime:connected", { user });
  }

  @SubscribeMessage("lobby:watch")
  async watchLobby(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: WatchLobbyPayload) {
    const code = input?.code?.toUpperCase();
    if (!code || !client.data.userId) return;
    const view = await this.lobbies.getView(client.data.userId, code);
    client.join(this.room(code));
    client.join(this.playerRoom(code, client.data.userId));
    client.emit("lobby:update", view);
    await this.emitGameToPlayer(code, client.data.userId);
  }

  @SubscribeMessage("lobby:unwatch")
  unwatchLobby(@ConnectedSocket() client: RealtimeSocket, @MessageBody() input: WatchLobbyPayload) {
    const code = input?.code?.toUpperCase();
    if (!code || !client.data.userId) return;
    client.leave(this.room(code));
    client.leave(this.playerRoom(code, client.data.userId));
  }

  async publishLobby(code: string) {
    const update = await this.lobbies.getRealtimeUpdate(code);
    this.server.to(this.room(code)).emit("lobby:update", update.lobby);
    await Promise.all(update.playerIds.map((userId) => this.emitGameToPlayer(code, userId)));
  }

  private async emitGameToPlayer(code: string, userId: string) {
    try {
      const game = await this.lobbies.getGameView(userId, code);
      this.server.to(this.playerRoom(code, userId)).emit("game:update", game);
    } catch {
      // Vor dem Spielstart gibt es bewusst noch keinen privaten Spielzustand.
    }
  }

  private room(code: string) {
    return `lobby:${code}`;
  }

  private playerRoom(code: string, userId: string) {
    return `lobby:${code}:player:${userId}`;
  }

  private readCookie(header: string | undefined, name: string) {
    const entry = header?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
  }
}
