import { Orientation } from "../Orientation/Orientation.js";
import { LoginCard } from "./LoginCard/LoginCard.js";
import type { User } from "../../lib/types.js";

export function AccessView({ intro, error, setError, onAccess }: { intro: boolean; error: string; setError: (value: string) => void; onAccess: (user: User, created: boolean) => void }) {
  return <main className={`portrait-view login-view ${intro ? "is-intro" : ""}`}>
    <Orientation portrait />
    <LoginCard error={error} setError={setError} onAccess={onAccess} />
  </main>;
}
