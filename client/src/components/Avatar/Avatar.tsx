import { API_URL } from "../../lib/api.js";
import type { User } from "../../lib/types.js";

export function Avatar({ user, large = false, onClick }: { user: Pick<User, "id" | "username" | "avatarKey">; large?: boolean; onClick?: () => void }) {
  const className = `profile-icon ${large ? "profile-icon-large" : ""}`;
  const content = user.avatarKey
    ? <span className={className}><img src={`${API_URL}/profile/avatar/${user.id}?size=${large ? 512 : 128}&v=${encodeURIComponent(user.avatarKey)}`} alt="" /></span>
    : <span className={className} aria-hidden="true">{user.username[0].toUpperCase()}</span>;
  return onClick ? <button type="button" className="avatar-button" aria-label={`Profil von ${user.username} öffnen`} onClick={onClick}>{content}</button> : content;
}
