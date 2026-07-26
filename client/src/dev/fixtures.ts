import type { Card } from "@escalera/game-rules";
import type { AchievementBranch, FinalPlacement, Game, GameMeld, Lobby, LobbyVoice, ProfileStatistics, RoundResult, User } from "../lib/types.js";

// Representative sample data for the isolated dev previews. None of this touches
// the server — it only feeds the real components with plausible props/states.

export function makeUser(overrides: Partial<User> = {}): User {
  return { id: "u-demo", username: "Demospieler", avatarKey: null, tutorialCompleted: true, isAdmin: false, ...overrides };
}

export const demoCards: Card[] = [
  { id: "c1", deck: 1, kind: "standard", rank: "7", suit: "hearts" },
  { id: "c2", deck: 1, kind: "standard", rank: "8", suit: "hearts" },
  { id: "c3", deck: 1, kind: "standard", rank: "9", suit: "hearts" },
  { id: "c4", deck: 1, kind: "standard", rank: "K", suit: "spades" },
  { id: "c5", deck: 2, kind: "standard", rank: "K", suit: "clubs" },
  { id: "c6", kind: "joker" }
];

export const demoMeld: GameMeld = { id: "m1", ownerId: "u-demo", type: "street", cards: demoCards.slice(0, 3), sameSuit: true };

export function makeLobby(overrides: Partial<Lobby> = {}): Lobby {
  const host = makeUser({ id: "u-host", username: "Gastgeberin" });
  return {
    code: "AB12",
    name: "Demo-Lobby",
    status: "OPEN",
    host: { id: host.id, username: host.username, avatarKey: host.avatarKey },
    settings: { maxPlayers: 4, jokersPerPlayer: 1, maxTurnSeconds: 60, streetsRequireSameSuit: true, confirmTurnEnd: true },
    players: [
      { user: host, ready: true, connected: true },
      { user: makeUser({ id: "u-2", username: "Milan" }), ready: false, connected: true },
      { user: makeUser({ id: "u-3", username: "Sara" }), ready: true, connected: false }
    ],
    ...overrides
  };
}

export const demoTree: AchievementBranch[] = [
  { key: "phases", title: "Phasen", kind: "phase", value: 3, nodes: [
    { id: "p1", label: "Phase 1", threshold: 1, unlocked: true, unlockedAt: new Date().toISOString() },
    { id: "p2", label: "Phase 2", threshold: 2, unlocked: true, unlockedAt: null },
    { id: "p3", label: "Phase 3", threshold: 3, unlocked: false, unlockedAt: null }
  ] },
  { key: "wins", title: "Siege", kind: "gte", value: 2, nodes: [
    { id: "w1", label: "Erster Sieg", threshold: 1, unlocked: true, unlockedAt: null },
    { id: "w2", label: "Fünf Siege", threshold: 5, unlocked: false, unlockedAt: null }
  ] }
];

export const demoProfile: ProfileStatistics = {
  user: { id: "u-demo", username: "Demospieler", avatarKey: null },
  statistics: { gamesPlayed: 42, gamesWon: 11, totalPenalty: 318, cardsBought: 7 },
  tree: demoTree
};

export const demoRoundResult: RoundResult = {
  round: 2,
  phase: 2,
  endedById: "u-host",
  scores: [
    { userId: "u-host", penalty: 0, totalPenalty: 0 },
    { userId: "u-2", penalty: 15, totalPenalty: 40 },
    { userId: "u-3", penalty: 30, totalPenalty: 55 }
  ]
};

export const demoPlacements: FinalPlacement[] = [
  { userId: "u-host", rank: 1, totalPenalty: 20 },
  { userId: "u-2", rank: 2, totalPenalty: 60 },
  { userId: "u-3", rank: 3, totalPenalty: 95 }
];

// A minimal-but-complete game snapshot for the scoreboard preview.
export function makeGame(): Game {
  return {
    version: 12,
    state: {
      status: "ACTIVE",
      round: 3,
      phase: 3,
      activePlayerId: "u-host",
      drawPileCount: 54,
      discardTop: demoCards[0],
      discardPileCount: 6,
      discardOffer: null,
      turn: { hasDrawn: false, canAct: true, opensAt: null, deadlineAt: null },
      melds: [demoMeld],
      roundEndedById: null,
      lastRoundResult: demoRoundResult,
      roundResults: [
        { round: 1, phase: 1, endedById: "u-2", scores: [
          { userId: "u-host", penalty: 20, totalPenalty: 20 },
          { userId: "u-2", penalty: 0, totalPenalty: 0 },
          { userId: "u-3", penalty: 25, totalPenalty: 25 }
        ] },
        demoRoundResult
      ],
      placements: [],
      recentActions: [],
      players: [
        { userId: "u-host", handCount: 4, coins: 5, phaseLaid: true, totalPenalty: 20, timeouts: 0 },
        { userId: "u-2", handCount: 7, coins: 3, phaseLaid: false, totalPenalty: 40, timeouts: 1 },
        { userId: "u-3", handCount: 9, coins: 6, phaseLaid: false, totalPenalty: 55, timeouts: 0 }
      ],
      ownHand: demoCards
    }
  };
}

// A stand-in for the lobby voice API so VoiceStatus / PlayerInteractionCard can
// render without a live WebRTC session.
export function makeVoice(overrides: Partial<LobbyVoice> = {}): LobbyVoice {
  return {
    status: "connected",
    notice: "",
    selfMuted: false,
    canSelfMute: true,
    participant: () => ({ volume: 0.8, muted: false }),
    setVolume: () => undefined,
    toggleMuted: () => undefined,
    toggleSelfMuted: () => undefined,
    ...overrides
  };
}
