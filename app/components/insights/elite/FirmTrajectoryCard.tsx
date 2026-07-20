import TrajectoryChart from "@/app/components/charts/TrajectoryChart";
import TrendChip, { type TrendDirection } from "@/app/components/charts/TrendChip";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import FreshnessNote from "@/app/components/insights/elite/FreshnessNote";
import type { FirmTrajectory } from "@/lib/eliteInsightsV2";
import type { FreshnessReading } from "@/lib/freshness";
import { ordinal } from "@/lib/ordinal";

function trendDir(t: string): TrendDirection {
  if (/UP|ACCEL|RISING|IMPROV/i.test(t)) return "up";
  if (/DOWN|DECEL|FALLING|DECLIN/i.test(t)) return "down";
  return "flat";
}

/**
 * Block 12d — Trajectory rebuilt to be Elite-grade: the chart is framed by a hero
 * delta, momentum chips, and — new — a PROVENANCE panel that says exactly what the
 * projection is built from (module-submission snapshots over time, NOT sandbox
 * swaps), over what window, and how the directional band is derived. Ends with a
 * ranked action. The projection stays labelled directional, never forecast-as-fact.
 */
export default function FirmTrajectoryCard({
  data,
  rankedAction,
  freshness,
}: {
  data: FirmTrajectory;
  rankedAction?: { moduleLabel: string; deficit: number } | null;
  freshness?: FreshnessReading | null;
}) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Trajectory not available yet."} />;
  }
  const first = data.history[0]?.score ?? 0;
  const last = data.history[data.history.length - 1]?.score ?? 0;
  const netDelta = last - first;

  return (
    <>
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span
            className={`text-3xl font-semibold tabular-nums ${netDelta >= 0 ? "text-[var(--shell-positive)]" : "text-[var(--brand-orange)]"}`}
          >
            {netDelta >= 0 ? "+" : ""}
            {netDelta}
          </span>
          <span className="text-sm text-[var(--shell-muted)]">
            points across your last {data.history.length} module-submission snapshots (now {last}).
          </span>
        </div>
        <div className="mt-4">
          <TrajectoryChart history={data.history} projection={data.projection} title="Your alignment index over time" />
        </div>
        {data.momentum ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <TrendChip
              label="trend"
              direction={trendDir(data.momentum.trend)}
              tone={trendDir(data.momentum.trend) === "up" ? "positive" : trendDir(data.momentum.trend) === "down" ? "negative" : "neutral"}
              value={data.momentum.trend.toLowerCase()}
            />
            <TrendChip
              label="velocity"
              direction={/ACCEL/i.test(data.momentum.velocity) ? "up" : /DECEL/i.test(data.momentum.velocity) ? "down" : "flat"}
              tone={/ACCEL/i.test(data.momentum.velocity) ? "positive" : "neutral"}
              value={data.momentum.velocity.toLowerCase()}
            />
            <TrendChip
              label="volatility"
              direction="flat"
              tone={data.momentum.volatility > 2 ? "negative" : "neutral"}
              value={data.momentum.volatility.toFixed(1)}
            />
          </div>
        ) : null}
      </section>

      {/* Block 12d: provenance — what the trend and projection are built from. */}
      {data.provenance ? (
        <section className="pat-card p-6">
          <div className="pat-label">How this projection is built</div>
          <dl className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-ink)]">
            <div>
              <dt className="inline font-semibold">Evidence: </dt>
              <dd className="inline text-[var(--shell-muted)]">
                your alignment index recomputed each time you submit a module — {data.provenance.snapshotCount}{" "}
                submission snapshots from {data.provenance.firstLabel} to {data.provenance.lastLabel}. This is your PAT
                assessment history over time, not Alignment Sandbox swap activity.
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Projection: </dt>
              <dd className="inline text-[var(--shell-muted)]">
                extends your recent average movement of{" "}
                <span className="font-medium text-[var(--shell-ink)]">
                  {data.provenance.avgDelta >= 0 ? "+" : ""}
                  {data.provenance.avgDelta}
                </span>{" "}
                points per snapshot one step forward; the shaded band is ±{data.provenance.volatility} (your recent
                volatility). It is a directional estimate, not a forecast.
              </dd>
            </div>
          </dl>
          <FreshnessNote freshness={freshness} />
        </section>
      ) : null}

      {data.swapMovement ? (
        <section className="pat-card p-6">
          <div className="pat-label">Best available move (Sandbox)</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
            Your best available swap in the Alignment Sandbox moves you from the{" "}
            <span className="font-semibold">{ordinal(data.swapMovement.fromPercentile)} percentile</span> to the{" "}
            <span className="font-semibold text-[var(--shell-positive)]">
              {ordinal(data.swapMovement.toPercentile)} percentile
            </span>{" "}
            among peer firms — a directional projection, not a guaranteed outcome.
          </p>
        </section>
      ) : null}

      {rankedAction ? (
        <section className="pat-card p-6">
          <div className="pat-label">Your next move</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
            To bend the trajectory up fastest, close{" "}
            <span className="font-semibold">{rankedAction.moduleLabel}</span>&rsquo;s{" "}
            <span className="font-semibold">{rankedAction.deficit}-pt</span> gap to the peer top quartile — it is the
            biggest single lever on your alignment index right now.
          </p>
        </section>
      ) : null}
    </>
  );
}
