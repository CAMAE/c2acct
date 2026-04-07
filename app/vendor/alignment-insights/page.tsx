import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Alignment Insights | C2Acct",
  description: "Vendor alignment insights connected to firm alignment signal.",
};

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function VendorAlignmentInsightsPage() {
  const messages = await getRequestLocaleMessages();
  const bundle = await getVendorAlignmentInsightBundle();
  const proReports = bundle.reports.filter((report) => report.tier === 1);
  const eliteReports = bundle.reports.filter((report) => report.tier === 2);

  return (
    <InsightsModeShell
      hero={
        <section className="pat-card p-8">
          <div className="pat-label">Vendor alignment insights</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {messages.insights.vendorAlignment.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.heroBody}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.firmsInSignalBase}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{bundle.sampleSize}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.currentPatModuleAverage}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {bundle.averageModuleScore === null ? "--" : `${Math.round(bundle.averageModuleScore)}%`}
              </span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.moduleVariance}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {bundle.moduleVariance === null ? "--" : bundle.moduleVariance}
              </span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.confidence}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{bundle.confidenceLabel}</span>
              <div className="mt-1 text-xs leading-5">{formatFreshness(bundle.latestUpdatedAt)}</div>
            </div>
          </div>
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {bundle.confidenceSummary}
          </div>
        </section>
      }
      proContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
              {messages.insights.vendorAlignment.proTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.proBody}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {proReports.map((report) => (
              <Link
                key={report.key}
                href={`/vendor/alignment-insights/${report.key}`}
                className="pat-card pat-card-interactive block p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{report.title}</div>
                  <InsightStatusBadge label={report.confidenceLabel} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {compactInsightSummary(report.currentStateSummary)}
                </p>
                <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                  {messages.insights.shared.sample}: {report.sampleSize} · {messages.insights.shared.freshness}:{" "}
                  {formatFreshness(report.latestUpdatedAt)}
                </div>
              </Link>
            ))}
          </div>
        </>
      }
      eliteContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
              {messages.insights.vendorAlignment.eliteTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              {messages.insights.vendorAlignment.eliteBody}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {eliteReports.map((report) => {
              const content = getVendorAlignmentInsightContent(report.key);
              return (
                <Link
                  key={report.key}
                  href={`/vendor/alignment-insights/${report.key}`}
                  title={content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                  className="pat-card pat-card-muted pat-card-muted-interactive block p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{report.title}</div>
                    <InsightStatusBadge label="Locked" tone="locked" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {compactInsightSummary(content?.lockedState?.summary ?? report.currentStateSummary)}
                  </p>
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    {content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      }
      helpContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">How Pro and Elite differ here</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              This vendor page reads live firm alignment evidence for current-state insight now, while keeping the higher-order layer visibly staged without overstating what PAT already knows.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <article className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Pro access</div>
                <InsightStatusBadge label="Pro Insights" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Pro cards use live firm module, capability, and question-cluster evidence. Those detail pages already exist and stay clickable from the catalog.
              </p>
            </article>
            <article className="pat-card pat-card-muted p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Elite access</div>
                <InsightStatusBadge label="Locked" tone="locked" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Elite cards stay visible so the vendor can see where richer benchmark, projection, and simulation layers would sit later, but they remain locked until that evidence layer is real.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">Route truth</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Both Pro and locked Elite cards already have detail routes. The locked detail view stays disclaimer-driven rather than pretending the deeper intelligence is live.
              </p>
              <div className="mt-5">
                <Link className="pat-link" href="/vendor/help">
                  Review vendor help
                </Link>
              </div>
            </article>
          </div>
        </>
      }
    />
  );
}
