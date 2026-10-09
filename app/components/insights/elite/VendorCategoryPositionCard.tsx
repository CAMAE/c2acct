import PercentileBandRow from "@/app/components/charts/PercentileBandRow";
import { quartileWord } from "@/lib/lexicon";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import EvidenceMethodPanel from "@/app/components/insights/elite/EvidenceMethodPanel";
import type { VendorCategoryPosition } from "@/lib/eliteInsightsV2";
import { ordinal } from "@/lib/ordinal";
import { MIN_CONTRIBUTORS, MAX_CONTRIBUTOR_SHARE } from "@/lib/benchmarkSuppression";
import { storedCutoffPhrase } from "@/lib/assessmentCore";

export default function VendorCategoryPositionCard({
  data,
  chartDesign = "classic",
}: {
  data: VendorCategoryPosition;
  /** R40 (box 2d): flag-on callers pass "labelled". */
  chartDesign?: "classic" | "labelled";
}) {
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
                {ordinal(cat.rankFromTop)} of {cat.n} · {quartileWord(cat.quartile as 1 | 2 | 3 | 4)}
              </span>
            )}
          </div>
          {cat.suppressed ? (
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {cat.suppressionReason === "contributor_dominance"
                ? `Your firm-reviewed strength here is ${cat.score}. This category publishes a peer distribution once no single vendor supplies more than ${Math.round(MAX_CONTRIBUTOR_SHARE * 100)} percent of its firm-reviewed products — one vendor does today.`
                : `Your firm-reviewed strength here is ${cat.score}. This category publishes a peer distribution once at least ${MIN_CONTRIBUTORS} vendors have firm-reviewed products in it — ${cat.n} so far.`}
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
                  design={chartDesign}
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
            quartile of {data.topAction.n} vendors — your biggest single lever in this category set. An estimate,
            not a guarantee.
          </p>
        </section>
      ) : null}
      <EvidenceMethodPanel
        rows={[
          { label: "Cohort", value: "Vendors with firm-reviewed products in each category" },
          { label: "Basis", value: "Your firm-reviewed strength vs. the category peer distribution" },
          { label: "Cutoff", value: storedCutoffPhrase(data.cutoffLabel) },
          {
            label: "Evidence floor",
            value: `At least ${MIN_CONTRIBUTORS} vendors with firm-reviewed products, none above ${Math.round(MAX_CONTRIBUTOR_SHARE * 100)} percent of them`,
          },
        ]}
        note="Each category's percentile places your firm-reviewed strength against the vendors competing in that category. A category publishes a distribution only once it clears the evidence floor (five contributing firms, no firm above 25 percent, structured consistent with the former 1996 DOJ/FTC safety zone, withdrawn in 2023) — thin fields are labelled 'still forming,' never estimated."
      />
    </>
  );
}
