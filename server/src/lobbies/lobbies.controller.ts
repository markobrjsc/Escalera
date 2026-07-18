import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { CreateLobbyDto } from "./lobby.dto.js";
import { LobbiesService } from "./lobbies.service.js";
import { RealtimeGateway } from "../realtime/realtime.gateway.js";

@Controller("lobbies")
@UseGuards(SessionGuard)
export class LobbiesController {
  constructor(
    private readonly lobbies: LobbiesService,
    private readonly realtime: RealtimeGateway
  ) {}

  @Post()
  async create(@Req() request: AuthenticatedRequest, @Body() input: CreateLobbyDto) {
    const lobby = await this.lobbies.create(request.user.id, input);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Get()
  list(@Query("search") search?: string) {
    return this.lobbies.listOpen(search);
  }

  @Get("current")
  current(@Req() request: AuthenticatedRequest) {
    return this.lobbies.getCurrent(request.user.id);
  }

  @Post(":code/join")
  async join(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    const lobby = await this.lobbies.join(request.user.id, code);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Post(":code/ready")
  async ready(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    const lobby = await this.lobbies.setReady(request.user.id, code, true);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Post(":code/not-ready")
  async notReady(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    const lobby = await this.lobbies.setReady(request.user.id, code, false);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Post(":code/settings")
  async settings(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Body() input: CreateLobbyDto) {
    const lobby = await this.lobbies.updateSettings(request.user.id, code, input);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Post(":code/leave")
  async leave(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    const result = await this.lobbies.leave(request.user.id, code);
    if (!result.deleted) await this.realtime.publishLobby(result.code);
    return { deleted: result.deleted };
  }

  @Post(":code/players/:userId/kick")
  async kick(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Param("userId") userId: string) {
    const result = await this.lobbies.kick(request.user.id, code, userId);
    await this.realtime.evictPlayer(result.code, userId, "kicked");
    await this.realtime.publishLobby(result.code);
    return result.lobby;
  }

  @Post(":code/start")
  async start(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    const lobby = await this.lobbies.start(request.user.id, code);
    await this.realtime.publishLobby(lobby.code);
    return lobby;
  }

  @Get(":code")
  getLobby(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.getView(request.user.id, code);
  }

  @Get(":code/game")
  getGame(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.getGameView(request.user.id, code);
  }
}
