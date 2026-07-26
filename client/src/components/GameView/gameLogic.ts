import { GAME_START_TIMING_MS, validateGroup, validatePhase, validateStreet } from "@escalera/game-rules";
import type { Card, Phase } from "@escalera/game-rules";
import type { GameMeld, Lobby, RecentGameAction } from "../../lib/types.js";
import { playerName } from "../../lib/players.js";

export const DEAL_STEP = GAME_START_TIMING_MS.dealStep;    // ms between two consecutively dealt cards
export const DEAL_FLIGHT = GAME_START_TIMING_MS.dealFlight; // ms a dealt card travels to its owner

// The client mirrors the server by calling the very same rule functions, so a
// highlighted target can never disagree with what the engine would accept.
// Compare server/src/game/game-engine.ts: layPhase, layAdditionalMeld, addCardToMeld.
export function meldAccepts(meld: GameMeld, card: Card) {
  const cards = [...meld.cards, card];
  return (meld.type === "group" ? validateGroup(cards, 3) : validateStreet(cards, { minimumSize: 3, sameSuit: meld.sameSuit })).valid;
}
export function canLayMeld(cards: Card[], sameSuit: boolean) {
  return cards.length >= 3 && (validateGroup(cards, 3).valid || validateStreet(cards, { minimumSize: 3, sameSuit }).valid);
}
export function canLayPhase(cards: Card[], phase: number) {
  try { return validatePhase(phase as Phase, phaseGroups(cards, phase)).valid; } catch { return false; }
}

export function actionText(action: RecentGameAction, lobby: Lobby, selfId: string) {
  const who = action.userId === selfId ? "Du" : playerName(lobby, action.userId);
  const verb: Record<string, string> = { draw: "zieht eine Karte", buy: "kauft die Ablage", discard: "legt ab", phase: "legt die Phase aus", meld: "legt eine Kombination aus", "add-to-meld": "legt an", timeout: "hat die Zeit überschritten", "disconnect-skip": "wurde übersprungen" };
  return `${who} ${verb[action.type] ?? action.type}`;
}

// Splits a selection into the combinations the current phase demands. Throws when
// the shape is wrong; canLayPhase() turns that into a plain boolean for the UI.
export function phaseGroups(cards: Card[], phase: number): Card[][] {
  if (phase === 7) return [cards];
  const requiredGroups = [2, 4, 6].includes(phase) ? 2 : 1;
  const groups = new Map<string, Card[]>(); const jokers = cards.filter((card) => card.kind === "joker");
  for (const card of cards) if (card.kind === "standard") groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const combinations = [...groups.values()].sort((a, b) => b.length - a.length);
  if (combinations.length !== requiredGroups) throw new Error(`Wähle genau ${requiredGroups} Gruppe${requiredGroups === 1 ? "" : "n"} gleicher Werte.`);
  for (const joker of jokers) {
    const target = combinations.filter((combination) => !combination.some((card) => card.kind === "joker")).sort((a, b) => a.length - b.length)[0];
    if (!target) throw new Error("Pro Kombination ist nur ein Joker erlaubt.");
    target.push(joker);
  }
  return combinations;
}
