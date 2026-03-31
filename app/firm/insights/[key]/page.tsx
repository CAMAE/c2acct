import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { getFirmInsightReports } from "@/lib/firmInsightEngine";
import { getFirmInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
  FIRM_TIER2_INSIGHT_DEFINITIONS,
  ensureFirmAlignmentSystem,
  tier2CardTitle,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function FirmInsightDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  await ensureFirmAlignmentSystem();

  const { key } = await params;
  const tier1Insight = FIRM_TIER1_INSIGHT_DEFINITIONS.find((item) => item.key === key);
  const tier2Insight = FIRM_TIER2_INSIGHT_DEFINITIONS.find((item) => item.key === key);
  const insight = tier1Insight ?? tier2Insight;
  const content = getFirmInsightContent(key);
  if (!insight) {
    notFound();
  }

  const [unlockedRecords, insightReports] = await Promise.all([
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    getFirmInsightReports(sessionUser.companyId),
  ]);
  const unlockedKeys = new Set(unlockedRecords.map((item) => item.key));
  const isTier2 = Boolean(tier2Insight);
  const unlocked = isTier2 ? false : unlockedKeys.has(key);
  const report = !isTier2 ? insightReports.get(key as (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"]) : null;

  return (
    <div className="space-y-8">
      <section className={`rounded-[28px] border p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] ${
        isTier2
          ? "border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)]"
          : "border-[var(--shell-border)] bg-white"
      }`}>
        <div className="pat-label">{isTier2 ? messages.insights.firm.eliteTitle : messages.insights.firm.proTitle}</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {insight.title}
          </h1>
          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
            isTier2
              ? "bg-[rgba(6,54,116,0.1)] text-[var(--shell-accent)]"
              : unlocked
                ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
                : "bg-slate-100 text-slate-600"
          }`}>
            {isTier2 ? messages.insights.shared.locked : unlocked ? messages.insights.shared.visible : messages.insights.shared.pending}
          </span>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {isTier2
            ? (content?.lockedState?.summary ??
              "This Elite membership firm insight is visibly staged but restricted. The underlying intelligence remains unavailable until Elite membership is active.")
            : (report?.currentStateSummary ?? content?.summary ?? ("body" in insight ? insight.body : insight.description))}
        </p>
        {!isTier2 && report ? (
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
        ) : null}
        {!isTier2 && report ? (
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {report.confidenceSummary}
          </div>
        ) : null}
        {isTier2 ? (
          <div className="mt-4 text-sm font-medium text-[var(--shell-ink)]">{tier2CardTitle(insight.title)}</div>
        ) : null}
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whatItIs}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2
              ? (content?.lockedState?.what ??
                "A restricted Elite membership firm intelligence card reserved for membership access.")
              : (report?.what ?? content?.what ?? "A firm PAT insight that explains the current alignment picture in a decision-ready format.")}
          </p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whyItMatters}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2
              ? (content?.lockedState?.why ??
                "This is where future projection, recommendation, and richer comparison layers would extend beyond current-state clarity.")
              : (report?.why ?? content?.why ?? "It turns the current PAT evidence into a usable current-state interpretation.")}
          </p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.howToUseIt}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2
              ? (content?.lockedState?.how ?? "Unlock with Elite membership to access the full firm guidance.")
              : (report?.how ??
                content?.how ??
                "Use it to prioritize the next operational, product, or change-management decision inside the firm.")}
          </p>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.shared.assessmentBasis}</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {isTier2
            ? (content?.lockedState?.basis ??
              "This locked view is reserved for richer benchmark and projection layers once Elite membership is active.")
            : (report?.basisSummary ?? content?.basisTemplate ?? "PAT is using current-state firm assessment evidence only.")}
        </p>
        {!isTier2 && report ? (
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.sample}: {report.sampleSize}. {messages.insights.shared.freshness}: {formatFreshness(report.latestUpdatedAt)}. {messages.insights.shared.confidence}: {report.confidenceLabel}.
          </p>
        ) : null}
        {!isTier2 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {(report?.contributingModules ?? []).map((module) => (
              <span
                key={module.key}
                className="rounded-full border border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium text-[var(--shell-ink)]"
              >
                {module.title}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {!isTier2 && report ? (
        <>
          <section className="grid gap-5 xl:grid-cols-2">
            <div className="pat-card p-6">
              <div className="pat-label">{messages.insights.shared.strongestContributingModules}</div>
              <div className="mt-4 grid gap-3">
                {report.strongestModules.length > 0 ? report.strongestModules.map((module) => (
                  <div key={module.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
                    <div className="font-semibold text-[var(--shell-ink)]">{module.title}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      Current score: {typeof module.score === "number" ? `${module.score}%` : "--"}
                    </div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      Section basis: {module.sectionTitle}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-[var(--shell-muted)]">{messages.insights.shared.noCompletedModuleEvidenceYet}</div>
                )}
              </div>
            </div>
            <div className="pat-card p-6">
              <div className="pat-label">{messages.insights.shared.weakestContributingModules}</div>
              <div className="mt-4 grid gap-3">
                {report.weakestModules.length > 0 ? report.weakestModules.map((module) => (
                  <div key={module.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
                    <div className="font-semibold text-[var(--shell-ink)]">{module.title}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      Current score: {typeof module.score === "number" ? `${module.score}%` : "--"}
                    </div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      Section basis: {module.sectionTitle}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-[var(--shell-muted)]">{messages.insights.shared.noCompletedModuleEvidenceYet}</div>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="pat-card p-6">
              <div className="pat-label">{messages.insights.shared.contributingCapabilities}</div>
              <div className="mt-4 grid gap-3">
                {report.contributingCapabilities.map((capability) => (
                  <div key={capability.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-[var(--shell-ink)]">{capability.title}</div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        capability.meetsThreshold
                          ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {capability.meetsThreshold ? "Ready" : "Below threshold"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--shell-muted)]">
                      Current score: {capability.score === null ? "--" : `${Math.round(capability.score)}%`}
                      {" · "}
                      Threshold: {capability.threshold}%
                    </div>
                    {capability.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{capability.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <section className="pat-card p-6">
                <div className="pat-label">{messages.insights.shared.notableQuestionClusters}</div>
                <div className="mt-4 grid gap-3">
                  {report.notableQuestionClusters.length > 0 ? report.notableQuestionClusters.map((cluster) => (
                    <div key={cluster.key} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
                      <div className="font-semibold text-[var(--shell-ink)]">{cluster.title}</div>
                      <div className="mt-1 text-sm text-[var(--shell-muted)]">
                        Average signal: {Math.round(cluster.averageScore)}% across {cluster.questionCount} mapped questions
                      </div>
                      <div className="mt-2 text-sm text-[var(--shell-muted)]">
                        Modules: {cluster.moduleTitles.join(", ")}
                      </div>
                      <div className="mt-2 text-sm text-[var(--shell-muted)]">
                        Sections: {cluster.sectionTitles.join(", ")}
                      </div>
                      {cluster.questionPrompts.length > 0 ? (
                        <div className="mt-2 text-sm text-[var(--shell-muted)]">
                          Question cluster: {cluster.questionPrompts.join(" · ")}
                        </div>
                      ) : null}
                    </div>
                  )) : (
                    <div className="text-sm text-[var(--shell-muted)]">{messages.insights.shared.questionClusterEvidenceNotAvailable}</div>
                  )}
                </div>
              </section>

              <section className="pat-card p-6">
                <div className="pat-label">{messages.insights.shared.confidenceAndSampleCaveat}</div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                    {report.confidenceSummary}
                  </div>
                  {report.confidenceCaveats.map((caveat) => (
                    <div key={caveat} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                      {caveat}
                    </div>
                  ))}
                  {content?.confidenceDisclaimerTemplate ? (
                    <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                      {content.confidenceDisclaimerTemplate}
                    </div>
                  ) : null}
                  {messages.common.liveEvidenceEnglishOnly !== "" ? (
                    <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                      {messages.common.liveEvidenceEnglishOnly}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        </>
      ) : null}

      {!isTier2 && !unlocked ? (
        <section className="pat-card p-6">
          <div className="pat-label">{messages.insights.firm.unlockRequirement}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.firm.unlockBody}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {FIRM_MODULE_DEFINITIONS.map((module) => (
              <span
                key={module.key}
                className="rounded-full border border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium text-[var(--shell-ink)]"
              >
                {module.title}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-secondary" href="/firm/insights">
          {messages.insights.firm.backToInsights}
        </Link>
        <Link className="pat-button-secondary" href="/firm/alignment-assessment">
          {messages.insights.firm.openAlignmentAssessment}
        </Link>
      </section>
    </div>
  );
}
