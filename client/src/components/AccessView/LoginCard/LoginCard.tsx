import { FormEvent, useState } from "react";
import { api, message } from "../../../lib/api.js";
import type { User } from "../../../lib/types.js";
import { useAudio } from "../../../audio.js";
import { Brand } from "../../Brand/Brand.js";

// The login / registration card: a single username+password form that flips into
// a confirmation step the first time a name is seen. Owns its own field state.
export function LoginCard({ error, setError, onAccess }: { error: string; setError: (value: string) => void; onAccess: (user: User, created: boolean) => void }) {
  const { play: playAudio } = useAudio();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const access = async (registration: boolean) => {
    const result = await api<{ user: User; created: boolean }>("/auth/access", { method: "POST", body: JSON.stringify({ username, password, ...(registration ? { passwordConfirmation: confirmation, acceptPasswordLoss: accepted } : {}) }) });
    playAudio(result.created ? "register" : "login");
    onAccess(result.user, result.created);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (registering) { await access(true); return; }
      const { exists } = await api<{ exists: boolean }>(`/auth/username?username=${encodeURIComponent(username)}`);
      if (exists) await access(false); else { setRegistering(true); playAudio("open"); }
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  return <section className={`surface login-card ${registering ? "registration-card" : ""}`}><Brand /><form onSubmit={submit}><label>Benutzername<input value={username} onChange={(event) => { setUsername(event.target.value); setRegistering(false); }} minLength={3} maxLength={24} autoComplete="username" required /></label><label>Passwort<input value={password} onChange={(event) => { setPassword(event.target.value); setRegistering(false); }} minLength={12} type="password" autoComplete={registering ? "new-password" : "current-password"} required /></label>{registering && <><label>Passwort wiederholen<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} type="password" autoComplete="new-password" required /></label><label className="registration-warning"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); playAudio(event.target.checked ? "success" : "close"); }} required /><span>Ich verstehe: Ohne dieses Passwort kann mein Konto nicht wiederhergestellt werden.</span></label></>}{error && <p className="error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Einen Moment …" : registering ? "Konto verbindlich erstellen" : "Weiter"}</button>{registering && <button type="button" className="button-quiet" data-audio="close" onClick={() => setRegistering(false)}>Zurück zur Anmeldung</button>}</form><p className="login-note muted">Ist dein Name noch frei, bestätigst du im nächsten Schritt bewusst die Registrierung.</p></section>;
}
