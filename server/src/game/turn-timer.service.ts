import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { RealtimeGateway } from "../realtime/realtime.gateway.js";
import { GamesService } from "./games.service.js";

@Injectable()
export class TurnTimerService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly games: GamesService, private readonly realtime: RealtimeGateway) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 500);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const changedCodes = await this.games.expireDueTurns();
      await Promise.all(changedCodes.map((code) => this.realtime.publishLobby(code)));
    } finally {
      this.running = false;
    }
  }
}
