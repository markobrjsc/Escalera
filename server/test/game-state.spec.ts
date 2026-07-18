import { describe, expect, it } from "vitest";
import { gameStartDurationMs } from "@escalera/game-rules";
import { buildDeck, createInitialGameState, normalizeGameState, toPlayerGameView, type GameState } from "../src/game/game-state.js";

describe("autoritärer Spielzustand", () => {
  it("erstellt zwei Kartensätze plus konfigurierbare Joker mit eindeutigen Karten", () => {
    const deck = buildDeck(4, 1);
    expect(deck).toHaveLength(108);
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
  });

  it("teilt elf Karten und sieben Münzen ausschließlich serverseitig aus", () => {
    const state = createInitialGameState(["a", "b", "c"], 1, () => 0);
    expect(state.players.map((player) => player.hand.length)).toEqual([11, 11, 11]);
    expect(state.players.every((player) => player.coins === 7)).toBe(true);
    expect(state.discardPile).toHaveLength(1);
    expect(state.drawPile).toHaveLength(73);
  });

  it("öffnet den ersten Zug erst nach der gemeinsamen Choreografie und startet dann die volle Zugzeit", () => {
    const startedAt = Date.parse("2026-07-17T10:00:00.000Z");
    const state = createInitialGameState(["a", "b"], 1, () => 0, 30, startedAt);
    const opensAt = startedAt + gameStartDurationMs(2);

    expect(state.turn.opensAt).toBe(new Date(opensAt).toISOString());
    expect(state.turn.deadlineAt).toBe(new Date(opensAt + 30_000).toISOString());
    expect(toPlayerGameView(state, "a", opensAt - 1).turn.canAct).toBe(false);
    expect(toPlayerGameView(state, "a", opensAt).turn.canAct).toBe(true);
  });

  it("normalisiert ältere Spielstände ohne Startbarriere als bereits geöffnet", () => {
    const current = createInitialGameState(["a", "b"], 1, () => 0);
    const legacy = { ...current, turn: { hasDrawn: false, deadlineAt: null } } as unknown as GameState;
    expect(normalizeGameState(legacy).turn).toEqual({ hasDrawn: false, opensAt: null, deadlineAt: null });
  });

  it("gibt nur die eigene Hand in einer privaten Spielansicht aus", () => {
    const state = createInitialGameState(["a", "b"], 1, () => 0);
    state.roundResults = [{ round: 1, phase: 1, endedById: "a", scores: [
      { userId: "a", penalty: 0, totalPenalty: 0 },
      { userId: "b", penalty: 18, totalPenalty: 18 }
    ] }];
    const view = toPlayerGameView(state, "a");
    expect(view.ownHand).toHaveLength(11);
    expect(view.players).toEqual(expect.arrayContaining([expect.objectContaining({ userId: "b", handCount: 11, coins: 7 })]));
    expect(view.roundResults).toEqual(state.roundResults);
    expect(JSON.stringify(view)).not.toContain('"hand"');
  });

  it("zeigt das Kaufangebot jedem wartenden Spieler bis zum gegnerischen Draw", () => {
    const state = createInitialGameState(["a", "b"], 1, () => 0);
    state.activePlayerId = "b";
    state.discardOffer = { cardId: state.discardPile[0].id, offeredById: "a" };
    expect(toPlayerGameView(state, "a").discardOffer).toEqual({ available: true, cardId: state.discardPile[0].id });
    expect(toPlayerGameView(state, "b").discardOffer).toBeNull();
  });

  it("projiziert Realtime-Metadaten ohne zusätzliche oder geheime Felder", () => {
    const state = createInitialGameState(["a", "b"], 1, () => 0);
    state.recentActions = [{
      commandId: "action-1",
      userId: "a",
      type: "timeout",
      version: 2,
      createdAt: "2026-07-17T10:00:00.000Z",
      metadata: { source: "draw", includesDraw: true, includesDiscard: true, cardId: "secret-card" },
      cardId: "secret-card"
    } as unknown as GameState["recentActions"][number]];

    const action = toPlayerGameView(state, "b").recentActions[0];
    expect(action).toEqual({
      commandId: "action-1",
      userId: "a",
      type: "timeout",
      version: 2,
      createdAt: "2026-07-17T10:00:00.000Z",
      metadata: { source: "draw", includesDraw: true, includesDiscard: true }
    });
    expect(JSON.stringify(action)).not.toContain("secret-card");
  });
});
