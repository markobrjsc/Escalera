import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { RedisService } from "../redis.service.js";
import { PresenceService } from "../realtime/presence.service.js";

const EXPIRATIONS = "escalera:lobby-expirations";
const ACTIVE_GRACE_MS = 2 * 60 * 1000;
const FINISHED_GRACE_MS = 5 * 60 * 1000;

@Injectable()
export class LobbyLifecycleService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly deletionListeners = new Set<(code: string) => void>();

  constructor(private readonly prisma: PrismaService, private readonly redis: RedisService, private readonly presence: PresenceService) {}

  async onModuleInit() {
    const scheduled = await this.prisma.lobby.findMany({ where: { expiresAt: { not: null } }, select: { code: true, expiresAt: true } });
    await Promise.all(scheduled.map((entry) => this.redis.schedule(EXPIRATIONS, entry.code, entry.expiresAt!)));
    this.timer = setInterval(() => void this.sweep(), 1_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  onDeleted(listener: (code: string) => void) {
    this.deletionListeners.add(listener);
    return () => this.deletionListeners.delete(listener);
  }

  async refresh(code: string, now = Date.now()) {
    await this.redis.withLock(`lobby-lifecycle:${code}`, () => this.refreshUnlocked(code, now));
  }

  async finish(code: string, now = Date.now()) {
    await this.redis.withLock(`lobby-lifecycle:${code}`, async () => {
      const expiresAt = new Date(now + FINISHED_GRACE_MS);
      const updated = await this.prisma.lobby.updateMany({ where: { code, status: "ACTIVE" }, data: { status: "CLOSED", expiresAt } });
      if (updated.count === 1) await this.redis.schedule(EXPIRATIONS, code, expiresAt);
    });
  }

  async cancel(code: string) {
    await this.redis.unschedule(EXPIRATIONS, code);
  }

  async sweep(now = Date.now()) {
    if (this.running) return;
    this.running = true;
    try {
      const codes = await this.redis.due(EXPIRATIONS, now);
      for (const code of codes) await this.redis.withLock(`lobby-lifecycle:${code}`, async () => {
        const lobby = await this.prisma.lobby.findUnique({ where: { code }, select: { id: true, status: true, expiresAt: true } });
        if (!lobby) return this.redis.unschedule(EXPIRATIONS, code);
        if (lobby.status !== "CLOSED" && this.presence.connectedCount(code) >= 2) {
          await this.clear(code);
          return;
        }
        if (!lobby.expiresAt || lobby.expiresAt.getTime() > now) return;
        const deleted = await this.prisma.lobby.deleteMany({ where: { id: lobby.id, expiresAt: { lte: new Date(now) } } });
        if (deleted.count === 1) {
          await this.redis.unschedule(EXPIRATIONS, code);
          for (const listener of this.deletionListeners) listener(code);
        }
      });
    } finally { this.running = false; }
  }

  private async refreshUnlocked(code: string, now: number) {
    const lobby = await this.prisma.lobby.findUnique({ where: { code }, select: { status: true, expiresAt: true } });
    if (!lobby) return;
    if (lobby.status === "CLOSED") {
      if (lobby.expiresAt) await this.redis.schedule(EXPIRATIONS, code, lobby.expiresAt);
      return;
    }
    if (this.presence.connectedCount(code) >= 2) return this.clear(code);
    if (lobby.expiresAt) return this.redis.schedule(EXPIRATIONS, code, lobby.expiresAt);
    const expiresAt = new Date(now + ACTIVE_GRACE_MS);
    await this.prisma.lobby.update({ where: { code }, data: { expiresAt } });
    await this.redis.schedule(EXPIRATIONS, code, expiresAt);
  }

  private async clear(code: string) {
    await this.prisma.lobby.updateMany({ where: { code, expiresAt: { not: null } }, data: { expiresAt: null } });
    await this.redis.unschedule(EXPIRATIONS, code);
  }
}
