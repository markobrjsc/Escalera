import type { ReactNode } from "react";

// The avatar preview with its upload / delete controls. Purely presentational —
// the ProfileDialog owns the file state and API calls.
export function AvatarEditor({ avatar, editable, open, busy, canRemove, onToggle, onPick, onRemove }: { avatar: ReactNode; editable: boolean; open: boolean; busy: boolean; canRemove: boolean; onToggle: () => void; onPick: (file: File) => void; onRemove: () => void }) {
  return <div className="profile-preview">{avatar}{editable && <><button className="avatar-edit-button" data-audio="open" aria-label="Profilbild bearbeiten" onClick={onToggle}>✎</button>{open && <div className="avatar-actions"><label className="button button-primary">Hochladen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) onPick(selected); }} /></label><button disabled={!canRemove || busy} className="button-danger" onClick={onRemove}>Löschen</button></div>}</>}</div>;
}
