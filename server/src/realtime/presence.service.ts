import { Injectable } from "@nestjs/common";

@Injectable()
export class PresenceService {
  private readonly connections = new Map<string, Map<string, Set<string>>>();

  connect(code: string, userId: string, socketId: string) {
    const lobby = this.connections.get(code) ?? new Map<string, Set<string>>();
    const sockets = lobby.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    lobby.set(userId, sockets);
    this.connections.set(code, lobby);
  }

  disconnect(code: string, userId: string, socketId: string) {
    const lobby = this.connections.get(code);
    const sockets = lobby?.get(userId);
    sockets?.delete(socketId);
    if (sockets?.size === 0) lobby?.delete(userId);
    if (lobby?.size === 0) this.connections.delete(code);
    return !this.isConnected(code, userId);
  }

  isConnected(code: string, userId: string) {
    return (this.connections.get(code)?.get(userId)?.size ?? 0) > 0;
  }

  connectedCount(code: string) {
    return this.connections.get(code)?.size ?? 0;
  }
}
