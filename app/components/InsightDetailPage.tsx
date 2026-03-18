import Link from "next/link";
import InsightAdvancedChart from "@/components/charts/InsightAdvancedChart";
import InsightTrendChart from "@/components/charts/InsightTrendChart";
import type { InsightTrendSeriesSet } from "@/lib/intelligence/chartSeries";
import type { IntelligenceCardViewModel } from "@/lib/intelligence/getProductIntelligencePageData";
import { summarizeOutputGateRule } from "@/lib/intelligence/outputGates";
import type { OutputCardRegistryEntry } from "@/lib/intelligence/outputRegistry";

type InsightDetailPageProps = {
  roleLabel: string;
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  card: OutputCardRegistryEntry;
  runtimeCard?: IntelligenceCardViewModel | null;
  chartSeries: InsightTrendSeriesSet;
};

export default function InsightDetailPage(props: InsightDetailPageProps) {
  const { roleLabel, backHref, backLabel, title, subtitle, card, runtimeCard, chartSeries } = props;

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">{roleLabel}</div>
        <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm text-white/70">{subtitle}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
          <Link href={backHref} className="font-medium underline underline-offset-4">
            {backLabel}
          </Link>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em]">
            Tier {card.tier}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em]">
            {runtimeCard?.unlocked ? "Unlocked" : "Locked"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">What it is</div>
          <div className="mt-3 text-sm leading-6 text-white/80">{card.detail.whatItIs}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">How it is calculated</div>
          <div className="mt-3 text-sm leading-6 text-white/80">{card.detail.calculation}</div>
          <div className="mt-4 text-xs uppercase tracking-[0.16em] text-white/45">{summarizeOutputGateRule(card.gate)}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Why it matters</div>
          <div className="mt-3 text-sm leading-6 text-white/80">{card.detail.whyItMatters}</div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">Action to take</div>
          <div className="mt-3 text-sm leading-6 text-white/80">{card.detail.actionToTake}</div>
        </div>
      </div>

      {runtimeCard ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Runtime status</div>
            <div className="mt-3 text-xl font-semibold text-white">
              {runtimeCard.unlocked ? "Visible with current evidence" : "Not yet unlocked"}
            </div>
            <div className="mt-2 text-sm text-white/75">{runtimeCard.evidenceSummary}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Unlock evidence</div>
            {runtimeCard.unlockEvidence.length === 0 ? (
              <div className="mt-3 text-sm text-white/75">No unlock evidence has been recorded for this card yet.</div>
            ) : (
              <div className="mt-3 grid gap-2 text-sm text-white/75">
                {runtimeCard.unlockEvidence.map((entry) => (
                  <div key={`${entry.source}:${entry.label}`} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="font-semibold text-white">{entry.label}</div>
                    <div className="mt-1">{entry.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <InsightTrendChart title="Tier 1 score trend" series={chartSeries.monthly} />
        <InsightAdvancedChart title="Signal divergence and integrity" series={chartSeries.monthly} />
        <InsightTrendChart title="Tier 1 score trend" series={chartSeries.quarterly} />
        <InsightAdvancedChart title="Signal divergence and integrity" series={chartSeries.quarterly} />
        <InsightTrendChart title="Tier 1 score trend" series={chartSeries.yearly} />
        <InsightAdvancedChart title="Signal divergence and integrity" series={chartSeries.yearly} />
      </div>
    </section>
  );
}
