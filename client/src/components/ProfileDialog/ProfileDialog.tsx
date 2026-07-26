import { useEffect, useRef, useState } from "react";
import { api, API_URL, message } from "../../lib/api.js";
import type { ProfileStatistics, User } from "../../lib/types.js";
import { useAudio } from "../../audio.js";
import type { AudioPreferences } from "../../audio.js";
import { Avatar } from "../Avatar/Avatar.js";
import { AchievementTreeOverlay } from "../AchievementTreeOverlay/AchievementTreeOverlay.js";
import { AvatarEditor } from "./AvatarEditor/AvatarEditor.js";
import { ProfileSummary } from "./ProfileSummary/ProfileSummary.js";
import { AudioSettingsPanel } from "./AudioSettingsPanel/AudioSettingsPanel.js";

export function ProfileDialog({ viewer, userId, onUser, onTutorial, onClose, initialProfile = null }: { viewer: User; userId: string; onUser: (user: User) => void; onTutorial: () => void; onClose: () => void; initialProfile?: ProfileStatistics | null }) {
  const { preferences, setPreferences, play: playAudio } = useAudio();
  const [file, setFile] = useState<File | null>(null);
  const [avatarActions, setAvatarActions] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileStatistics | null>(initialProfile);
  const [treeOpen, setTreeOpen] = useState(false);
  const saveAudioTimer = useRef<number | null>(null);
  const pendingAudio = useRef(preferences);
  const audioDirty = useRef(false);
  useEffect(() => { pendingAudio.current = preferences; }, [preferences]);
  useEffect(() => {
    if (initialProfile) return;
    api<ProfileStatistics>(`/profile/users/${userId}`).then(setProfile).catch((reason) => { setError(message(reason)); playAudio("error"); });
  }, [initialProfile, playAudio, userId]);
  useEffect(() => () => {
    if (saveAudioTimer.current !== null) window.clearTimeout(saveAudioTimer.current);
    if (!audioDirty.current) return;
    void fetch(`${API_URL}/profile/audio`, {
      method: "PUT",
      credentials: "include",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pendingAudio.current)
    });
  }, []);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const upload = async (selectedFile: File) => {
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", selectedFile);
      const updated = (await api<{ user: User }>("/profile/avatar", { method: "POST", body })).user;
      onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false); playAudio("success");
    } catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try { const updated = (await api<{ user: User }>("/profile/avatar", { method: "DELETE" })).user; onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false); playAudio("success"); }
    catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const queueAudioSave = (next: AudioPreferences) => {
    pendingAudio.current = next;
    audioDirty.current = true;
    setPreferences(next);
    if (saveAudioTimer.current !== null) window.clearTimeout(saveAudioTimer.current);
    saveAudioTimer.current = window.setTimeout(async () => {
      const submitted = pendingAudio.current;
      try {
        const saved = await api<AudioPreferences>("/profile/audio", { method: "PUT", body: JSON.stringify(submitted) });
        if (pendingAudio.current === submitted) {
          audioDirty.current = false;
          setPreferences(saved);
        }
      } catch (reason) { setError(message(reason)); playAudio("error"); }
    }, 320);
  };
  const setAudioLevel = (key: "music" | "effects", value: number) => queueAudioSave({ ...pendingAudio.current, [key]: value });
  const toggleMute = () => {
    const next = { ...pendingAudio.current, muted: !pendingAudio.current.muted };
    queueAudioSave(next);
    if (preferences.muted) window.setTimeout(() => playAudio("success", { intensity: .55 }), 30);
  };
  const displayed = profile?.user ?? (viewer.id === userId ? viewer : { id: userId, username: "Spieler", avatarKey: null });
  const editable = viewer.id === userId;
  const avatar = preview ? <img src={preview} alt="Neue Profilbild-Vorschau" /> : <Avatar user={displayed} large />;
  return <div className="dialog-backdrop">
    <section className="surface dialog profile-dialog">
      <div className="dialog-title"><div><p className="overline">{editable ? "Dein Konto" : "Spielerprofil"}</p><h2>Profil</h2></div><button className="button-icon" data-audio="close" onClick={onClose} aria-label="Schließen">×</button></div>
      <ProfileSummary
        preview={<AvatarEditor avatar={avatar} editable={editable} open={avatarActions} busy={busy} canRemove={Boolean(displayed.avatarKey)} onToggle={() => setAvatarActions((open) => !open)} onPick={(selected) => { setFile(selected); void upload(selected); }} onRemove={() => void remove()} />}
        displayed={displayed}
        profile={profile}
      />
      {editable && <AudioSettingsPanel preferences={preferences} onToggleMute={toggleMute} onLevel={setAudioLevel} />}
      {profile && <div className="profile-actions"><button className="button achievements-open" data-audio="open" onClick={() => setTreeOpen(true)}><span aria-hidden="true">✦</span> Erfolgsbaum ansehen<small>{profile.tree.flatMap((branch) => branch.nodes).filter((node) => node.unlocked).length} / {profile.tree.flatMap((branch) => branch.nodes).length} freigeschaltet</small></button>{editable && <button className="button" data-audio="open" onClick={onTutorial}>Kurzanleitung</button>}</div>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {treeOpen && profile && <AchievementTreeOverlay tree={profile.tree} username={displayed.username} onClose={() => setTreeOpen(false)} />}
  </div>;
}
