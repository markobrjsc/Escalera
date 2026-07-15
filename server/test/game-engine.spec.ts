import { describe, expect, it } from "vitest";
import { addCardToMeld, buyDiscard, discardCard, drawCard, layAdditionalMeld, layPhase } from "../src/game/game-engine.js";
import type { GameCard, GameState } from "../src/game/game-state.js";

const card = (id: string, rank: "3" | "5" | "7" | "8" | "9" | "10", suit: "clubs" | "hearts" | "spades" = "clubs"): GameCard => ({ id, kind: "standard", deck: 1, rank, suit });
const baseState = (): GameState => ({
  round: 1,
  phase: 1,
  jokersPerPlayer: 1,
  activePlayerId: "p1",
  players: [
    { userId: "p1", hand: [card("5c", "5"), card("5h", "5", "hearts"), card("5s", "5", "spades"), card("7c", "7")], coins: 7, phaseLaid: false, totalPenalty: 0 },
    { userId: "p2", hand: [card("8c", "8")], coins: 7, phaseLaid: false, totalPenalty: 0 },
    { userId: "p3", hand: [card("9c", "9")], coins: 7, phaseLaid: false, totalPenalty: 0 }
  ],
  drawPile: [card("3c", "3")],
  discardPile: [card("10c", "10")],
  melds: [],
  turn: { hasDrawn: false },
  discardOffer: null,
  roundEndedById: null,
  roundResults: []
});

describe("autoritärer Spielzug", () => {
  it("erlaubt Ziehen nur einmal und nur für den aktiven Spieler", () => {
    const state = baseState();
    expect(() => drawCard(state, "p2", "draw")).toThrow("nicht am Zug");
    const drawn = drawCard(state, "p1", "draw");
    expect(drawn.players[0].hand).toHaveLength(5);
    expect(() => drawCard(drawn, "p1", "draw")).toThrow("bereits gezogen");
  });

  it("legt die Pflichtphase vollständig aus und erlaubt danach weitere Melds", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const phased = layPhase(drawn, "p1", [["5c", "5h", "5s"]]);
    expect(phased.players[0].phaseLaid).toBe(true);
    expect(phased.melds[0].cards).toHaveLength(3);
    const additional = layAdditionalMeld({ ...phased, players: phased.players.map((player) => player.userId === "p1" ? { ...player, hand: [card("8x", "8"), card("9x", "9"), card("10x", "10")] } : player) }, "p1", ["8x", "9x", "10x"], false);
    expect(additional.melds[1].type).toBe("street");
  });

  it("legt passende Einzelkarten an vorhandene Melds an", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const phased = layPhase(drawn, "p1", [["5c", "5h", "5s"]]);
    phased.players[0].hand.push({ ...card("5extra", "5"), deck: 2 });
    const result = addCardToMeld(phased, "p1", phased.melds[0].id, "5extra");
    expect(result.melds[0].cards).toHaveLength(4);
  });

  it("öffnet nach dem Abwerfen genau ein Kaufangebot und berechnet eine Münze", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const discarded = discardCard(drawn, "p1", "7c");
    expect(discarded.activePlayerId).toBe("p2");
    expect(discarded.discardOffer?.cardId).toBe("7c");
    const bought = buyDiscard(discarded, "p3");
    expect(bought.players[2].coins).toBe(6);
    expect(bought.players[2].hand.some((entry) => entry.id === "7c")).toBe(true);
    expect(() => buyDiscard(bought, "p3")).toThrow("nicht mehr zum Kauf");
  });

  it("verändert bei einer ungültigen Aktion nicht den übergebenen Zustand", () => {
    const state = baseState();
    const before = JSON.stringify(state);
    expect(() => layPhase(state, "p1", [["5c", "5h", "7c"]])).toThrow("Ziehe zuerst");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("wertet eine beendete Runde genau einmal und startet die gemeinsame nächste Phase", () => {
    const state = baseState();
    state.turn.hasDrawn = true;
    state.players[0].hand = [card("last", "7")];
    state.players[1].hand = [card("eight", "8")];
    state.players[2].hand = [{ id: "joker-test", kind: "joker" }];
    state.players[1].totalPenalty = 5;
    state.players[2].totalPenalty = 20;

    const result = discardCard(state, "p1", "last", () => 0);

    expect(result.round).toBe(2);
    expect(result.phase).toBe(2);
    expect(result.roundResults).toEqual([{ round: 1, phase: 1, endedById: "p1", scores: [
      { userId: "p1", penalty: 0, totalPenalty: 0 },
      { userId: "p2", penalty: 10, totalPenalty: 15 },
      { userId: "p3", penalty: 30, totalPenalty: 50 }
    ] }]);
    expect(result.activePlayerId).toBe("p3");
    expect(result.players.every((entry) => entry.hand.length === 11 && entry.coins === 7 && !entry.phaseLaid)).toBe(true);
    expect(result.melds).toEqual([]);
    expect(result.discardPile).toHaveLength(1);
  });

  it("entscheidet den Startspieler bei gleichen höchsten Strafpunkten zufällig", () => {
    const state = baseState();
    state.turn.hasDrawn = true;
    state.players[0].hand = [card("last", "7")];
    state.players[1].hand = [card("p2-eight", "8")];
    state.players[2].hand = [card("p3-eight", "8")];
    let call = 0;
    const result = discardCard(state, "p1", "last", (upper) => call++ === 0 ? Math.min(1, upper - 1) : 0);
    expect(result.activePlayerId).toBe("p3");
  });
});
