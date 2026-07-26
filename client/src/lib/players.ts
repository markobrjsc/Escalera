// Resolve a player's display name from the lobby roster. Shared by the game HUD,
// the event log and the result overlays. Extracted from the former App.tsx (#89).
import type { Lobby } from "./types.js";

export function playerName(lobby: Lobby, userId: string) {
  return lobby.players.find((entry) => entry.user.id === userId)?.user.username ?? "Spieler";
}
