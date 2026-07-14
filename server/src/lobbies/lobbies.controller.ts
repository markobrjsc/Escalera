import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
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
