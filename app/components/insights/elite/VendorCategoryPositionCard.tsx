import PercentileBandRow from "@/app/components/charts/PercentileBandRow";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { VendorCategoryPosition } from "@/lib/eliteInsightsV2";

const MIN_CONTRIBUTORS = 5;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default function VendorCategoryPositionCard({ data }: { data: VendorCategoryPosition }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Category position not available yet."} />;
  }
  return (
    <>
      {data.categories.map((cat) => (
        <section key={cat.category} className="pat-card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="pat-label">{cat.category}</div>
            {cat.suppressed ? (
              <span className="rounded-full border border-dashed border-[var(--shell-border)] px-2.5 py-1 text-xs text-[var(--shell-muted)]">
                Field still forming · {cat.n} vendors
              </span>
            ) : (
              <span className="rounded-full bg-[rgba(6,54,116,0.06)] px-2.5 py-1 text-xs font-semibold text-[var(--shell-ink)]">
                {ordinal(cat.rankFromTop)} of {cat.n} · Q{cat.quartile}
              </span>
            )}
          </div>
          {cat.suppressed ? (
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              Your firm-reviewed strength here is {cat.score}. This category publishes a peer distribution once at least{" "}
              {MIN_CONTRIBUTORS} vendors have firm-reviewed products in it — {cat.n} so far.
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-3xl font-semibold tabular-nums text-[var(--shell-ink)]">{cat.score}</span>
                <span className="text-sm text-[var(--shell-muted)]">
                  firm-reviewed strength · {ordinal(cat.percentile)} percentile of {cat.n} vendors in this category
                </span>
              </div>
              <div className="mt-3">
                <PercentileBandRow
                  mean={cat.mean}
                  p25={cat.p25}
                  p75={cat.p75}
                  marker={cat.score}
                  percentile={cat.percentile}
                  title={`Vendor strength field in ${cat.category}`}
                />
              </div>
            </div>
          )}
        </section>
      ))}
      {data.topAction ? (
        <section className="pat-card p-6">
          <div className="pat-label">Where to push first</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
            {data.topAction.category}: <span className="font-semibold">+{data.topAction.gap} pts</span> to reach the top
            quartile (Q1) of {data.topAction.n} vendors — your biggest single lever in this category set. Directional,
            not a guarantee.
          </p>
        </section>
      ) : null}
    </>
  );
}
