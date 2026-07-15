import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createClient } from "redis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
  private connecting?: Promise<void>;

  onModuleInit() { return this.ready(); }

  async onModuleDestroy() {
    if (this.client.isOpen) await this.client.quit();
  }

  async schedule(key: string, value: string, deadline: Date) {
    await this.ready();
    await this.client.zAdd(key, [{ score: deadline.getTime(), value }]);
  }

  async unschedule(key: string, value: string) {
    await this.ready();
    await this.client.zRem(key, value);
  }

  async due(key: string, now: number) {
    await this.ready();
    return this.client.zRangeByScore(key, 0, now);
  }

  async withLock<T>(key: string, action: () => Promise<T>): Promise<T | undefined> {
    await this.ready();
    const token = randomUUID();
    const lockKey = `lock:${key}`;
    let acquired: string | null = null;
    for (let attempt = 0; attempt < 20 && !acquired; attempt += 1) {
      acquired = await this.client.set(lockKey, token, { NX: true, PX: 5_000 });
      if (!acquired) await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (!acquired) return undefined;
    try { return await action(); }
    finally { await this.client.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", { keys: [lockKey], arguments: [token] }); }
  }

  private async ready() {
    if (this.client.isOpen) return;
    this.connecting ??= this.client.connect().then(() => undefined);
    await this.connecting;
  }
}
