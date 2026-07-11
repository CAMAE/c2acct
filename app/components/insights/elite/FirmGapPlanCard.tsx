import RankedBars from "@/app/components/charts/RankedBars";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { FirmGapPlan } from "@/lib/eliteInsightsV2";

export default function FirmGapPlanCard({ data }: { data: FirmGapPlan }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "No gap plan available yet."} />;
  }
  if (data.gaps.length === 0) {
    return (
      <>
        <section className="pat-card p-6">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-semibold tabular-nums text-[var(--shell-positive)]">
              {data.clearedCount}/{data.totalCount}
            </span>
            <span className="text-sm text-[var(--shell-muted)]">{data.emptyReason}</span>
          </div>
          {data.watchList.length ? (
            <div className="mt-4">
              <RankedBars
                title="Capabilities closest to the threshold — watch these"
                items={data.watchList.map((g) => ({
                  key: g.key,
                  label: g.title,
                  value: g.score,
                  meta: `+${-g.gap} pts over ${g.threshold}%`,
                }))}
                threshold={60}
                thresholdLabel="60% bar"
                colorByBand
              />
            </div>
          ) : null}
        </section>
        {data.watchList.length ? (
          <section className="pat-card p-6">
            <div className="pat-label">Keep these from slipping</div>
            <ol className="mt-3 space-y-3">
              {data.watchList.slice(0, 3).map((g, i) => (
                <li key={g.key} className="rounded-[14px] border border-[var(--shell-border)] bg-white/70 p-4">
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">
                    {i + 1}. {g.title}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--shell-muted)]">{g.narrative}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <>
      <section className="pat-card p-6">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-3xl font-semibold tabular-nums text-[var(--shell-ink)]">{data.gaps.length}</span>
          <span className="text-sm text-[var(--shell-muted)]">
            capabilit{data.gaps.length === 1 ? "y" : "ies"} below the top-quartile bar · {data.clearedCount} of{" "}
            {data.totalCount} already cleared. Fix in this order — largest point deficit first.
          </span>
        </div>
        <div className="mt-4">
          <RankedBars
            title="Capabilities below their threshold, ranked by point deficit"
            items={data.gaps.map((g) => ({
              key: g.key,
              label: g.title,
              value: g.score,
              meta: `${g.gap} pts under ${g.threshold}%`,
            }))}
            threshold={60}
            thresholdLabel="60% bar"
            colorByBand
          />
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Fix this first</div>
        <ol className="mt-3 space-y-3">
          {data.gaps.slice(0, 5).map((g, i) => (
            <li key={g.key} className="rounded-[14px] border border-[var(--shell-border)] bg-white/70 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--shell-ink)]">
                  {i + 1}. {g.title}
                </span>
                <span className="rounded-full bg-[rgba(229,109,4,0.1)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-orange)]">
                  −{g.gap} pts
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[var(--shell-muted)]">{g.narrative}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
