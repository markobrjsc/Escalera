import type { Lobby } from "../../../lib/types.js";
import { Badge } from "../../Badge/Badge.js";

// The row of lobby-setting badges (players, jokers, turn time, street rule).
export function SettingBadges({ settings }: { settings: Lobby["settings"] }) {
  return <section className="setting-badges"><Badge>{settings.maxPlayers} Spieler</Badge><Badge>{settings.jokersPerPlayer} Joker</Badge><Badge>{settings.maxTurnSeconds ?? "∞"} Sek.</Badge><Badge>Straße {settings.streetsRequireSameSuit ? "mit Zeichen" : "frei"}</Badge></section>;
}
