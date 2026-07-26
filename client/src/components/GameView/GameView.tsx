import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { INITIAL_HAND_SIZE } from "@escalera/game-rules";
import type { Card } from "@escalera/game-rules";
import { api, ApiError, hasSessionFlag, message } from "../../lib/api.js";
import type { Anchor, Arrival, Game, Lobby, User } from "../../lib/types.js";
import { CARD_BACK, cardAsset, cardSort } from "../../lib/cards.js";
import { BOARD_TILT, DEAL_TIMING, MATCH_INTRO_MS, fitCardRect, usePrefersReducedMotion } from "../../lib/motion.js";
import type { FlightSpec, Rect } from "../../lib/motion.js";
import { audioCueForGameAction, useAudio } from "../../audio.js";
import { runSingleFlight } from "../../singleFlight.js";
import { requiresLeaveConfirmation } from "../../leaveConfirmation.js";
import { Orientation } from "../Orientation/Orientation.js";
import { GameStatusBar } from "../GameStatusBar/GameStatusBar.js";
import { FlightLayer } from "../FlightLayer/FlightLayer.js";
import { DealStage } from "../DealStage/DealStage.js";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog.js";
import { Scoreboard } from "../results/Scoreboard/Scoreboard.js";
import { RoundResultOverlay } from "../results/RoundResultOverlay/RoundResultOverlay.js";
import { FinalResultOverlay } from "../results/FinalResultOverlay/FinalResultOverlay.js";
import { GameHud } from "./GameHud/GameHud.js";
import { BuyButton } from "./BuyButton/BuyButton.js";
import { GameBoard } from "./GameBoard/GameBoard.js";
import { PlayerHand } from "./PlayerHand/PlayerHand.js";
import { DragGhost } from "./DragGhost/DragGhost.js";
import { GameEvents } from "./GameEvents/GameEvents.js";
import { GameMenu } from "./GameMenu/GameMenu.js";
import { actionText, canLayMeld, canLayPhase, DEAL_FLIGHT, DEAL_STEP, meldAccepts, phaseGroups } from "./gameLogic.js";

export function GameView({ user, lobby, game, connected, introHold, onGame, onLeave, onProfile, onTutorial }: { user: User; lobby: Lobby; game: Game; connected: boolean; introHold: boolean; onGame: (game: Game) => void; onLeave: () => Promise<boolean>; onProfile: (userId: string) => void; onTutorial: () => void }) {
  const { play: playAudio, setScene: setAudioScene } = useAudio();
  const [menu, setMenu] = useState(false); const [scoreboard, setScoreboard] = useState(false); const [sort, setSort] = useState<"rank" | "suit">("rank");
  const [selected, setSelected] = useState<string[]>([]); const [pendingAction, setPendingAction] = useState<string | null>(null); const [actionError, setActionError] = useState("");
  const actionGate = useRef(false);
  const busy = pendingAction !== null;
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);
  const [leaveConfirmation, setLeaveConfirmation] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const leaveGate = useRef(false);
  const [drag, setDrag] = useState<{ cardId: string; x: number; y: number; zone: string | null } | null>(null);
  const [events, setEvents] = useState<Array<{ key: string; text: string }>>([]);
  const [buyPosition, setBuyPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const reduced = usePrefersReducedMotion();
  const anchors = useRef(new Map<string, HTMLElement>());
  const anchor: Anchor = useCallback((key: string) => (el: HTMLElement | null) => { if (el) anchors.current.set(key, el); else anchors.current.delete(key); }, []);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    setAudioScene(game.state.status === "FINISHED" ? "results" : "game");
    return () => setAudioScene("game");
  }, [game.state.status, setAudioScene]);
  const previousActivePlayer = useRef(game.state.activePlayerId);
  useEffect(() => {
    if (previousActivePlayer.current !== game.state.activePlayerId) {
      playAudio("turn", { dedupeKey: `${game.version}-${game.state.activePlayerId}`, intensity: game.state.activePlayerId === user.id ? 1 : .62 });
      previousActivePlayer.current = game.state.activePlayerId;
    }
  }, [game.state.activePlayerId, game.version, playAudio, user.id]);
  const resultSounds = useRef(new Set<string>());
  useEffect(() => {
    const result = game.state.lastRoundResult;
    if (!result) return;
    const key = `round-${result.round}`;
    if (resultSounds.current.has(key)) return;
    resultSounds.current.add(key);
    playAudio(result.endedById === user.id ? "roundWin" : "roundLose", { dedupeKey: `${lobby.code}-${key}` });
  }, [game.state.lastRoundResult, lobby.code, playAudio, user.id]);
  useEffect(() => {
    if (game.state.status !== "FINISHED") return;
    const placement = game.state.placements.find((entry) => entry.userId === user.id)?.rank;
    playAudio(placement === 1 ? "gameWin" : "gameLose", { dedupeKey: `${lobby.code}-final` });
  }, [game.state.placements, game.state.status, lobby.code, playAudio, user.id]);

  const initialDealKey = game.state.status === "ACTIVE" && game.state.round === 1 && game.state.ownHand.length >= INITIAL_HAND_SIZE ? `escalera-deal-${lobby.code}-${game.state.round}` : null;
  const initialTurnOpensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
  // The authoritative start barrier is also the idempotency boundary: a new
  // tab after turns have opened (or a legacy snapshot without opensAt) must
  // render server truth immediately instead of replaying the opening deal.
  const prepareDealOnMount = useRef(Boolean(initialDealKey && Number.isFinite(initialTurnOpensAt) && initialTurnOpensAt > Date.now() && !reduced && !hasSessionFlag(initialDealKey)));
  const dealKey = prepareDealOnMount.current ? initialDealKey : null;
  const initialDealCount = game.state.players.length * INITIAL_HAND_SIZE;

  // Animation state (#50). Flights are travelling overlay cards; arrivals mark
  // real cards that stay hidden until their flight lands on them. The *Hold
  // values freeze displayed counts/piles at their pre-action value so numbers
  // and pile tops change exactly when a card arrives, not when the server
  // state does.
  const [flights, setFlights] = useState<FlightSpec[]>([]);
  const [arrivals, setArrivals] = useState<Record<string, Arrival>>({});
  const [dealStage, setDealStage] = useState<"drop" | "shuffle" | null>(null);
  const [dealRect, setDealRect] = useState<Rect | null>(null);
  const [dealing, setDealing] = useState(prepareDealOnMount.current);
  const [dealtIds, setDealtIds] = useState<Set<string> | null>(() => prepareDealOnMount.current ? new Set() : null);
  const [countHold, setCountHold] = useState<Record<string, number>>(() => prepareDealOnMount.current ? Object.fromEntries(game.state.players.filter((player) => player.userId !== user.id).map((player) => [player.userId, 0])) : {});
  const [discardHold, setDiscardHold] = useState<{ top: Card | null; count: number } | null>(() => prepareDealOnMount.current ? { top: null, count: 0 } : null);
  const [drawHold, setDrawHold] = useState<number | null>(() => prepareDealOnMount.current ? game.state.drawPileCount + initialDealCount + 1 : null);
  const gameRef = useRef(game); gameRef.current = game;

  const rectOf = useCallback((key: string): Rect | null => { const element = anchors.current.get(key); if (!element) return null; const box = element.getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }, []);
  useLayoutEffect(() => {
    if (!game.state.discardOffer?.available) { setBuyPosition(null); return; }
    const update = () => {
      const discard = rectOf("discard");
      if (!discard) return;
      const viewportWidth = window.innerWidth;
      const width = Math.min(Math.max(discard.width + 16, 144), viewportWidth - 16);
      const gap = Math.max(8, discard.height * .05);
      const hudBottom = root.current?.querySelector(".game-hud")?.getBoundingClientRect().bottom ?? 0;
      const left = Math.min(Math.max(discard.left + discard.width / 2 - width / 2, 8), viewportWidth - width - 8);
      const top = Math.max(hudBottom + gap, discard.top - gap - 48);
      setBuyPosition((current) => current && Math.abs(current.left - left) < .5 && Math.abs(current.top - top) < .5 && Math.abs(current.width - width) < .5 ? current : { left, top, width });
    };
    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [game.state.discardOffer?.available, game.version, rectOf]);
  const seatTarget = useCallback((userId: string): Rect | null => { const box = rectOf(`seat:${userId}`); return box ? fitCardRect(box, .8) : null; }, [rectOf]);
  const seatRects = useRef(new Map<string, Rect>());
  const previousSeatRects = useRef(new Map<string, Rect>());
  useLayoutEffect(() => {
    previousSeatRects.current = seatRects.current;
    const next = new Map<string, Rect>();
    for (const player of game.state.players) {
      const box = rectOf(`seat:${player.userId}`);
      if (box) next.set(player.userId, fitCardRect(box, .8));
    }
    seatRects.current = next;
  });
  const pushFlight = (flight: FlightSpec) => setFlights((current) => [...current, flight]);
  const addArrival = (cardId: string, arrival: Arrival) => setArrivals((current) => ({ ...current, [cardId]: arrival }));
  const holdCount = (userId: string, value: number | undefined) => { if (value !== undefined) setCountHold((current) => ({ ...current, [userId]: value })); };
  const releaseCount = (userId: string) => setCountHold((current) => { const { [userId]: _released, ...rest } = current; return rest; });

  const players = useMemo(() => game.state.players.map((player) => { const member = lobby.players.find((entry) => entry.user.id === player.userId); return { ...player, user: member?.user ?? { id: player.userId, username: "Spieler", avatarKey: null, tutorialCompleted: false, isAdmin: false }, connected: member?.connected ?? false }; }), [game.state.players, lobby.players]);
  const activePlayer = players.find((player) => player.userId === game.state.activePlayerId) ?? players[0];
  const turnOrder = players.filter((player) => player.userId !== game.state.activePlayerId);
  const hand = useMemo(() => [...game.state.ownHand].sort((a, b) => cardSort(a, b, sort)), [game.state.ownHand, sort]);
  const shownHand = dealtIds ? hand.filter((card) => dealtIds.has(card.id)) : hand;
  const shownCards = (player: { userId: string; handCount: number }) => countHold[player.userId] ?? player.handCount;
  const shownDraw = drawHold ?? game.state.drawPileCount;
  const shownDiscard = discardHold ?? { top: game.state.discardTop, count: game.state.discardPileCount };
  const self = game.state.players.find((player) => player.userId === user.id)!;
  const sameSuit = lobby.settings.streetsRequireSameSuit;
  const [turnBarrierTick, setTurnBarrierTick] = useState(0);
  useEffect(() => {
    const opensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
    if (!Number.isFinite(opensAt)) return;
    const wait = opensAt - Date.now();
    if (wait <= 0) { setTurnBarrierTick((current) => current + 1); return; }
    const timer = window.setTimeout(() => setTurnBarrierTick((current) => current + 1), wait + 20);
    return () => window.clearTimeout(timer);
  }, [game.state.turn.opensAt]);
  const opensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
  const turnOpened = !Number.isFinite(opensAt) || opensAt <= Date.now() || turnBarrierTick > 0;
  const mayAct = game.state.turn.canAct || (turnOpened && game.state.activePlayerId === user.id && !game.state.roundEndedById);
  // A server update is visually committed before another command may start.
  // This keeps a fast next player (or the buy action) from stacking a second
  // transition on top of cards and held counters that are still in flight.
  const visualBusy = introHold || dealing || flights.length > 0 || Object.keys(arrivals).length > 0;
  const canDraw = mayAct && !game.state.turn.hasDrawn && !busy && !visualBusy;
  const canPlay = mayAct && game.state.turn.hasDrawn && !busy && !visualBusy;
  // The buy offer is server-authoritative and time-sensitive. It remains
  // actionable while an older card flight is finishing; starting the purchase
  // fast-forwards that obsolete choreography to the current pile state.
  const canBuy = Boolean(game.state.discardOffer?.available) && self.coins >= 1 && !busy;
  const selectedCards = useMemo(() => hand.filter((card) => selected.includes(card.id)), [hand, selected]);
  const canDiscard = canPlay && selected.length === 1;
  // Only offer the meld zone when the selection would actually pass validation.
  const canLay = canPlay && (self.phaseLaid ? canLayMeld(selectedCards, sameSuit) : canLayPhase(selectedCards, game.state.phase));
  const openMelds = useMemo(() => canPlay && self.phaseLaid && selectedCards.length === 1 ? game.state.melds.filter((meld) => meldAccepts(meld, selectedCards[0])).map((meld) => meld.id) : [], [canPlay, self.phaseLaid, selectedCards, game.state.melds]);
  const targets = useMemo(() => new Set<string>([...(canDraw ? ["draw", ...(game.state.discardTop ? ["discard"] : [])] : []), ...(canDiscard ? ["discard"] : []), ...(canLay ? ["meldzone"] : []), ...openMelds.map((id) => `meld:${id}`)]), [canDraw, canDiscard, canLay, openMelds, game.state.discardTop]);

  useEffect(() => setSelected((current) => current.filter((id) => game.state.ownHand.some((card) => card.id === id))), [game.state.ownHand]);

  // Hand bookkeeping: remember every hand card's on-screen rect (outbound
  // flights start from the spot a card last occupied) and FLIP-shift the
  // remaining cards whenever the hand's composition changes, so inserts and
  // removals glide instead of snapping. The `translate` property composes
  // before the fan transform, so the glide happens in screen space.
  const handRects = useRef(new Map<string, Rect>());
  const handIds = shownHand.map((card) => card.id).join("|");
  const prevHandIds = useRef(handIds);
  useLayoutEffect(() => {
    const container = root.current; if (!container) return;
    const shifted = prevHandIds.current !== handIds; prevHandIds.current = handIds;
    const next = new Map(handRects.current);
    container.querySelectorAll<HTMLElement>(".hand-cards [data-fx-card]").forEach((element) => {
      const id = element.dataset.fxCard ?? ""; const box = element.getBoundingClientRect();
      const rect = { left: box.left, top: box.top, width: box.width, height: box.height };
      const previous = handRects.current.get(id);
      if (shifted && previous && !arrivals[id] && !reduced) {
        const dx = previous.left - rect.left; const dy = previous.top - rect.top;
        if (Math.abs(dx) + Math.abs(dy) > 3) element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration: 240, easing: "cubic-bezier(.3,.7,.3,1)" });
      }
      next.set(id, rect);
    });
    handRects.current = next;
  });

  // Arrival spawner: a card that just appeared in the DOM is measured at its
  // final spot, kept hidden via .is-incoming, and an overlay flight travels
  // onto it. If the layout shifted while it was airborne, it glides the last
  // few pixels after landing.
  const spawned = useRef(new Set<string>());
  const cancelVisuals = useCallback(() => {
    // Keep the overlay, hidden destination cards and all held counters/piles
    // in one cancellation batch. Clearing spawned is essential: a later
    // arrival of the same card id must be allowed to create a fresh flight.
    spawned.current.clear();
    setFlights([]);
    setArrivals({});
    setCountHold({});
    setDiscardHold(null);
    setDrawHold(null);
  }, []);
  useLayoutEffect(() => {
    const container = root.current; if (!container) return;
    const pending = Object.entries(arrivals).filter(([id]) => !spawned.current.has(id));
    if (!pending.length) return;
    const additions: FlightSpec[] = [];
    for (const [id, arrival] of pending) {
      spawned.current.add(id);
      const element = container.querySelector<HTMLElement>(`[data-fx-card="${CSS.escape(id)}"]`);
      const clear = () => { spawned.current.delete(id); setArrivals((current) => { const { [id]: _done, ...rest } = current; return rest; }); arrival.onArrive?.(); };
      if (!element) { clear(); continue; }
      const box = element.getBoundingClientRect();
      const to = { left: box.left, top: box.top, width: box.width, height: box.height };
      additions.push({
        key: `arrival-${id}`, from: arrival.from, to, face: arrival.face, showBack: arrival.showBack, flip: arrival.flip, via: arrival.via, fromTilt: arrival.fromTilt, toTilt: arrival.toTilt, duration: arrival.duration, delay: arrival.delay,
        onArrive: () => {
          if (element.isConnected) {
            const now = element.getBoundingClientRect(); const dx = to.left - now.left; const dy = to.top - now.top;
            if (Math.abs(dx) + Math.abs(dy) > 3) element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration: 200, easing: "ease-out" });
          }
          clear();
        }
      });
    }
    if (additions.length) setFlights((current) => [...current, ...additions]);
  });

  // Deal choreography (#50): the deck drops in from the top, riffle-shuffles,
  // then 11 cards per player travel out round-robin — opponents' cards to
  // their seat (ticking the counter 1…11), own cards sorted straight into the
  // hand. Finally the first discard flips onto the empty discard slot. The
  // sessionStorage flag keeps a reconnect within the same session from
  // replaying it; an interrupted run clears the flag so nothing sticks.
  const introHoldRef = useRef(introHold); introHoldRef.current = introHold;
  const timers = useRef<number[]>([]);
  const dealSettled = useRef(false);
  const fastForwardDeal = useCallback(() => {
    dealSettled.current = true;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setDealing(false);
    setDealStage(null);
    setDealRect(null);
    setDealtIds(null);
    cancelVisuals();
  }, [cancelVisuals]);
  useEffect(() => {
    if (!dealKey || reduced) return;
    if (hasSessionFlag(dealKey)) return;
    try { sessionStorage.setItem(dealKey, "1"); } catch { /* private mode: run once for this mount */ }
    const schedule = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const snapshot = gameRef.current;
    const initialDiscard = snapshot.state.discardTop;
    dealSettled.current = false;
    const order = snapshot.state.players.map((player) => player.userId);
    const ownOrder = snapshot.state.ownHand;
    const total = order.length * INITIAL_HAND_SIZE;
    setDealing(true);
    setDealtIds(new Set());
    setCountHold(Object.fromEntries(order.filter((id) => id !== user.id).map((id) => [id, 0])));
    setDiscardHold({ top: null, count: 0 });
    setDrawHold(snapshot.state.drawPileCount + total + 1);
    const start = introHoldRef.current ? Math.max(0, MATCH_INTRO_MS - 600) : 250;
    schedule(start, () => { setDealRect(rectOf("draw")); setDealStage("drop"); playAudio("deckDrop", { dedupeKey: `${dealKey}-drop` }); });
    schedule(start + DEAL_TIMING.drop, () => { setDealStage("shuffle"); playAudio("shuffle", { dedupeKey: `${dealKey}-shuffle` }); });
    const dealFrom = start + DEAL_TIMING.drop + DEAL_TIMING.shuffle;
    for (let index = 0; index < total; index += 1) {
      const playerId = order[index % order.length];
      const cardIndex = Math.floor(index / order.length);
      schedule(dealFrom + index * DEAL_STEP, () => {
        if (index === 0) setDealStage(null);
        playAudio("deal", { variant: index, intensity: index % order.length === 0 ? .72 : .48 });
        const from = rectOf("draw"); if (!from) return;
        setDrawHold((current) => (current === null ? null : current - 1));
        if (playerId === user.id) {
          const card = ownOrder[cardIndex]; if (!card) return;
          setDealtIds((current) => { const next = new Set(current ?? []); next.add(card.id); return next; });
          addArrival(card.id, { from, face: cardAsset(card), showBack: true, flip: { start: .25, end: .7 }, fromTilt: BOARD_TILT, duration: DEAL_FLIGHT });
        } else {
          const to = seatTarget(playerId); if (!to) return;
          pushFlight({ key: `deal-${index}`, from, to, face: CARD_BACK, showBack: true, fromTilt: BOARD_TILT, duration: DEAL_FLIGHT, onArrive: () => setCountHold((current) => ({ ...current, [playerId]: (current[playerId] ?? 0) + 1 })) });
        }
      });
    }
    const dealEnd = dealFrom + total * DEAL_STEP + DEAL_FLIGHT;
    schedule(dealEnd + 150, () => {
      const from = rectOf("draw"); const to = rectOf("discard"); const top = initialDiscard;
      setDrawHold(null);
      playAudio("flip", { dedupeKey: `${dealKey}-first-discard` });
      if (from && to && top) pushFlight({ key: "deal-first-discard", from, to, face: cardAsset(top), showBack: true, flip: { start: .3, end: .8 }, fromTilt: BOARD_TILT, toTilt: BOARD_TILT, duration: 560, onArrive: () => setDiscardHold(null) });
      else setDiscardHold(null);
    });
    schedule(dealEnd + 900, () => { dealSettled.current = true; setDealing(false); setDealtIds(null); setCountHold({}); });
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = [];
      if (!dealSettled.current) { try { sessionStorage.removeItem(dealKey); } catch { /* no storage access */ } setDealing(false); setDealStage(null); setDealtIds(null); setCountHold({}); setDiscardHold(null); setDrawHold(null); }
    };
  }, [dealKey, playAudio, reduced]);

  // Action-driven animations, keyed by commandId, so a replayed realtime event
  // or a reconnect re-render never animates the same action twice. The first
  // state seen only seeds the set: joining a game in progress must not replay
  // history. Flight plans diff the previous state snapshot against the new one.
  const seen = useRef(new Set<string>()); const primed = useRef(false);
  const prevGame = useRef(game);
  useLayoutEffect(() => {
    const previous = prevGame.current; prevGame.current = game;
    const fresh = game.state.recentActions.filter((action) => !seen.current.has(action.commandId));
    for (const action of game.state.recentActions) seen.current.add(action.commandId);
    if (!primed.current) { primed.current = true; return; }
    if (!fresh.length) return;
    setEvents((current) => [...current, ...fresh.map((action) => ({ key: action.commandId, text: actionText(action, lobby, user.id) }))].slice(-3));
    for (const action of fresh) {
      const merged = action.type === "meld" && game.state.melds.length === previous.state.melds.length;
      const cue = audioCueForGameAction(action.type, merged);
      if (cue) playAudio(cue, { dedupeKey: action.commandId, intensity: action.userId === user.id ? 1 : .78 });
    }
    // Only adjacent versions have an unambiguous before/after snapshot. On a
    // reconnect or missed packet we deliberately fast-forward to the server
    // truth instead of inventing a flight from an aggregate diff. A round
    // rollover also replaces every pile/hand in one mutation and is therefore
    // never treated as the final discard of the old round.
    const plannedAction = fresh.length === 1 ? fresh[0] : null;
    if (!plannedAction || game.version !== previous.version + 1 || plannedAction.version !== game.version || previous.state.round !== game.state.round) {
      if (dealing) fastForwardDeal();
      else cancelVisuals();
      return;
    }
    // A fresh authoritative action wins over every older choreography. During
    // the opening deal this reveals the complete snapshot first, then plans the
    // action normally; it must never be marked seen and silently discarded.
    if (dealing) fastForwardDeal();
    else cancelVisuals();
    let meldsPlanned = false;
    for (const action of [plannedAction]) {
      const mine = action.userId === user.id;
      if (action.type === "timeout" || action.type === "disconnect-skip") {
        // Automatic turn completion is one authoritative mutation but two
        // visible beats: an optional draw followed by the forced discard.
        const includesDraw = action.metadata?.includesDraw ?? !previous.state.turn.hasDrawn;
        const includesDiscard = action.metadata?.includesDiscard ?? true;
        const previousCount = previous.state.players.find((player) => player.userId === action.userId)?.handCount ?? 0;
        const drawFrom = rectOf("draw");
        const discardTo = rectOf("discard");
        const discarded = game.state.discardTop;
        const oldDiscard = { top: previous.state.discardTop, count: previous.state.discardPileCount };
        const discardDelay = includesDraw ? 760 : 0;
        holdCount(action.userId, previousCount);
        if (includesDiscard) setDiscardHold(oldDiscard);

        if (mine) {
          const added = game.state.ownHand.find((entry) => !previous.state.ownHand.some((card) => card.id === entry.id));
          const removed = previous.state.ownHand.find((entry) => !game.state.ownHand.some((card) => card.id === entry.id));
          const handBox = rectOf("hand");
          const handTarget = handBox ? fitCardRect(handBox, .9) : null;
          if (includesDraw && drawFrom) {
            const onDrawn = () => setCountHold((current) => ({ ...current, [action.userId]: previousCount + 1 }));
            if (added) addArrival(added.id, { from: drawFrom, face: cardAsset(added), showBack: true, flip: { start: .18, end: .6 }, via: { dx: drawFrom.width * 1.15, dy: -drawFrom.height * .08 }, fromTilt: BOARD_TILT, duration: 700, onArrive: onDrawn });
            else if (handTarget && discarded) pushFlight({ key: `${action.commandId}-auto-draw`, from: drawFrom, to: handTarget, face: cardAsset(discarded), showBack: true, flip: { start: .2, end: .62 }, fromTilt: BOARD_TILT, duration: 700, onArrive: onDrawn });
          }
          if (includesDiscard && discardTo && discarded) {
            const from = (removed && handRects.current.get(removed.id)) ?? handTarget;
            if (from) pushFlight({ key: `${action.commandId}-auto-discard`, from, to: discardTo, face: cardAsset(discarded), toTilt: BOARD_TILT, duration: 520, delay: discardDelay, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
            else { setDiscardHold(null); releaseCount(action.userId); }
          } else if (!includesDiscard) releaseCount(action.userId);
        } else {
          const seat = previousSeatRects.current.get(action.userId) ?? seatTarget(action.userId);
          if (includesDraw && drawFrom && seat) pushFlight({ key: `${action.commandId}-auto-draw`, from: drawFrom, to: seat, face: CARD_BACK, showBack: true, fromTilt: BOARD_TILT, duration: 540, onArrive: () => setCountHold((current) => ({ ...current, [action.userId]: previousCount + 1 })) });
          if (includesDiscard && seat && discardTo && discarded) pushFlight({ key: `${action.commandId}-auto-discard`, from: seat, to: discardTo, face: cardAsset(discarded), showBack: true, flip: { start: .55, end: .94 }, toTilt: BOARD_TILT, duration: 620, delay: discardDelay, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
          else if (includesDiscard) { setDiscardHold(null); releaseCount(action.userId); }
          else releaseCount(action.userId);
        }
      } else if (action.type === "draw" || action.type === "buy") {
        const source = action.type === "buy" ? "discard" : action.metadata?.source ?? (game.state.discardPileCount < previous.state.discardPileCount ? "discard" : "draw");
        const from = rectOf(source); if (!from) continue;
        const fromDiscard = source === "discard";
        if (fromDiscard) setDiscardHold({ top: previous.state.discardTop, count: previous.state.discardPileCount });
        if (mine) {
          const card = game.state.ownHand.find((entry) => !previous.state.ownHand.some((own) => own.id === entry.id));
          if (!card) { if (fromDiscard) setDiscardHold(null); continue; }
          // Own draw: off the pile, a nudge to the right, flip face-up, then
          // glide into the sorted slot. A bought card is already face-up.
          if (source === "draw") addArrival(card.id, { from, face: cardAsset(card), showBack: true, flip: { start: .18, end: .58 }, via: { dx: from.width * 1.2, dy: -from.height * .08 }, fromTilt: BOARD_TILT, duration: 700 });
          else addArrival(card.id, { from, face: cardAsset(card), fromTilt: BOARD_TILT, duration: 620, onArrive: () => setDiscardHold(null) });
        } else {
          const to = seatTarget(action.userId); if (!to) { if (fromDiscard) setDiscardHold(null); continue; }
          holdCount(action.userId, previous.state.players.find((player) => player.userId === action.userId)?.handCount);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: fromDiscard && previous.state.discardTop ? cardAsset(previous.state.discardTop) : CARD_BACK, showBack: !fromDiscard, fromTilt: BOARD_TILT, duration: 540, onArrive: () => { if (fromDiscard) setDiscardHold(null); releaseCount(action.userId); } });
        }
      } else if (action.type === "discard") {
        const to = rectOf("discard"); const card = game.state.discardTop;
        if (!to || !card) continue;
        const hold = { top: previous.state.discardTop, count: previous.state.discardPileCount };
        if (mine) {
          const removed = previous.state.ownHand.find((entry) => !game.state.ownHand.some((own) => own.id === entry.id));
          const from = (removed && handRects.current.get(removed.id)) ?? rectOf("hand");
          if (!from) continue;
          setDiscardHold(hold);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: cardAsset(card), toTilt: BOARD_TILT, duration: 500, onArrive: () => setDiscardHold(null) });
        } else {
          const from = previousSeatRects.current.get(action.userId) ?? seatTarget(action.userId); if (!from) continue;
          setDiscardHold(hold);
          holdCount(action.userId, previous.state.players.find((player) => player.userId === action.userId)?.handCount);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: cardAsset(card), showBack: true, flip: { start: .55, end: .95 }, toTilt: BOARD_TILT, duration: 620, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
        }
      } else if (action.type === "phase" || action.type === "meld" || action.type === "add-to-meld") {
        // All meld growth between the two states animates once, attributed to
        // the acting player: own cards fly face-up from their hand slots,
        // opponents' cards travel face-down from their seat and flip on the
        // pile they now belong to.
        if (meldsPlanned) continue; meldsPlanned = true;
        const grown: Card[] = [];
        for (const meld of game.state.melds) {
          const before = previous.state.melds.find((entry) => entry.id === meld.id);
          grown.push(...meld.cards.filter((entry) => !before || !before.cards.some((card) => card.id === entry.id)));
        }
        if (!grown.length) continue;
        const previousCount = previous.state.players.find((player) => player.userId === action.userId)?.handCount;
        if (!mine) holdCount(action.userId, previousCount);
        const lastId = grown[grown.length - 1].id;
        grown.forEach((card, offset) => {
          const from = mine ? ((handRects.current.get(card.id) ?? rectOf("hand"))) : seatTarget(action.userId);
          if (!from) return;
          addArrival(card.id, mine
            ? { from, face: cardAsset(card), toTilt: BOARD_TILT, duration: 520, delay: offset * 70 }
            : { from, face: cardAsset(card), showBack: true, flip: { start: .5, end: .92 }, toTilt: BOARD_TILT, duration: 620, delay: offset * 80, onArrive: () => {
                if (card.id === lastId) releaseCount(action.userId);
                else setCountHold((current) => ({ ...current, [action.userId]: Math.max(0, (current[action.userId] ?? previousCount ?? 0) - 1) }));
              } });
        });
      }
    }
  }, [game.version, playAudio]);
  useEffect(() => { if (!events.length) return; const timer = window.setTimeout(() => setEvents((current) => current.slice(1)), 2600); return () => window.clearTimeout(timer); }, [events]);

  const act = async (path: string, body?: object, options: { interruptVisuals?: boolean } = {}) => {
    if (visualBusy && !options.interruptVisuals) return;
    await runSingleFlight(actionGate, async () => {
      if (options.interruptVisuals) cancelVisuals();
      setPendingAction(path); setActionError("");
      try { const result = await api<Game>(`/games/${lobby.code}/${path}`, { method: "POST", body: JSON.stringify({ commandId: crypto.randomUUID(), expectedVersion: game.version, payload: body ?? {} }) }); onGame(result); setSelected([]); }
      catch (reason) { if (reason instanceof ApiError && typeof reason.body === "object" && reason.body && "state" in reason.body && "version" in reason.body) onGame(reason.body as Game); setActionError(message(reason)); playAudio("error"); }
      finally { setPendingAction(null); }
    });
  };
  const toggleCard = (cardId: string) => setSelected((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  const laySelected = () => { try { if (self.phaseLaid) void act("melds", { cardIds: selected }); else void act("phase", { combinations: phaseGroups(selectedCards, game.state.phase).map((group) => group.map((card) => card.id)) }); } catch (reason) { setActionError(message(reason)); playAudio("dropInvalid"); } };
  const runZone = (zone: string, cardId?: string) => {
    const card = cardId ?? selected[0];
    if (zone === "draw" && canDraw) return void act("draw", { source: "draw" });
    if (zone === "discard" && canDiscard && card) return void act("discard", { cardId: card });
    if (zone === "discard" && canDraw) return void act("draw", { source: "discard" });
    if (zone === "meldzone" && canLay) return laySelected();
    if (zone.startsWith("meld:") && openMelds.includes(zone.slice(5)) && card) return void act(`melds/${zone.slice(5)}/cards`, { cardId: card });
    setActionError("Diese Karte passt hier nicht.");
    playAudio("dropInvalid");
  };
  const requestLeave = () => {
    setMenu(false);
    if (requiresLeaveConfirmation(game.state.status)) setLeaveConfirmation(true);
    else void onLeave();
  };
  const buyDiscard = () => { void act("buy", undefined, { interruptVisuals: true }); };
  const buyOnPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); buyDiscard();
  };
  const buyOnClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // Pointer and touch input already commits on pointerup. A synthetic click
    // with detail 0 is keyboard or assistive input and must remain supported.
    if (event.detail === 0) buyDiscard();
  };
  const confirmLeave = async () => {
    await runSingleFlight(leaveGate, async () => {
      setLeaveBusy(true);
      const left = await onLeave();
      if (!left) {
        setActionError("Die Lobby konnte nicht verlassen werden. Bitte versuche es erneut.");
        setLeaveBusy(false);
      }
    });
  };

  // Pointer events rather than HTML5 drag-and-drop: the native API emits nothing
  // on touch, so this is the only path that serves mouse and finger alike.
  const startDrag = (card: Card) => (event: React.PointerEvent) => {
    if (!canPlay || event.button > 0) return;
    const originX = event.clientX; const originY = event.clientY; let live = false;
    const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-zone]") as HTMLElement | null)?.dataset.zone ?? null;
    const move = (moveEvent: PointerEvent) => {
      // Only start dragging (and apply the dragged style) past a ~10px threshold,
      // so a small jitter on click never reads as a drag.
      if (!live && Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) < 10) return;
      if (!live) { live = true; setSelected((current) => current.includes(card.id) ? current : [card.id]); playAudio("dragStart"); }
      const zone = zoneAt(moveEvent.clientX, moveEvent.clientY);
      setDrag({ cardId: card.id, x: moveEvent.clientX, y: moveEvent.clientY, zone });
    };
    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      setDrag(null);
      if (!live) return;
      const zone = zoneAt(upEvent.clientX, upEvent.clientY);
      if (zone) { if (targets.has(zone)) playAudio("dropValid"); runZone(zone, card.id); }
      else playAudio("dropInvalid");
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  };
  // A zone is a target only if the rules accept it; hovering any other zone while
  // dragging reads as refused, which is the feedback without sending an action.
  const zoneClass = (zone: string) => targets.has(zone) ? "is-target" : drag?.zone === zone ? "is-refused" : "";

  const hint = dealing || !turnOpened ? "Mischen und Geben …" : !mayAct ? `${activePlayer?.user.username ?? "Spieler"} ist am Zug` : !game.state.turn.hasDrawn ? "Ziehe vom Stapel oder von der Ablage" : canLay ? "Auswahl in die Meld-Zone legen" : openMelds.length ? "An eine passende Auslage anlegen" : selected.length === 1 ? "Karte ablegen oder anlegen" : "Wähle Karten oder lege eine Karte ab";
  const showRoundResult = game.state.status === "ACTIVE" && game.state.lastRoundResult && dismissedRound !== game.state.lastRoundResult.round;
  return <main ref={root} className={`landscape-view game-view ${drag ? "is-dragging" : ""} ${dealStage ? "is-staging" : ""}`} data-version={game.version} {...(introHold ? { inert: true } : {})}>
    <Orientation landscape />
    <GameHud
      turnOrder={turnOrder}
      activePlayer={activePlayer}
      userId={user.id}
      round={game.state.round}
      phase={game.state.phase}
      selfPhaseLaid={self.phaseLaid}
      opensAt={game.state.turn.opensAt}
      deadlineAt={game.state.turn.deadlineAt}
      finished={game.state.status === "FINISHED"}
      seatRef={(userId) => anchor(`seat:${userId}`)}
      shownCards={shownCards}
      onProfile={onProfile}
    />
    <p className="turn-hint" aria-live="polite">{hint}</p>
    <BuyButton visible={Boolean(game.state.discardOffer?.available)} position={buyPosition} canBuy={canBuy} busy={pendingAction === "buy"} onPointerUp={buyOnPointerUp} onClick={buyOnClick} />
    <GameBoard
      zoneClass={zoneClass}
      anchor={anchor}
      runZone={runZone}
      canDraw={canDraw}
      canDiscard={canDiscard}
      canLay={canLay}
      shownDraw={shownDraw}
      shownDiscard={shownDiscard}
      discardTop={game.state.discardTop}
      melds={game.state.melds}
      openMelds={openMelds}
      arrivals={arrivals}
    />
    <PlayerHand
      handRef={anchor("hand")}
      cards={shownHand}
      selected={selected}
      dragCardId={drag?.cardId ?? null}
      arrivals={arrivals}
      startDrag={startDrag}
      toggleCard={toggleCard}
    />
    <nav className="game-nav" aria-label="Spielnavigation"><button className="game-nav-button" disabled={introHold} aria-label="Spielmenü öffnen" onClick={() => setMenu(true)}>☰ <span>Menü</span></button></nav>
    <GameStatusBar connected={connected} />
    <GameEvents events={events} />
    {actionError && <div className="game-error" role="alert">{actionError}</div>}
    {drag && <DragGhost drag={{ x: drag.x, y: drag.y }} card={hand.find((entry) => entry.id === drag.cardId) ?? null} />}
    <FlightLayer flights={flights} reduced={reduced} onDone={(key) => setFlights((current) => current.filter((entry) => entry.key !== key))} />
    {dealStage && dealRect && <DealStage rect={dealRect} stage={dealStage} />}
    {menu && <GameMenu sort={sort} onSort={setSort} onScoreboard={() => { setMenu(false); setScoreboard(true); }} onProfile={() => { setMenu(false); onProfile(user.id); }} onTutorial={() => { setMenu(false); onTutorial(); }} onLeave={requestLeave} onClose={() => setMenu(false)} />}
    {leaveConfirmation && <ConfirmationDialog title="Laufende Partie verlassen?" message="Du verlässt die Partie sofort. Falls du gerade am Zug bist, wird dein Zug automatisch beendet." busy={leaveBusy} confirmLabel="Ja, Partie verlassen" busyLabel="Partie wird verlassen …" onConfirm={() => void confirmLeave()} onCancel={() => setLeaveConfirmation(false)} />}
    {scoreboard && <Scoreboard game={game} lobby={lobby} onClose={() => setScoreboard(false)} />}
    {showRoundResult && <RoundResultOverlay result={game.state.lastRoundResult!} nextPhase={game.state.phase} lobby={lobby} onContinue={() => setDismissedRound(game.state.lastRoundResult!.round)} />}
    {game.state.status === "FINISHED" && <FinalResultOverlay placements={game.state.placements} lobby={lobby} onLeave={onLeave} />}
  </main>;
}
