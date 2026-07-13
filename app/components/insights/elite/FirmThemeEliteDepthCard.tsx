import PercentileBand from "@/app/components/charts/PercentileBand";
import EliteCardShell, { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { FirmThemeDepth } from "@/lib/eliteInsightsV2";

/**
 * Block 12b — the firm tier-1 hybrid Elite depth pane. For an entitled firm, the
 * Elite toggle on a tier-1 insight opens the theme's REAL peer-benchmark position
 * (percentile band per contributing module) + one ranked action, mirroring the
 * vendor tier-1 depth pattern. Replaces the locked-boundary boilerplate that used
 * to render even to paying Elite accounts.
 */
export default function FirmThemeEliteDepthCard({
  data,
  themeTitle,
}: {
  data: FirmThemeDepth;
  themeTitle: string;
}) {
  return (
    <EliteCardShell
      eyebrow="Firm Elite · Peer Position on this theme"
      title={`${themeTitle} — where you sit vs peers`}
      summary="Your firm-reviewed position on this theme's modules against the peer distribution — a percentile band per module, with the single biggest lever to the peer top quartile. Cuts below the minimum-n safe harbor are withheld."
    >
      {data.available ? (
        <>
          <section className="pat-card p-6">
            <div className="pat-label">Where you sit on this theme</div>
            <div className="mt-4">
              <PercentileBand rows={data.rows} title="Per-module percentile position vs peer firms, this theme" />
            </div>
          </section>
          <section className="pat-card p-6">
            <div className="pat-label">Your biggest lever on this theme</div>
            {data.rankedAction ? (
              <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
                Close <span className="font-semibold">{data.rankedAction.moduleLabel}</span>&rsquo;s{" "}
                <span className="font-semibold">{data.rankedAction.deficit}-pt</span> gap to the peer top quartile
                first — it is the largest single move available on this theme. A directional estimate from stored
                peer evidence, not a guarantee.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
                Every module on this theme already sits at or above the peer top quartile — hold the lead and defend
                it in your next review cycle.
              </p>
            )}
          </section>
        </>
      ) : (
        <EliteEmptyState message={data.emptyReason ?? "This theme's Elite position is not available yet."} />
      )}
    </EliteCardShell>
  );
}
