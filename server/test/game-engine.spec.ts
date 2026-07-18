import { describe, expect, it } from "vitest";
import { addCardToMeld, buyDiscard, discardCard, drawCard, expireTurn, layAdditionalMeld, layPhase, skipDisconnectedTurn } from "../src/game/game-engine.js";
import type { GameCard, GameState } from "../src/game/game-state.js";

const card = (id: string, rank: "3" | "5" | "7" | "8" | "9" | "10", suit: "clubs" | "hearts" | "spades" = "clubs"): GameCard => ({ id, kind: "standard", deck: 1, rank, suit });
const baseState = (): GameState => ({
  status: "ACTIVE",
  round: 1,
  phase: 1,
  jokersPerPlayer: 1,
  maxTurnSeconds: 60,
  activePlayerId: "p1",
  players: [
    { userId: "p1", hand: [card("5c", "5"), card("5h", "5", "hearts"), card("5s", "5", "spades"), card("7c", "7")], coins: 7, phaseLaid: false, totalPenalty: 0, timeouts: 0, disconnectSkips: 0 },
    { userId: "p2", hand: [card("8c", "8")], coins: 7, phaseLaid: false, totalPenalty: 0, timeouts: 0, disconnectSkips: 0 },
    { userId: "p3", hand: [card("9c", "9")], coins: 7, phaseLaid: false, totalPenalty: 0, timeouts: 0, disconnectSkips: 0 }
  ],
  drawPile: [card("3c", "3")],
  discardPile: [card("10c", "10")],
  melds: [],
  turn: { hasDrawn: false, opensAt: null, deadlineAt: "2026-07-15T12:00:00.000Z" },
  discardOffer: null,
  roundEndedById: null,
  roundResults: [],
  placements: [],
  processedCommands: [],
  recentActions: []
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
    const additional = layAdditionalMeld({ ...phased, players: phased.players.map((player) => player.userId === "p1" ? { ...player, hand: [card("8x", "8"), card("9x", "9"), card("10x", "10"), card("keep", "2")] } : player) }, "p1", ["8x", "9x", "10x"], false);
    expect(additional.melds[1].type).toBe("street");
  });

  it("legt passende Einzelkarten an vorhandene Melds an", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const phased = layPhase(drawn, "p1", [["5c", "5h", "5s"]]);
    phased.players[0].hand.push({ ...card("5extra", "5"), deck: 2 });
    const result = addCardToMeld(phased, "p1", phased.melds[0].id, "5extra");
    expect(result.melds[0].cards).toHaveLength(4);
  });

  it("beendet die Runde, wenn ein Spieler durch Auslegen seine letzte Karte loswird", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const phased = layPhase(drawn, "p1", [["5c", "5h", "5s"]]);
    // Arm p1 with exactly a layable street so laying it empties the hand.
    const armed = { ...phased, players: phased.players.map((player) => player.userId === "p1" ? { ...player, hand: [card("8x", "8"), card("9x", "9"), card("10x", "10")] } : player) };
    const out = layAdditionalMeld(armed, "p1", ["8x", "9x", "10x"], false, () => 0);
    expect(out.roundResults).toHaveLength(1);
    expect(out.roundResults[0].endedById).toBe("p1");
    expect(out.phase).toBe(2);
    expect(out.players.every((player) => player.hand.length === 11)).toBe(true);
  });

  it("beendet die Runde auch, wenn die letzte Karte angelegt wird", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const phased = layPhase(drawn, "p1", [["5c", "5h", "5s"]]);
    const armed = { ...phased, players: phased.players.map((player) => player.userId === "p1" ? { ...player, hand: [{ ...card("5last", "5"), deck: 2 as const }] } : player) };
    const out = addCardToMeld(armed, "p1", phased.melds[0].id, "5last", () => 0);
    expect(out.roundResults).toHaveLength(1);
    expect(out.roundResults[0].endedById).toBe("p1");
    expect(out.phase).toBe(2);
  });

  it("öffnet nach dem Abwerfen genau ein Kaufangebot und berechnet eine Münze", () => {
    const drawn = drawCard(baseState(), "p1", "draw");
    const discarded = discardCard(drawn, "p1", "7c");
    expect(discarded.activePlayerId).toBe("p2");
    expect(discarded.discardOffer?.cardId).toBe("7c");
    const bought = buyDiscard(discarded, "p1");
    expect(bought.players[0].coins).toBe(6);
    expect(bought.players[0].hand.some((entry) => entry.id === "7c")).toBe(true);
    expect(() => buyDiscard(bought, "p1")).toThrow("nicht mehr zum Kauf");
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

  it("beendet Phase 7 nach der Wertung mit geteilten Platzierungen", () => {
    const state = baseState();
    state.phase = 7;
    state.round = 7;
    state.turn.hasDrawn = true;
    state.players[0].hand = [card("last", "7")];
    state.players[0].totalPenalty = 5;
    state.players[1].hand = [card("p2-eight", "8")];
    state.players[2].hand = [card("p3-eight", "8")];

    const result = discardCard(state, "p1", "last", () => 0);

    expect(result.status).toBe("FINISHED");
    expect(result.phase).toBe(7);
    expect(result.placements).toEqual([
      { userId: "p1", rank: 1, totalPenalty: 5 },
      { userId: "p2", rank: 2, totalPenalty: 10 },
      { userId: "p3", rank: 2, totalPenalty: 10 }
    ]);
    expect(() => drawCard(result, "p1", "draw")).toThrow("Partie ist bereits beendet");
    expect(() => buyDiscard(result, "p2")).toThrow("Partie ist bereits beendet");
  });

  it("zieht bei Zeitablauf nötigenfalls und wirft genau eine zufällige Karte ab", () => {
    const state = baseState();
    const expiredAt = Date.parse(state.turn.deadlineAt!);
    const result = expireTurn(state, expiredAt, () => 0);
    expect(result.activePlayerId).toBe("p2");
    expect(result.players[0].timeouts).toBe(1);
    expect(result.players[0].hand).toHaveLength(4);
    expect(result.discardOffer).not.toBeNull();
    expect(Date.parse(result.turn.deadlineAt!)).toBe(expiredAt + 60_000);
  });

  it("verändert einen noch nicht abgelaufenen Zug nicht", () => {
    const state = baseState();
    const before = JSON.stringify(state);
    expect(() => expireTurn(state, Date.parse(state.turn.deadlineAt!) - 1, () => 0)).toThrow("noch nicht abgelaufen");
    expect(JSON.stringify(state)).toBe(before);
  });

  it("schließt den Zug eines vollständig getrennten aktiven Spielers automatisch ab", () => {
    const state = baseState();
    const skipped = skipDisconnectedTurn(state, "p1", Date.parse(state.turn.deadlineAt!), () => 0);
    expect(skipped.activePlayerId).toBe("p2");
    expect(skipped.players[0].disconnectSkips).toBe(1);
    expect(skipped.players[0].hand).toHaveLength(4);
  });
});
