import Link from "next/link";
import InsightAdvancedChart from "@/components/charts/InsightAdvancedChart";
import InsightTrendChart from "@/components/charts/InsightTrendChart";
import type { ProductIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";
import { getOutputCardRouteKey } from "@/lib/intelligence/outputRegistry";
import { summarizeOutputGateRule } from "@/lib/intelligence/outputGates";

type ProductIntelligenceViewProps = {
  data: ProductIntelligencePageData;
  selectedSectionId?: string | null;
};

type ProductCatalogEntry = ProductIntelligencePageData["catalog"][number];
type ProductIntelligenceSection = ProductIntelligencePageData["outputSections"][number];
type ProductIntelligenceCard = ProductIntelligenceSection["cards"][number];

export default function ProductIntelligenceView(props: ProductIntelligenceViewProps) {
  const { data, selectedSectionId } = props;
  const sections: ProductIntelligencePageData["outputSections"] =
    selectedSectionId && data.sectionById.has(selectedSectionId)
      ? [data.sectionById.get(selectedSectionId)!]
      : data.outputSections;
  const catalogCount = data.catalog.length;
  const observedSummary = data.signalSummary.observed;
  const observedAnnotation = data.externalObservedAnnotation;
  const currentScore =
    typeof data.result.score === "number" ? Math.round(data.result.score * data.result.signalIntegrityScore) : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Product Intelligence
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{data.product.name}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Canonical route-based intelligence for the selected product. The older `/outputs` page remains available as a bridge while this surface lands.
              </p>
            </div>
            <div className="grid min-w-[220px] gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-900">Current score</div>
                <div className="mt-1">{currentScore === null ? "--" : `${currentScore}%`}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Unlocked</div>
                <div className="mt-1">{data.unlockedOutputCount} cards</div>
              </div>
              <div>
                <Link href={`/outputs?productId=${encodeURIComponent(data.product.id)}`} className="font-medium text-slate-700 underline underline-offset-4">
                  Open bridge view
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <Link href="/products" className="font-medium text-slate-700 underline underline-offset-4">
              All products
            </Link>
            {catalogCount <= 8 ? (
              <div className="flex flex-wrap gap-2">
                {data.catalog.map((product: ProductCatalogEntry) => (
                  <Link
                    key={product.id}
                    href={`/products/${encodeURIComponent(product.id)}/intelligence`}
                    className={`rounded-full border px-3 py-1 ${
                      product.id === data.product.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {product.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-slate-500">Catalog size: {catalogCount} products. Use the product catalog page to switch context.</div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sections</div>
            <div className="mt-4 grid gap-2">
              {data.outputSections.map((section) => (
                <Link
                  key={section.id}
                  href={`/products/${encodeURIComponent(data.product.id)}/intelligence/${encodeURIComponent(section.id)}`}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    section.id === selectedSectionId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {section.title}
                </Link>
              ))}
              <Link
                href={`/products/${encodeURIComponent(data.product.id)}/intelligence`}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  !selectedSectionId
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                All sections
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Dimension average</div>
              <div className="mt-1">{data.productDimensionAverage === null ? "--" : data.productDimensionAverage}</div>
            </div>
          </aside>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Vendor self signal</div>
                <div className="mt-3 text-3xl font-semibold text-slate-950">
                  {currentScore === null ? "--" : `${currentScore}%`}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Badges earned: {data.signalSummary.self.badgeCount}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Weighted average: {data.signalSummary.self.weightedAvg === null ? "--" : data.signalSummary.self.weightedAvg.toFixed(2)}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sponsor-firm observed signal</div>
                <div className="mt-3 text-3xl font-semibold text-slate-950">
                  {observedSummary?.scoreAvg === null || !observedSummary ? "--" : observedSummary.scoreAvg.toFixed(1)}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Review count: {observedSummary?.reviewCount ?? 0}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Integrity average: {observedSummary?.signalIntegrityAvg === null || !observedSummary ? "--" : observedSummary.signalIntegrityAvg.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Dimensions</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.dimensionEntries.map((entry) => (
                  <div key={entry.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {entry.value === null ? "--" : `${entry.value}/100`}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {observedAnnotation?.eligible && observedAnnotation.annotation ? (
              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm text-sm text-slate-700">
                <div className="font-semibold text-slate-900">Observed market signal</div>
                <div className="mt-2">Review count: {observedAnnotation.annotation.reviewCount}</div>
                <div className="mt-1">
                  Score average: {observedAnnotation.annotation.scoreAvg === null ? "--" : observedAnnotation.annotation.scoreAvg.toFixed(2)}
                </div>
              </div>
            ) : null}

            <section className="grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trend contract</div>
                <div className="mt-2 text-sm text-slate-700">
                  Monthly, quarterly, and yearly chart views are derived only from persisted self submissions and trusted observed reviews for this product. No synthetic history is introduced.
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <InsightTrendChart title="Tier 1 score trend" series={data.chartSeries.monthly} />
                <InsightAdvancedChart title="Signal divergence and integrity" series={data.chartSeries.monthly} />
                <InsightTrendChart title="Tier 1 score trend" series={data.chartSeries.quarterly} />
                <InsightAdvancedChart title="Signal divergence and integrity" series={data.chartSeries.quarterly} />
                <InsightTrendChart title="Tier 1 score trend" series={data.chartSeries.yearly} />
                <InsightAdvancedChart title="Signal divergence and integrity" series={data.chartSeries.yearly} />
              </div>
            </section>

            {sections.map((section: ProductIntelligenceSection) => (
              <section key={section.id} className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-slate-900">{section.title}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {section.cards.filter((card: ProductIntelligenceCard) => card.unlocked).length}/{section.cards.length} unlocked
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {section.cards.map((card: ProductIntelligenceCard) => (
                    <div
                      key={card.id}
                      className={`rounded-2xl border p-5 ${
                        card.unlocked
                          ? "border-slate-200 bg-white shadow-sm"
                          : "border-slate-200 bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg font-semibold text-slate-900">
                          {card.unlocked && card.unlockedInsightTitle ? card.unlockedInsightTitle : card.title}
                        </div>
                        <div
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide ${
                            card.unlocked
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-slate-300 bg-white text-slate-600"
                          }`}
                        >
                          {card.unlocked ? "UNLOCKED" : "LOCKED"}
                        </div>
                      </div>
                      <div className="mt-2 whitespace-pre-line text-sm text-slate-700">
                        {card.unlocked && card.unlockedInsightBody ? card.unlockedInsightBody : card.desc}
                      </div>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        {summarizeOutputGateRule(card.gate)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.evidenceSources.map((source) => (
                          <span
                            key={`${card.id}:${source}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600"
                          >
                            {source === "SELF_SIGNAL" ? "Self signal" : "Observed signal"}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{card.evidenceSummary}</div>
                      <div className="mt-3">
                        <Link
                          href={`/vendor/insights/${encodeURIComponent(getOutputCardRouteKey(card))}?productId=${encodeURIComponent(data.product.id)}`}
                          className="text-sm font-medium text-slate-700 underline underline-offset-4"
                        >
                          Open detail page
                        </Link>
                      </div>
                      {card.unlockEvidence.length > 0 ? (
                        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                          {card.unlockEvidence.map((entry) => (
                            <div key={`${card.id}:${entry.source}`}>
                              {entry.label}: {entry.detail}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {typeof card.dimensionScore === "number" ? (
                        <div className="mt-3 rounded-md border border-black/10 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          Dimension score: {card.dimensionScore}/100
                        </div>
                      ) : null}
                      {card.observedSignal ? (
                        <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                          Observed signal: {card.observedSignal.wouldQualify ? "qualified" : "not yet"}
                          <div>Review count: {card.observedSignal.reviewCount}</div>
                          <div>Score average: {card.observedSignal.scoreAvg === null ? "--" : card.observedSignal.scoreAvg.toFixed(2)}</div>
                          <div>Threshold: {card.observedSignal.thresholdUsed ?? "--"}</div>
                          <div>Reason: {card.observedSignal.reason}</div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
