import TrajectoryChart from "@/app/components/charts/TrajectoryChart";
import TrendChip, { type TrendDirection } from "@/app/components/charts/TrendChip";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { FirmTrajectory } from "@/lib/eliteInsightsV2";

function trendDir(t: string): TrendDirection {
  if (/UP|ACCEL|RISING|IMPROV/i.test(t)) return "up";
  if (/DOWN|DECEL|FALLING|DECLIN/i.test(t)) return "down";
  return "flat";
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default function FirmTrajectoryCard({ data }: { data: FirmTrajectory }) {
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
          <span className="text-3xl font-semibold tabular-nums text-[var(--shell-ink)]">
            {netDelta >= 0 ? "+" : ""}
            {netDelta}
          </span>
          <span className="text-sm text-[var(--shell-muted)]">
            points over the last {data.history.length} snapshots (now {last}).
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
    </>
  );
}
