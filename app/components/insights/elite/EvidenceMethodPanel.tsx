/**
 * 15c — the "How this is built" evidence panel on every Elite detail surface. Same
 * provenance discipline as Pro: cohort composition, n, window, and a plain
 * computation note, so an Elite reading never reads as an unexplained number.
 * Native <details> so it needs no client state (works in server components).
 */
export default function EvidenceMethodPanel({
  rows,
  note,
}: {
  rows: Array<{ label: string; value: string }>;
  note?: string;
}) {
  const shown = rows.filter((r) => r.value != null && r.value !== "");
  if (shown.length === 0 && !note) return null;
  return (
    <details className="mt-4 rounded-[14px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
      <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--shell-muted)]">
        How this is built
      </summary>
      {shown.length > 0 ? (
        <dl className="mt-3 grid gap-2 text-sm">
          {shown.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[var(--shell-muted)]">{r.label}</dt>
              <dd className="text-right font-medium text-[var(--shell-ink)]">{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {note ? <p className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">{note}</p> : null}
    </details>
  );
}
