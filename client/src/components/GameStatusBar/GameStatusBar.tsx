import { useEffect, useState } from "react";
import { SignalIcon } from "./SignalIcon/SignalIcon.js";

export function GameStatusBar({ connected }: { connected: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return <div className="game-status-bar" aria-label={`Verbindung ${connected ? "sehr gut" : "unterbrochen"}, ${time}`}><SignalIcon online={connected} /><b>|</b><time>{time}</time></div>;
}
