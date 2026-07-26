import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { makeVoice } from "../../dev/fixtures.js";
import type { LobbyVoice } from "../../lib/types.js";
import { VoiceStatus } from "./VoiceStatus.js";

function renderGame(overrides: Partial<LobbyVoice> = {}) {
  return renderToStaticMarkup(<VoiceStatus voice={makeVoice(overrides)} variant="game" />);
}

describe("VoiceStatus im Gamefield", () => {
  it("nutzt bei aktiver Verbindung ausschließlich den kompakten Mikrofon-Button", () => {
    const html = renderGame();

    expect(html).toContain("voice-status-connected");
    expect(html).toContain("<strong>Mikro an</strong>");
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Mikrofon ist an. Eigenes Mikrofon stummschalten");
    expect(html).toContain("voice-microphone-icon");
    expect(html).not.toContain("voice-connection");
    expect(html).not.toContain("Voice verbunden");
    expect(html).not.toContain("disabled");
  });

  it("kennzeichnet ein stummgeschaltetes Mikrofon als gedrückten Toggle", () => {
    const html = renderGame({ selfMuted: true });

    expect(html).toContain("<strong>Mikro aus</strong>");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Mikrofon ist aus. Eigenes Mikrofon einschalten");
    expect(html).toContain("voice-microphone-slash");
  });

  it.each<LobbyVoice["status"]>(["idle", "requesting", "listen-only", "unsupported"])(
    "zeigt %s als nicht verbundene, deaktivierte Steuerung",
    (status) => {
      const html = renderGame({ status, canSelfMute: false });

      expect(html).toContain("<strong>Voice nicht verbunden</strong>");
      expect(html).toContain("Voice nicht verbunden. Mikrofonsteuerung nicht verfügbar");
      expect(html).toContain("disabled");
      expect(html).not.toContain("aria-pressed");
      expect(html).not.toContain("voice-connection");
    }
  );

  it("zeigt Hinweise im Game nicht als zweite sichtbare Statusquelle", () => {
    const html = renderGame({ status: "listen-only", canSelfMute: false, notice: "Mikrofon nicht freigegeben" });

    expect(html).toContain("<strong>Voice nicht verbunden</strong>");
    expect(html).not.toContain("Mikrofon nicht freigegeben");
    expect(html).not.toContain("<small");
  });
});

describe("VoiceStatus in der Lobby", () => {
  it("behält Verbindungsanzeige und Mikrofonsteuerung bei", () => {
    const html = renderToStaticMarkup(<VoiceStatus voice={makeVoice()} variant="lobby" />);

    expect(html).toContain("voice-connection");
    expect(html).toContain("Voice verbunden");
    expect(html).toContain("<strong>Mikro an</strong>");
  });
});
