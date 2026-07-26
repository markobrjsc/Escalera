import type { Card } from "@escalera/game-rules";
import { cardLabel } from "../../../lib/cards.js";
import type { Anchor, Arrival, GameMeld } from "../../../lib/types.js";
import { PileStation } from "./PileStation/PileStation.js";
import { MeldZone } from "./MeldZone/MeldZone.js";

// The tilted play surface: draw pile, meld/play area and discard pile. Composed
// from the pile stations and the meld zone.
export function GameBoard({ zoneClass, anchor, runZone, canDraw, canDiscard, canLay, shownDraw, shownDiscard, discardTop, melds, openMelds, arrivals }: {
  zoneClass: (zone: string) => string;
  anchor: Anchor;
  runZone: (zone: string, cardId?: string) => void;
  canDraw: boolean;
  canDiscard: boolean;
  canLay: boolean;
  shownDraw: number;
  shownDiscard: { top: Card | null; count: number };
  discardTop: Card | null;
  melds: GameMeld[];
  openMelds: string[];
  arrivals: Record<string, Arrival>;
}) {
  return <section className="game-board" data-tutorial-target="game-board">
    <PileStation
      zone="draw"
      zoneClassName={zoneClass("draw")}
      onZoneClick={() => runZone("draw")}
      buttonRef={anchor("draw")}
      buttonClassName="game-pile draw-pile"
      ariaLabel={`Vom Stapel ziehen, ${shownDraw} Karten verbleiben`}
      disabled={!canDraw}
      stackCount={shownDraw}
      stackTop={null}
      kind="draw"
      label="Ziehstapel"
      count={shownDraw}
      tutorialTarget="draw-discard"
    />
    <MeldZone
      melds={melds}
      openMelds={openMelds}
      zoneClassName={zoneClass("meldzone")}
      zoneRef={anchor("meldzone")}
      onZoneClick={() => { if (canLay) runZone("meldzone"); }}
      meldRef={(meldId) => anchor(`meld:${meldId}`)}
      onMeldActivate={(meldId) => runZone(`meld:${meldId}`)}
      arrivals={arrivals}
    />
    <PileStation
      zone="discard"
      zoneClassName={zoneClass("discard")}
      onZoneClick={() => runZone("discard")}
      buttonRef={anchor("discard")}
      buttonClassName="game-pile discard-pile"
      ariaLabel={canDiscard ? "Ausgewählte Karte ablegen" : shownDiscard.top ? `${cardLabel(shownDiscard.top)} von der Ablage ziehen` : "Ablage ist leer"}
      disabled={!canDiscard && !(canDraw && discardTop)}
      stackCount={shownDiscard.count}
      stackTop={shownDiscard.top}
      kind="discard"
      label="Ablage"
      count={shownDiscard.count}
    />
  </section>;
}
