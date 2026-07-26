import type { ReactNode } from "react";
import type { ProfileStatistics } from "../../../lib/types.js";

// Avatar preview plus the player's name and lifetime statistics grid.
export function ProfileSummary({ preview, displayed, profile }: { preview: ReactNode; displayed: { username: string }; profile: ProfileStatistics | null }) {
  return <div className="profile-summary">
    {preview}
    <div><strong className="profile-name">{displayed.username}</strong>{profile && <div className="stat-grid"><span><b>{profile.statistics.gamesPlayed}</b> Spiele</span><span><b>{profile.statistics.gamesWon}</b> Siege</span><span><b>{profile.statistics.totalPenalty}</b> Strafpunkte</span><span><b>{profile.statistics.cardsBought}</b> Käufe</span></div>}</div>
  </div>;
}
