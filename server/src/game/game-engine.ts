import { handPoints, validateGroup, validatePhase, validateStreet, type Phase } from "@escalera/game-rules";
import { randomUUID } from "node:crypto";
import { buildDeck, type GameCard, type GameMeld, type GameState, nextTurnDeadline, normalizeGameState, shuffle } from "./game-state.js";

export class GameActionError extends Error {}

type DrawSource = "draw" | "discard";

function player(state: GameState, userId: string) {
  const value = state.players.find((entry) => entry.userId === userId);
  if (!value) throw new GameActionError("Spieler gehört nicht zu dieser Partie.");
  return value;
}

function activePlayer(state: GameState, userId: string) {
  if (state.status === "FINISHED") throw new GameActionError("Die Partie ist bereits beendet.");
  if (state.roundEndedById) throw new GameActionError("Die Runde ist bereits beendet.");
  if (state.activePlayerId !== userId) throw new GameActionError("Du bist nicht am Zug.");
  return player(state, userId);
}

function requireDrawn(state: GameState) {
  if (!state.turn.hasDrawn) throw new GameActionError("Ziehe zuerst eine Karte.");
}

function takeCards(hand: GameCard[], cardIds: readonly string[]) {
  if (!Array.isArray(cardIds) || !cardIds.length || cardIds.some((id) => typeof id !== "string") || new Set(cardIds).size !== cardIds.length) throw new GameActionError("Karten müssen eindeutig ausgewählt sein.");
  const cards = cardIds.map((id) => hand.find((card) => card.id === id));
  if (cards.some((card) => !card)) throw new GameActionError("Mindestens eine Karte befindet sich nicht auf deiner Hand.");
  return cards as GameCard[];
}

function removeCards(hand: GameCard[], cards: readonly GameCard[]) {
  const ids = new Set(cards.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

function groupValue(cards: readonly GameCard[]) {
  const ranks = [...new Set(cards.filter((card): card is Extract<GameCard, { kind: "standard" }> => card.kind === "standard").map((card) => card.rank))];
  return ranks.length === 1 ? ranks[0] : null;
}

// Groups of the same value share one stable meld id. Besides producing a much
// cleaner board this lets the client animate new cards into the existing meld.
function addOrMergeMeld(state: GameState, ownerId: string, type: "group" | "street", cards: GameCard[], sameSuit: boolean) {
  const value = type === "group" ? groupValue(cards) : null;
  const existing = value ? state.melds.find((meld) => meld.type === "group" && groupValue(meld.cards) === value) : undefined;
  if (existing) {
    existing.cards.push(...cards);
    return existing;
  }
  const meld = { id: randomUUID(), ownerId, type, cards, sameSuit };
  state.melds.push(meld);
  return meld;
}

function validationError(reason?: string): never {
  throw new GameActionError(reason ?? "Diese Kombination ist ungültig.");
}

export function drawCard(rawState: GameState, userId: string, source: DrawSource, random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper)) {
  const state = normalizeGameState(rawState);
  const current = activePlayer(state, userId);
  if (state.turn.hasDrawn) throw new GameActionError("In diesem Zug wurde bereits gezogen.");
  state.discardOffer = null;

  if (source === "discard") {
    const card = state.discardPile.pop();
    if (!card) throw new GameActionError("Der Ablagestapel ist leer.");
    current.hand.push(card);
  } else {
    if (!state.drawPile.length) {
      if (state.discardPile.length < 2) throw new GameActionError("Es sind keine Karten zum Nachziehen verfügbar.");
      const recycled = shuffle(state.discardPile, random);
      const newDiscard = recycled.pop()!;
      state.drawPile = recycled;
      state.discardPile = [newDiscard];
    }
    current.hand.push(state.drawPile.pop()!);
  }
  state.turn.hasDrawn = true;
  current.metrics.movesPlayed += 1; // one draw begins each turn, so this counts turns played
  return state;
}

export function layPhase(rawState: GameState, userId: string, combinationCardIds: readonly (readonly string[])[], random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper), now = Date.now()) {
  const state = normalizeGameState(rawState);
  const current = activePlayer(state, userId);
  requireDrawn(state);
  if (current.phaseLaid) throw new GameActionError("Die Phase wurde bereits ausgelegt.");
  const combinations = combinationCardIds.map((ids) => takeCards(current.hand, ids));
  const allIds = combinations.flat().map((card) => card.id);
  if (new Set(allIds).size !== allIds.length) throw new GameActionError("Eine Karte kann nur einmal ausgelegt werden.");
  const result = validatePhase(state.phase as Phase, combinations);
  if (!result.valid) validationError(result.reason);
  current.hand = removeCards(current.hand, combinations.flat());
  current.phaseLaid = true;
  current.metrics.phasesLaid += 1;
  current.metrics.meldsLaid += combinations.length;
  current.metrics.jokersPlayed += combinations.flat().filter((card) => card.kind === "joker").length;
  for (const cards of combinations) addOrMergeMeld(state, userId, state.phase === 7 ? "street" : "group", cards, state.phase === 7);
  if (state.phase === 7) for (const cards of combinations) trackStreet(current, "street", cards.length);
  // Laying the final card ends the round just like discarding the last one would.
  if (!current.hand.length) return completeRound(state, userId, random, now);
  return state;
}

// Records the longest street a player has built, for the street-length branch of
// the achievement tree. Only streets count; groups never advance it.
function trackStreet(player: { metrics: { longestStreet: number } }, type: "group" | "street", length: number) {
  if (type === "street") player.metrics.longestStreet = Math.max(player.metrics.longestStreet, length);
}

export function layAdditionalMeld(rawState: GameState, userId: string, cardIds: readonly string[], streetsRequireSameSuit: boolean, random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper), now = Date.now()) {
  const state = normalizeGameState(rawState);
  const current = activePlayer(state, userId);
  requireDrawn(state);
  if (!current.phaseLaid) throw new GameActionError("Lege zuerst deine aktuelle Phase aus.");
  const cards = takeCards(current.hand, cardIds);
  const group = validateGroup(cards, 3);
  const street = validateStreet(cards, { minimumSize: 3, sameSuit: streetsRequireSameSuit });
  if (!group.valid && !street.valid) validationError(`${group.reason} ${street.reason}`);
  current.hand = removeCards(current.hand, cards);
  current.metrics.meldsLaid += 1;
  current.metrics.jokersPlayed += cards.filter((card) => card.kind === "joker").length;
  addOrMergeMeld(state, userId, group.valid ? "group" : "street", cards, group.valid ? false : streetsRequireSameSuit);
  trackStreet(current, group.valid ? "group" : "street", cards.length);
  if (!current.hand.length) return completeRound(state, userId, random, now);
  return state;
}

export function addCardToMeld(rawState: GameState, userId: string, meldId: string, cardId: string, random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper), now = Date.now()) {
  const state = normalizeGameState(rawState);
  const current = activePlayer(state, userId);
  requireDrawn(state);
  if (!current.phaseLaid) throw new GameActionError("Lege zuerst deine aktuelle Phase aus.");
  const card = takeCards(current.hand, [cardId])[0];
  const meld = state.melds.find((entry) => entry.id === meldId);
  if (!meld) throw new GameActionError("Auslage wurde nicht gefunden.");
  const cards = [...meld.cards, card];
  const result = meld.type === "group" ? validateGroup(cards, 3) : validateStreet(cards, { minimumSize: 3, sameSuit: meld.sameSuit });
  if (!result.valid) validationError(result.reason);
  meld.cards = cards;
  current.hand = removeCards(current.hand, [card]);
  if (card.kind === "joker") current.metrics.jokersPlayed += 1;
  trackStreet(current, meld.type, cards.length);
  if (!current.hand.length) return completeRound(state, userId, random, now);
  return state;
}

export function discardCard(rawState: GameState, userId: string, cardId: string, random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper), now = Date.now()) {
  const state = normalizeGameState(rawState);
  const current = activePlayer(state, userId);
  requireDrawn(state);
  const card = takeCards(current.hand, [cardId])[0];
  current.hand = removeCards(current.hand, [card]);
  state.discardPile.push(card);
  state.discardOffer = { cardId: card.id, offeredById: userId };
  if (!current.hand.length) {
    return completeRound(state, userId, random, now);
  }
  const index = state.players.findIndex((entry) => entry.userId === userId);
  state.activePlayerId = state.players[(index + 1) % state.players.length].userId;
  state.turn = { hasDrawn: false, opensAt: null, deadlineAt: nextTurnDeadline(state.maxTurnSeconds, now) };
  return state;
}

export function expireTurn(rawState: GameState, now = Date.now(), random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper)) {
  let state = normalizeGameState(rawState);
  if (state.status === "FINISHED") throw new GameActionError("Die Partie ist bereits beendet.");
  const deadline = state.turn.deadlineAt ? Date.parse(state.turn.deadlineAt) : Number.POSITIVE_INFINITY;
  if (deadline > now) throw new GameActionError("Die Zugzeit ist noch nicht abgelaufen.");
  const userId = state.activePlayerId;
  if (!state.turn.hasDrawn) state = drawCard(state, userId, "draw", random);
  const current = player(state, userId);
  current.timeouts += 1;
  const discarded = current.hand[random(current.hand.length)];
  if (!discarded) throw new GameActionError("Für den automatischen Zugabschluss ist keine Handkarte vorhanden.");
  return discardCard(state, userId, discarded.id, random, now);
}

export function skipDisconnectedTurn(rawState: GameState, userId: string, now = Date.now(), random: (upperExclusive: number) => number = (upper) => Math.floor(Math.random() * upper)) {
  let state = normalizeGameState(rawState);
  activePlayer(state, userId);
  if (!state.turn.hasDrawn) state = drawCard(state, userId, "draw", random);
  const current = player(state, userId);
  current.disconnectSkips += 1;
  const discarded = current.hand[random(current.hand.length)];
  if (!discarded) throw new GameActionError("Für das Überspringen ist keine Handkarte vorhanden.");
  return discardCard(state, userId, discarded.id, random, now);
}

function completeRound(state: GameState, endedById: string, random: (upperExclusive: number) => number, now = Date.now()) {
  const scores = state.players.map((entry) => {
    const penalty = handPoints(entry.hand);
    entry.totalPenalty += penalty;
    return { userId: entry.userId, penalty, totalPenalty: entry.totalPenalty };
  });
  state.roundResults.push({ round: state.round, phase: state.phase, endedById, scores });
  state.discardOffer = null;
  if (state.phase >= 7) {
    const totals = [...new Set(state.players.map((entry) => entry.totalPenalty))].sort((a, b) => a - b);
    state.status = "FINISHED";
    state.roundEndedById = endedById;
    state.placements = state.players
      .map((entry) => ({ userId: entry.userId, rank: totals.indexOf(entry.totalPenalty) + 1, totalPenalty: entry.totalPenalty }))
      .sort((a, b) => a.rank - b.rank || a.userId.localeCompare(b.userId));
    return state;
  }

  const highestPenalty = Math.max(...state.players.map((entry) => entry.totalPenalty));
  const starters = state.players.filter((entry) => entry.totalPenalty === highestPenalty);
  const nextStarter = starters[random(starters.length)];
  const cards = shuffle(buildDeck(state.players.length, state.jokersPerPlayer), random);
  for (const entry of state.players) {
    entry.hand = cards.splice(0, 11);
    entry.coins = 7;
    entry.phaseLaid = false;
  }
  const discardTop = cards.shift();
  if (!discardTop) throw new GameActionError("Kartensatz enthält zu wenige Karten für die nächste Runde.");
  state.round += 1;
  state.phase += 1;
  state.activePlayerId = nextStarter.userId;
  state.drawPile = cards;
  state.discardPile = [discardTop];
  state.melds = [];
  state.turn = { hasDrawn: false, opensAt: null, deadlineAt: nextTurnDeadline(state.maxTurnSeconds, now) };
  state.roundEndedById = null;
  return state;
}

export function buyDiscard(rawState: GameState, userId: string) {
  const state = normalizeGameState(rawState);
  if (state.status === "FINISHED") throw new GameActionError("Die Partie ist bereits beendet.");
  if (state.roundEndedById) throw new GameActionError("Die Runde ist bereits beendet.");
  if (!state.discardOffer) throw new GameActionError("Diese Karte steht nicht mehr zum Kauf.");
  if (userId === state.activePlayerId) throw new GameActionError("Der aktive Spieler zieht die Karte regulär statt sie zu kaufen.");
  const buyer = player(state, userId);
  if (buyer.coins < 1) throw new GameActionError("Du hast keine Münze mehr.");
  const card = state.discardPile.at(-1);
  if (!card || card.id !== state.discardOffer.cardId) throw new GameActionError("Die angebotene Karte liegt nicht mehr oben.");
  state.discardPile.pop();
  buyer.hand.push(card);
  buyer.coins -= 1;
  buyer.metrics.cardsBought += 1;
  state.discardOffer = null;
  return state;
}
