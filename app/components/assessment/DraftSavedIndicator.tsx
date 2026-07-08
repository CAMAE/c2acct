"use client";

/**
 * Draft-saved indicator (Redlines R9). Persistence is invisible to a human —
 * "nothing changes on reload" reads as nothing happening. This subtle line makes
 * autosave visible ("Draft saved · HH:MM") and doubles as real-user reassurance.
 * Shared across the firm alignment and vendor product assessment clients.
 */

export type DraftSaveState = "idle" | "saving" | "saved" | "error";

export default function DraftSavedIndicator({
  state,
  savedAt,
}: {
  state: DraftSaveState;
  savedAt: Date | null;
}) {
  if (state === "idle" && !savedAt) {
    return null;
  }

  const time = savedAt
    ? savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const label =
    state === "saving"
      ? "Saving draft…"
      : state === "error"
        ? "Draft not saved — will retry"
        : time
          ? `Draft saved · ${time}`
          : "Draft saved";

  const dotClass =
    state === "error"
      ? "bg-[var(--brand-orange)]"
      : state === "saving"
        ? "bg-[var(--shell-muted)] animate-pulse"
        : "bg-[var(--shell-positive)]";

  return (
    <span
      data-testid="draft-saved-indicator"
      className="inline-flex items-center gap-1.5 text-xs text-[var(--shell-muted)]"
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
