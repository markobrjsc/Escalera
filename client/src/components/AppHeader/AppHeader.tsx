import { Avatar } from "../Avatar/Avatar.js";
import { Brand } from "../Brand/Brand.js";
import type { User } from "../../lib/types.js";

// The top bar shared by the lobby list and the lobby screen: a left action
// (logout or leave), the compact wordmark and the profile button. The optional
// data-audio hooks match each screen's original click-sound behaviour.
export function AppHeader({ user, leftLabel, leftAudio, onLeft, onProfile, profileAudio }: { user: User; leftLabel: string; leftAudio?: string; onLeft: () => void; onProfile: () => void; profileAudio?: string }) {
  return <header className="app-header">
    <button className="logout-button" data-audio={leftAudio} aria-label={leftLabel} onClick={onLeft}>⇥</button>
    <Brand variant="compact" />
    <button className="profile-button" data-audio={profileAudio} aria-label="Profil öffnen" onClick={onProfile}><Avatar user={user} /></button>
  </header>;
}
