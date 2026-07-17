import {
  FRESHNESS_STATE_LABEL,
  FRESHNESS_STATE_TONE,
  FRESHNESS_STATE_WINDOW_LABEL,
  readFreshness,
  type FreshnessReading,
} from "@/lib/freshness";

/**
 * 16a — the one freshness chip. Renders a state (Fresh / Aging / Stale) beside a
 * score, optionally with the evidence age. Pure presentation over a
 * FreshnessReading from the canonical reader; it never computes a state itself,
 * so every surface shows the same verdict for the same age.
 */
export default function FreshnessChip({
  reading,
  from,
  now,
  showAge = true,
}: {
  /** A precomputed reading, or… */
  reading?: FreshnessReading | null;
  /** …a raw newest-evidence date the chip reads itself. */
  from?: Date | string | number | null;
  now?: Date;
  showAge?: boolean;
}) {
  const value = reading ?? readFreshness(from ?? null, now);
  if (!value) return null;
  const tone = FRESHNESS_STATE_TONE[value.state];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ borderColor: tone, color: tone }}
      title={`${FRESHNESS_STATE_LABEL[value.state]} — newest evidence ${FRESHNESS_STATE_WINDOW_LABEL[value.state]} old (${value.asOfLabel})`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {FRESHNESS_STATE_LABEL[value.state]}
      {showAge ? <span className="text-[var(--shell-muted)]">· {value.ageLabel}</span> : null}
    </span>
  );
}
