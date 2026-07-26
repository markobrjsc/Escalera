import type { ReactNode } from "react";

// Shared empty/loading placeholder for lists and zones (#89). Renders the exact
// ".empty-state" markup the lobby browser used inline.
export function EmptyState({ title, hint, className, role }: { title: ReactNode; hint?: ReactNode; className?: string; role?: string }) {
  return <div className={`empty-state${className ? ` ${className}` : ""}`} role={role}>
    <strong>{title}</strong>
    {hint !== undefined && <span className="muted">{hint}</span>}
  </div>;
}
