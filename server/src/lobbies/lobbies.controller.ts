import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { CreateLobbyDto } from "./lobby.dto.js";
import { LobbiesService } from "./lobbies.service.js";

@Controller("lobbies")
@UseGuards(SessionGuard)
export class LobbiesController {
  constructor(private readonly lobbies: LobbiesService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateLobbyDto) {
    return this.lobbies.create(request.user.id, input);
  }

  @Post(":code/join")
  join(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.join(request.user.id, code);
  }

  @Post(":code/ready")
  ready(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.setReady(request.user.id, code, true);
  }

  @Post(":code/not-ready")
  notReady(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.setReady(request.user.id, code, false);
  }

  @Post(":code/start")
  start(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.lobbies.start(request.user.id, code);
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
