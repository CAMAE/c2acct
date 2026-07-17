import type { EvidenceFreshness } from "@/lib/eliteInsightsV2";

/**
 * 15d — display-only evidence-age line. Shows how recent the underlying assessment
 * is ("newest snapshot N days ago") so an Elite reader can weigh the number's
 * currency. No decay math — the figures are unchanged; this only labels their age.
 */
export default function FreshnessNote({ freshness }: { freshness?: EvidenceFreshness | null }) {
  if (!freshness) return null;
  const stale = freshness.ageDays >= 90;
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--shell-muted)]">
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-[var(--brand-orange)]" : "bg-[var(--shell-positive)]"}`}
      />
      Evidence age: {freshness.label} ({freshness.newestLabel})
    </p>
  );
}
