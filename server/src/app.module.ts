import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { SessionGuard } from "./auth/session.guard.js";
import { HealthController } from "./health.controller.js";
import { LobbiesController } from "./lobbies/lobbies.controller.js";
import { LobbiesService } from "./lobbies/lobbies.service.js";
import { PrismaService } from "./prisma.service.js";
import { ObjectStorageService } from "./profiles/object-storage.service.js";
import { ProfilesController } from "./profiles/profiles.controller.js";
import { ProfilesService } from "./profiles/profiles.service.js";
import { RealtimeGateway } from "./realtime/realtime.gateway.js";
import { GamesController } from "./game/games.controller.js";
import { GamesService } from "./game/games.service.js";
import { TurnTimerService } from "./game/turn-timer.service.js";
import { PresenceService } from "./realtime/presence.service.js";
import { RedisService } from "./redis.service.js";
import { LobbyLifecycleService } from "./lobbies/lobby-lifecycle.service.js";
import { StatisticsService } from "./profiles/statistics.service.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 180 }])],
  controllers: [HealthController, AuthController, ProfilesController, LobbiesController, GamesController],
  providers: [
    PrismaService,
    RedisService,
    PresenceService,
    LobbyLifecycleService,
    AuthService,
    SessionGuard,
    ProfilesService,
    StatisticsService,
    ObjectStorageService,
    LobbiesService,
    RealtimeGateway,
    GamesService,
    TurnTimerService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}
