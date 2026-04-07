import Link from "next/link";
import { redirect } from "next/navigation";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";
import { getSessionUser } from "@/lib/auth/session";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { getFirmInsightReports } from "@/lib/firmInsightEngine";
import { getFirmInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import prisma from "@/lib/prisma";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_PRODUCT_MODULE_KEY,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
  FIRM_TIER2_INSIGHT_DEFINITIONS,
  ensureFirmAlignmentSystem,
  getFirmAssessmentProgress,
  tier2CardTitle,
} from "@/lib/firmPat";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Insights | C2Acct",
  description: "Firm-facing Pro membership and Elite membership PAT insight surfaces.",
};

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function FirmInsightsPage() {
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  await ensureFirmAlignmentSystem();

  const [moduleProgress, unlocked, firmProductSubmissions, insightReports] = await Promise.all([
    getFirmAssessmentProgress(sessionUser.companyId),
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    prisma.surveySubmission.count({
      where: {
        companyId: sessionUser.companyId,
        SurveyModule: { key: FIRM_PRODUCT_MODULE_KEY },
      },
    }).catch(() => 0),
    getFirmInsightReports(sessionUser.companyId),
  ]);

  const unlockedKeys = new Set(unlocked.map((item) => item.key));
  const completedModules = moduleProgress.filter((module) => module.latestSubmittedAt).length;
  const latestModuleAverage =
    moduleProgress.filter((module) => typeof module.latestScore === "number").reduce((sum, module, _, arr) => {
      return sum + (module.latestScore ?? 0) / arr.length;
    }, 0) || 0;

  return (
    <InsightsModeShell
      hero={
        <section className="pat-card p-8">
          <div className="pat-label">Firm insights</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {messages.insights.firm.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            {messages.insights.firm.heroBody}
          </p>
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.firm.currentStateNote}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.firm.modulesCompleted}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {completedModules} / {FIRM_MODULE_DEFINITIONS.length}
              </span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.firm.productReviewsSubmitted}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{firmProductSubmissions}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.firm.latestModuleAverage}:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {completedModules === 0 ? "--" : `${Math.round(latestModuleAverage)}%`}
              </span>
            </div>
          </div>
        </section>
      }
      proContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
              {messages.insights.firm.proTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              {messages.insights.firm.proBody}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {FIRM_TIER1_INSIGHT_DEFINITIONS.map((insight) => {
              const visible = unlockedKeys.has(insight.key);
              const report = insightReports.get(insight.key);
              const content = getFirmInsightContent(insight.key);
              return (
                <Link
                  key={insight.key}
                  href={`/firm/insights/${insight.key}`}
                  className={`${visible ? "pat-card pat-card-interactive" : "pat-card pat-card-muted pat-card-muted-interactive"} block p-6`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                    <InsightStatusBadge
                      label={visible ? messages.insights.shared.visible : messages.insights.shared.pending}
                      tone={visible ? "active" : "muted"}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {compactInsightSummary(report?.currentStateSummary ?? content?.summary ?? insight.body)}
                  </p>
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    {report
                      ? `${messages.insights.shared.confidence}: ${report.confidenceLabel} · ${messages.insights.shared.sample}: ${report.sampleSize} · ${messages.insights.shared.freshness}: ${formatFreshness(report.latestUpdatedAt)}`
                      : "Waiting on full module and capability coverage for a grounded Pro readout."}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      }
      eliteContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
              {messages.insights.firm.eliteTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              {messages.insights.firm.eliteBody}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {FIRM_TIER2_INSIGHT_DEFINITIONS.map((insight) => {
              const content = getFirmInsightContent(insight.key);
              return (
                <Link
                  key={insight.key}
                  href={`/firm/insights/${insight.key}`}
                  title={tier2CardTitle(insight.title)}
                  className="pat-card pat-card-muted pat-card-muted-interactive block p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                    <InsightStatusBadge label="Locked" tone="locked" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {compactInsightSummary(
                      content?.lockedState?.summary ??
                        "Elite membership detail is restricted. This card marks the intelligence slot without overstating what is live."
                    )}
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
              This firm page keeps current-state PAT interpretation separate from the higher-order layers that still need broader evidence and membership support before they can be claimed honestly.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <article className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Pro access</div>
                <InsightStatusBadge label="Pro Insights" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Pro insight depends on completed firm alignment coverage plus the relevant capability thresholds. When a card is ready, its detail page uses live firm evidence now.
              </p>
            </article>
            <article className="pat-card pat-card-muted p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Elite access</div>
                <InsightStatusBadge label="Locked" tone="locked" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Elite keeps benchmark, projection, and recommendation layers visible as locked surfaces. The detail routes exist, but they stay locked and disclaimer-driven until the deeper layer is real.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">Unlock path</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                If a Pro card still shows pending, the next step is to complete the firm alignment modules and strengthen the related capability signal rather than trying to force insight visibility early.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="pat-button-primary" href="/firm/alignment-assessment">
                  {messages.insights.firm.openAlignmentAssessment}
                </Link>
                <Link className="pat-button-secondary" href="/firm/help">
                  Review firm help
                </Link>
              </div>
            </article>
          </div>
        </>
      }
    />
  );
}
