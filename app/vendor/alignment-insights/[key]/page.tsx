import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function VendorAlignmentInsightDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { key } = await params;
  const messages = await getRequestLocaleMessages();
  const bundle = await getVendorAlignmentInsightBundle();
  const report = bundle.reports.find((entry) => entry.key === key);
  const content = getVendorAlignmentInsightContent(key);

  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section
        className={`p-8 ${
          report.locked
            ? "rounded-[28px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)]"
            : "pat-card"
        }`}
      >
        <div className="pat-label">Vendor alignment insight</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {report.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {report.locked ? (content?.lockedState?.summary ?? report.currentStateSummary) : report.currentStateSummary}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.sample}: <span className="font-semibold text-[var(--shell-ink)]">{report.sampleSize}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.confidence}: <span className="font-semibold text-[var(--shell-ink)]">{report.confidenceLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.freshness}: <span className="font-semibold text-[var(--shell-ink)]">{formatFreshness(report.latestUpdatedAt)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {report.confidenceSummary}
        </div>
        {report.locked ? (
          <div
            className="mt-5 rounded-[18px] border border-[rgba(79,191,226,0.32)] bg-[rgba(255,255,255,0.45)] p-4 text-sm leading-6 text-[var(--shell-muted)]"
            title={content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
          >
            {content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/vendor/alignment-insights">
            {messages.insights.vendorAlignment.backToAlignmentInsights}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whatItIs}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {report.locked ? (content?.lockedState?.what ?? report.what) : report.what}
          </p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whyItMatters}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {report.locked ? (content?.lockedState?.why ?? report.why) : report.why}
          </p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.howToUseIt}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {report.locked ? (content?.lockedState?.how ?? report.how) : report.how}
          </p>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.shared.exactAssessmentBasis}</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          <p>{report.locked ? (content?.lockedState?.basis ?? report.exactAssessmentBasis) : report.exactAssessmentBasis}</p>
          <p>
            {messages.insights.shared.sample}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{report.sampleSize}</span>.
            Final module submissions in basis set:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{report.submissionCount}</span>.
            Current cross-module variance:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {report.moduleVariance === null ? "--" : report.moduleVariance}
            </span>
            .
          </p>
          <p>
            {messages.insights.shared.freshness}: <span className="font-semibold text-[var(--shell-ink)]">{formatFreshness(report.latestUpdatedAt)}</span>. {messages.insights.shared.confidence}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{report.confidenceLabel}</span>.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.moduleEvidence}</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
            <p>
              Strongest contributing modules:{" "}
              {report.strongestModules.length > 0
                ? report.strongestModules
                    .map((module) => `${module.title} (${formatScore(module.averageScore)})`)
                    .join(", ")
                : "--"}
            </p>
            <p>
              Weakest contributing modules:{" "}
              {report.weakestModules.length > 0
                ? report.weakestModules
                    .map((module) => `${module.title} (${formatScore(module.averageScore)})`)
                    .join(", ")
                : "--"}
            </p>
            <div className="space-y-2">
              {report.contributingModules.length > 0 ? (
                report.contributingModules.map((module) => (
                  <div key={module.key} className="rounded-[18px] bg-[var(--shell-soft)] px-4 py-3">
                    <div className="font-medium text-[var(--shell-ink)]">{module.title}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                      {formatScore(module.averageScore)} average across {module.sampleSize} submissions
                    </div>
                  </div>
                ))
              ) : (
                <p>{messages.insights.shared.noCompletedModuleEvidenceYet}</p>
              )}
            </div>
          </div>
        </div>

        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.capabilityAndQuestionEvidence}</div>
          <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--shell-muted)]">
            <div className="space-y-2">
              <p>
                Relevant capabilities:{" "}
                {report.contributingCapabilities.length > 0
                  ? report.contributingCapabilities
                      .map(
                        (capability) =>
                          `${capability.title} (${formatScore(capability.averageScore)})`
                      )
                      .join(", ")
                  : "No live capability scores are available yet for this insight slice."}
              </p>
            </div>
            <div className="space-y-2">
              <p>
                Relevant question clusters:{" "}
                {report.notableQuestionClusters.length > 0
                  ? report.notableQuestionClusters
                      .map((cluster) => `${cluster.title} (${formatScore(cluster.averageScore)})`)
                      .join(", ")
                  : "Stored answer coverage is still too thin to separate question clusters cleanly."}
              </p>
              {report.notableQuestionClusters.map((cluster) => (
                <div key={cluster.key} className="rounded-[18px] bg-[var(--shell-soft)] px-4 py-3">
                  <div className="font-medium text-[var(--shell-ink)]">{cluster.title}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    {formatScore(cluster.averageScore)} average across {cluster.responseCount} answers
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                    Question stems: {cluster.questionStemSample.join(" ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.shared.confidenceAndSampleCaveat}</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          <p>{report.confidenceSummary}</p>
          <p>{messages.common.liveEvidenceEnglishOnly}</p>
          {content?.confidenceDisclaimerTemplate ? <p>{content.confidenceDisclaimerTemplate}</p> : null}
          {report.confidenceCaveats.map((caveat) => (
            <p key={caveat}>{caveat}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
