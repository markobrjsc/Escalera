import { describe, expect, it } from "vitest";
import { cardPoints, GAME_START_TIMING_MS, gameStartDurationMs, handPoints, INITIAL_HAND_SIZE, validateGroup, validatePhase, validateStreet, type Card, type Rank, type Suit } from "../src/index.js";

const card = (rank: Rank, suit: Suit, deck: 1 | 2 = 1): Card => ({ id: `${rank}-${suit}-${deck}`, rank, suit, deck, kind: "standard" });
const joker: Card = { id: "joker-1", kind: "joker" };

describe("Kartenwerte", () => {
  it("wertet alle festgelegten Kartenwerte", () => {
    expect(cardPoints(card("2", "clubs"))).toBe(5);
    expect(cardPoints(card("10", "clubs"))).toBe(10);
    expect(cardPoints(card("A", "clubs"))).toBe(15);
    expect(cardPoints(joker)).toBe(30);
    expect(handPoints([card("7", "clubs"), card("A", "hearts"), joker])).toBe(50);
  });
});

describe("gemeinsamer Spielstart-Zeitplan", () => {
  it("deckt Intro, überlappenden Deck-Einflug, Mischen, Rundum-Geben und Ausklang ab", () => {
    expect(GAME_START_TIMING_MS).toEqual({
      matchIntro: 2_100,
      introDealOverlap: 600,
      deckDrop: 750,
      deckShuffle: 2_250,
      dealStep: 95,
      dealFlight: 460,
      finishTail: 900
    });
    expect(INITIAL_HAND_SIZE).toBe(11);
    expect(gameStartDurationMs(2)).toBe(7_950);
    expect(gameStartDurationMs(6)).toBe(12_130);
  });

  it("weist Spielerzahlen außerhalb des unterstützten Bereichs zurück", () => {
    expect(() => gameStartDurationMs(1)).toThrow(RangeError);
    expect(() => gameStartDurationMs(2.5)).toThrow(RangeError);
    expect(() => gameStartDurationMs(7)).toThrow(RangeError);
  });
});

describe("Gruppen", () => {
  it("erlaubt gleiche Werte unabhängig von Farbe und Kartensatz", () => {
    expect(validateGroup([card("K", "clubs"), card("K", "clubs", 2), card("K", "hearts")])).toEqual({ valid: true });
  });

  it("erlaubt höchstens einen Joker", () => {
    expect(validateGroup([card("K", "clubs"), card("K", "hearts"), joker])).toEqual({ valid: true });
    expect(validateGroup([card("K", "clubs"), joker, { id: "joker-2", kind: "joker" }])).toMatchObject({ valid: false });
  });
});

describe("Straßen", () => {
  it("erlaubt den Kreisdurchgang Ass nach 2", () => {
    expect(validateStreet([card("Q", "clubs"), card("K", "hearts"), card("A", "spades"), card("2", "clubs"), card("3", "diamonds")])).toEqual({ valid: true });
  });

  it("verbietet doppelte Kartenwerte und mehr als einen vollständigen Kreis", () => {
    expect(validateStreet([card("Q", "clubs"), card("K", "hearts"), card("A", "spades"), card("2", "clubs"), card("Q", "diamonds")])).toMatchObject({ valid: false });
  });

  it("prüft die Farbvorgabe der Escalera", () => {
    expect(validateStreet([card("8", "clubs"), card("9", "clubs"), card("10", "clubs"), card("J", "clubs"), card("Q", "clubs"), card("K", "clubs"), card("A", "clubs")], { minimumSize: 7, sameSuit: true })).toEqual({ valid: true });
    expect(validateStreet([card("8", "clubs"), card("9", "clubs"), card("10", "clubs"), card("J", "clubs"), card("Q", "clubs"), card("K", "clubs"), card("A", "hearts")], { minimumSize: 7, sameSuit: true })).toMatchObject({ valid: false });
  });
});

describe("Phasen", () => {
  it("erlaubt stärkere Gruppen als die Mindestanforderung", () => {
    expect(validatePhase(1, [[card("5", "clubs"), card("5", "hearts"), card("5", "spades"), card("5", "diamonds")]])).toEqual({ valid: true });
  });

  it("prüft die zwei Gruppen in Phase 2", () => {
    expect(validatePhase(2, [
      [card("3", "clubs"), card("3", "hearts"), card("3", "spades")],
      [card("9", "clubs"), card("9", "hearts"), card("9", "spades")]
    ])).toEqual({ valid: true });
  });
});
