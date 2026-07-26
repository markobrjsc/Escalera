import { useEffect, useId, useRef } from "react";

export function ConfirmationDialog({ title, message, busy, confirmLabel = "Bestätigen", busyLabel = "Wird ausgeführt …", onConfirm, onCancel }: { title: string; message: string; busy: boolean; confirmLabel?: string; busyLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const id = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onCancel(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [busy, onCancel]);

  return <div className="dialog-backdrop confirmation-backdrop" role="presentation">
    <section className="surface confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-message`}>{message}</p>
      <div className="confirmation-actions">
        <button ref={cancelButton} type="button" disabled={busy} onClick={onCancel}>Nein</button>
        <button type="button" disabled={busy} className="button-danger" onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</button>
      </div>
    </section>
  </div>;
}
