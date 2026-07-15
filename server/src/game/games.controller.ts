import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AuthenticatedRequest, SessionGuard } from "../auth/session.guard.js";
import { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { CardIdDto, CardIdsDto, DrawCardDto, LayPhaseDto } from "./game-actions.dto.js";
import { GamesService } from "./games.service.js";

@Controller("games")
@UseGuards(SessionGuard)
@SkipThrottle()
export class GamesController {
  constructor(private readonly games: GamesService, private readonly realtime: RealtimeGateway) {}

  @Post(":code/draw")
  draw(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Body() input: DrawCardDto) {
    return this.execute(code, () => this.games.draw(request.user.id, code, input.source));
  }

  @Post(":code/phase")
  phase(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Body() input: LayPhaseDto) {
    return this.execute(code, () => this.games.phase(request.user.id, code, input.combinations));
  }

  @Post(":code/melds")
  meld(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Body() input: CardIdsDto) {
    return this.execute(code, () => this.games.meld(request.user.id, code, input.cardIds));
  }

  @Post(":code/melds/:meldId/cards")
  addToMeld(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Param("meldId") meldId: string, @Body() input: CardIdDto) {
    return this.execute(code, () => this.games.addToMeld(request.user.id, code, meldId, input.cardId));
  }

  @Post(":code/discard")
  discard(@Req() request: AuthenticatedRequest, @Param("code") code: string, @Body() input: CardIdDto) {
    return this.execute(code, () => this.games.discard(request.user.id, code, input.cardId));
  }

  @Post(":code/buy")
  buy(@Req() request: AuthenticatedRequest, @Param("code") code: string) {
    return this.execute(code, () => this.games.buy(request.user.id, code));
  }

  private async execute<T>(code: string, action: () => Promise<T>) {
    const result = await action();
    await this.realtime.publishLobby(code);
    return result;
  }
}
