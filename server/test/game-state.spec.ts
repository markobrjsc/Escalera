import { describe, expect, it } from "vitest";
import { buildDeck, createInitialGameState, toPlayerGameView } from "../src/game/game-state.js";

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

  it("gibt nur die eigene Hand in einer privaten Spielansicht aus", () => {
    const state = createInitialGameState(["a", "b"], 1, () => 0);
    const view = toPlayerGameView(state, "a");
    expect(view.ownHand).toHaveLength(11);
    expect(view.players).toEqual(expect.arrayContaining([expect.objectContaining({ userId: "b", handCount: 11, coins: 7 })]));
    expect(JSON.stringify(view)).not.toContain('"hand"');
  });
});
