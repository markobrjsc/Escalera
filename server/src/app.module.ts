import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { SessionGuard } from "./auth/session.guard.js";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma.service.js";
import { ObjectStorageService } from "./profiles/object-storage.service.js";
import { ProfilesController } from "./profiles/profiles.controller.js";
import { ProfilesService } from "./profiles/profiles.service.js";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [HealthController, AuthController, ProfilesController],
  providers: [
    PrismaService,
    AuthService,
    SessionGuard,
    ProfilesService,
    ObjectStorageService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}
