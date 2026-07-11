/**
 * Trend chip (Elite Insights v2, F3 momentum + V2 signals). A compact directional
 * badge: arrow + label + optional value, colored by direction. Up isn't always
 * "good" (e.g. volatility up is bad) so `tone` is decided by the caller.
 */

export type TrendDirection = "up" | "down" | "flat";
export type TrendTone = "positive" | "negative" | "neutral";

const ARROW: Record<TrendDirection, string> = { up: "▲", down: "▼", flat: "▬" };
const TONE_CLASS: Record<TrendTone, string> = {
  positive: "border-[rgba(22,163,74,0.3)] bg-[rgba(22,163,74,0.08)] text-[var(--shell-positive)]",
  negative: "border-[rgba(229,109,4,0.3)] bg-[rgba(229,109,4,0.08)] text-[var(--brand-orange)]",
  neutral: "border-[var(--shell-border)] bg-[rgba(6,54,116,0.04)] text-[var(--shell-muted)]",
};

export default function TrendChip({
  label,
  direction,
  tone,
  value,
}: {
  label: string;
  direction: TrendDirection;
  tone: TrendTone;
  value?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      <span aria-hidden="true">{ARROW[direction]}</span>
      <span>{label}</span>
      {value ? <span className="tabular-nums">{value}</span> : null}
    </span>
  );
}
