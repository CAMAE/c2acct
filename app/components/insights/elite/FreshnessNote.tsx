import FreshnessChip from "@/app/components/freshness/FreshnessChip";
import type { FreshnessReading } from "@/lib/freshness";

/**
 * 15d/16a — display-only evidence-age line. Renders the canonical FreshnessChip
 * (Fresh / Aging / Stale) plus the newest-evidence date so an Elite reader can
 * weigh the number's currency. No decay math — the figures are unchanged; this
 * only labels their age, using the one shared reader.
 */
export default function FreshnessNote({ freshness }: { freshness?: FreshnessReading | null }) {
  if (!freshness) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--shell-muted)]">
      <FreshnessChip reading={freshness} />
      <span>newest evidence {freshness.asOfLabel}</span>
    </div>
  );
}
