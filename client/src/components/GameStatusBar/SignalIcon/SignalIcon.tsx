export function SignalIcon({ online }: { online: boolean }) {
  return <svg className={`signal-icon ${online ? "online" : ""}`} viewBox="0 0 16 13" aria-hidden="true" focusable="false"><path d="M1 4.2a10.5 10.5 0 0 1 14 0" /><path d="M3.6 7.2a6.8 6.8 0 0 1 8.8 0" /><path d="M6.2 10.1a3 3 0 0 1 3.6 0" /></svg>;
}
