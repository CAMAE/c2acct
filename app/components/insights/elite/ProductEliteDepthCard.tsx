import PercentileBandRow from "@/app/components/charts/PercentileBandRow";
import TrajectoryChart from "@/app/components/charts/TrajectoryChart";
import type { ProductCohortPosition, ProductTrajectory } from "@/lib/eliteInsightsV2";
import { ordinal } from "@/lib/ordinal";

/**
 * Hybrid Elite depth (live for entitled Elite vendors): where a product sits in
 * its category's cohort of peer vendor products — an F1-style percentile band
 * (same visual language as V1 Category Position) + a ranked action, plus an
 * HONEST trend state (product trajectory has no time-series backing yet, so it
 * is stated as pending, never faked).
 */
export default function ProductEliteDepthCard({
  cohort,
  trajectory,
  productName,
  weakestArea,
}: {
  cohort: ProductCohortPosition;
  trajectory: ProductTrajectory | null;
  productName: string;
  weakestArea?: string | null;
}) {
  return (
    <div className="space-y-5">
      {/* COHORT POSITION */}
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="pat-label">Cohort position · {cohort.category}</div>
          {cohort.available && !cohort.suppressed ? (
            <span className="rounded-full bg-[rgba(6,54,116,0.06)] px-2.5 py-1 text-xs font-semibold text-[var(--shell-ink)]">
              {ordinal(cohort.rankFromTop)} of {cohort.n} · Q{cohort.quartile}
            </span>
          ) : null}
        </div>
        {!cohort.available ? (
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{cohort.emptyReason}</p>
        ) : cohort.suppressed ? (
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {productName} scores {cohort.score} in {cohort.category}, but this category needs more
            reviewed peer products before PAT publishes a distribution ({cohort.n} so far).
          </p>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-3xl font-semibold tabular-nums text-[var(--shell-ink)]">{cohort.score}</span>
              <span className="text-sm text-[var(--shell-muted)]">
                firm-reviewed strength · {ordinal(cohort.percentile)} percentile of {cohort.n} products in this category
              </span>
            </div>
            <div className="mt-3">
              <PercentileBandRow
                mean={cohort.mean}
                p25={cohort.p25}
                p75={cohort.p75}
                marker={cohort.score}
                percentile={cohort.percentile}
                title={`Firm-reviewed product strength field in ${cohort.category}`}
              />
            </div>
          </div>
        )}
      </section>

      {/* RANKED ACTION */}
      {cohort.available && !cohort.suppressed ? (
        <section className="pat-card p-6">
          <div className="pat-label">Ranked action</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
            {cohort.gapToTopQuartile !== null ? (
              <>
                <span className="font-semibold">+{cohort.gapToTopQuartile} pts</span> of firm-reviewed
                strength moves {productName} into the top quartile (Q1) of {cohort.n} products in{" "}
                {cohort.category}
                {weakestArea ? (
                  <>
                    {" "}— your thinnest area today is <span className="font-semibold">{weakestArea}</span>.
                  </>
                ) : (
                  "."
                )}{" "}
                Directional, not a guarantee.
              </>
            ) : (
              <>
                {productName} already sits in the top quartile of {cohort.category}. Hold the lead —
                watch the peer field, which moves as firms review more products.
              </>
            )}
          </p>
        </section>
      ) : null}

      {/* TREND — a real line once >=2 snapshots exist; honest pending until then */}
      {trajectory?.available ? (
        <section className="pat-card p-6">
          <div className="pat-label">Trend</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-semibold tabular-nums text-[var(--shell-ink)]">
              {trajectory.history[trajectory.history.length - 1]!.score}
            </span>
            <span className="text-sm text-[var(--shell-muted)]">
              firm-reviewed strength over the last {trajectory.history.length} snapshots
            </span>
          </div>
          <div className="mt-3">
            <TrajectoryChart
              history={trajectory.history}
              projection={trajectory.projection}
              title={`${productName} firm-reviewed strength over time`}
            />
          </div>
        </section>
      ) : (
        <section className="pat-card pat-card-muted p-6">
          <div className="pat-label">Trend</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {trajectory?.emptyReason ??
              "A product trajectory needs repeat firm reviews over time. PAT holds this back until there is real time-series evidence rather than showing a fabricated line — it opens as review history builds for this product."}
          </p>
        </section>
      )}
    </div>
  );
}
