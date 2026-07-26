// Domain types shared across all screens and components. Extracted from the
// former App.tsx (#89). `isAdmin` is new: the server (ADMIN_USERNAMES allowlist)
// reports it on /auth/me and it gates the dev routes.
import type { Card } from "@escalera/game-rules";
import type { Rect } from "./motion.js";

export type { LobbyVoice } from "../voiceChat.js";

export type User = { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean; isAdmin: boolean };
export type Lobby = {
  code: string;
  name: string;
  status: "OPEN" | "ACTIVE" | "CLOSED";
  host: Pick<User, "id" | "username" | "avatarKey">;
  settings: { maxPlayers: number; jokersPerPlayer: number; maxTurnSeconds: number | null; streetsRequireSameSuit: boolean; confirmTurnEnd: boolean };
  players: Array<{ user: User; ready: boolean; connected: boolean }>;
};
export type GameMeld = { id: string; ownerId: string; type: "group" | "street"; cards: Card[]; sameSuit: boolean };
export type RoundResult = { round: number; phase: number; endedById: string; scores: Array<{ userId: string; penalty: number; totalPenalty: number }> };
export type FinalPlacement = { userId: string; rank: number; totalPenalty: number; compensatedPenalty: number };
export type RecentGameAction = { commandId: string; userId: string; type: string; version: number; createdAt: string; metadata?: { source?: "draw" | "discard"; includesDraw?: boolean; includesDiscard?: boolean } };
export type AchievementNode = { id: string; label: string; threshold: number; unlocked: boolean; unlockedAt: string | null };
export type AchievementBranch = { key: string; title: string; kind: "phase" | "gte"; value: number; nodes: AchievementNode[] };
export type ProfileStatistics = { user: Pick<User, "id" | "username" | "avatarKey">; statistics: Record<string, number>; tree: AchievementBranch[] };
export type Game = {
  version: number;
  state: {
    status: "ACTIVE" | "FINISHED";
    round: number;
    phase: number;
    activePlayerId: string;
    drawPileCount: number;
    discardTop: Card | null;
    discardPileCount: number;
    discardOffer: { available: boolean; cardId: string } | null;
    turn: { hasDrawn: boolean; canAct: boolean; opensAt: string | null; deadlineAt: string | null };
    melds: GameMeld[];
    roundEndedById: string | null;
    lastRoundResult: RoundResult | null;
    roundResults: RoundResult[];
    placements: FinalPlacement[];
    recentActions: RecentGameAction[];
    players: Array<{ userId: string; handCount: number; coins: number; phaseLaid: boolean; totalPenalty: number; timeouts: number }>;
    ownHand: Card[];
  };
};

// A card that already exists in the DOM (hand or meld) but is still "in the
// air": it renders hidden while an overlay flight travels onto its measured
// position, then pops visible the moment the flight lands (#50).
export type Arrival = { from: Rect; face: string; showBack?: boolean; flip?: { start: number; end: number }; via?: { dx: number; dy: number }; fromTilt?: number; toTilt?: number; duration?: number; delay?: number; onArrive?: () => void };

// Flight anchors: GameView registers DOM nodes under string keys so the
// choreography can measure their rects. `Anchor(key)` yields the ref callback
// for that key; it attaches to any element (piles, seats, meld cards, hand).
export type AnchorRef = (element: HTMLElement | null) => void;
export type Anchor = (key: string) => AnchorRef;
