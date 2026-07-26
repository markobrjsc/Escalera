import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "./Avatar/Avatar.js";
import { Brand } from "./Brand/Brand.js";
import { Connection } from "./Connection/Connection.js";
import { SignalIcon } from "./GameStatusBar/SignalIcon/SignalIcon.js";
import { PlayerStatLabels } from "./PlayerStatLabels/PlayerStatLabels.js";
import { EmptyState } from "./EmptyState/EmptyState.js";
import { CardFace } from "./CardFace/CardFace.js";
import { VoiceStatus } from "./VoiceStatus/VoiceStatus.js";
import { makeUser, makeVoice } from "../dev/fixtures.js";

// Central reusable components render in isolation (no DOM, no context) so their
// markup contract stays stable while the UI is split into modules (#89).
describe("Isoliertes Rendern zentraler Komponenten", () => {
  it("Avatar zeigt die Initiale ohne Bild", () => {
    const html = renderToStaticMarkup(<Avatar user={makeUser({ username: "marko" })} />);
    expect(html).toContain("profile-icon");
    expect(html).toContain(">M<");
  });

  it("Brand rendert die Wortmarke in beiden Varianten", () => {
    expect(renderToStaticMarkup(<Brand />)).toContain("brand-suits");
    expect(renderToStaticMarkup(<Brand variant="compact" />)).toContain("brand-small");
  });

  it("Connection spiegelt den Verbindungszustand", () => {
    expect(renderToStaticMarkup(<Connection connected />)).toContain("Online");
    expect(renderToStaticMarkup(<Connection connected={false} />)).toContain("Verbinde");
  });

  it("SignalIcon markiert den Online-Zustand per Klasse", () => {
    expect(renderToStaticMarkup(<SignalIcon online />)).toContain("signal-icon online");
    expect(renderToStaticMarkup(<SignalIcon online={false} />)).not.toContain("signal-icon online");
  });

  it("PlayerStatLabels blendet die Strafe nur bei Bedarf ein", () => {
    expect(renderToStaticMarkup(<PlayerStatLabels coins={5} cards={7} />)).not.toContain("Strafpunkte");
    expect(renderToStaticMarkup(<PlayerStatLabels coins={5} cards={7} penalty={40} />)).toContain("40 Strafpunkte");
  });

  it("EmptyState rendert Titel und Hinweis", () => {
    const html = renderToStaticMarkup(<EmptyState title="Leer" hint="Nichts hier" className="lobby-loading" />);
    expect(html).toContain("empty-state lobby-loading");
    expect(html).toContain("Nichts hier");
  });

  it("CardFace verweist auf das Kartenasset", () => {
    const html = renderToStaticMarkup(<CardFace card={{ id: "x", deck: 1, kind: "standard", rank: "7", suit: "hearts" }} />);
    expect(html).toContain("/cards/7H.svg");
  });

  it("VoiceStatus zeigt den Verbindungsstatus und die Mikrofonsteuerung", () => {
    const html = renderToStaticMarkup(<VoiceStatus voice={makeVoice()} variant="lobby" />);
    expect(html).toContain("voice-status-connected");
    expect(html).toContain("Mikro an");
  });
});
