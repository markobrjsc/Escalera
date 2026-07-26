export function Connection({ connected }: { connected: boolean }) { return <span className={`connection ${connected ? "online" : ""}`}>{connected ? "Online" : "Verbinde"}</span>; }
