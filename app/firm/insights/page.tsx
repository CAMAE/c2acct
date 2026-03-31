import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="space-y-8">
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
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {messages.insights.firm.modulesCompleted}: <span className="font-semibold text-[var(--shell-ink)]">{completedModules} / {FIRM_MODULE_DEFINITIONS.length}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {messages.insights.firm.productReviewsSubmitted}: <span className="font-semibold text-[var(--shell-ink)]">{firmProductSubmissions}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {messages.insights.firm.latestModuleAverage}: <span className="font-semibold text-[var(--shell-ink)]">{completedModules === 0 ? "--" : `${Math.round(latestModuleAverage)}%`}</span>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.firm.proTitle}</h2>
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
                className="pat-card pat-card-interactive block p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                    visible
                      ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {report?.confidenceLabel ?? (visible ? messages.insights.shared.visible : messages.insights.shared.pending)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {report?.currentStateSummary ?? content?.summary ?? insight.body}
                </p>
                {report?.strongestModules.length ? (
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    Strongest modules: {report.strongestModules.map((module) => module.title).join(", ")}
                    <br />
                    Weakest modules: {report.weakestModules.map((module) => module.title).join(", ")}
                  </div>
                ) : null}
                {report ? (
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    {messages.insights.shared.sample}: {report.sampleSize} relevant module submissions. {messages.insights.shared.freshness}: {formatFreshness(report.latestUpdatedAt)}.
                    <br />
                    {report.confidenceSummary}
                  </div>
                ) : null}
                <div className="mt-4 text-xs text-[var(--shell-muted)]">
                  {visible
                    ? messages.insights.firm.proAvailableLabel
                    : messages.insights.firm.proPendingLabel}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.firm.eliteTitle}</h2>
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
                className="block rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 transition-colors duration-150 hover:border-[rgba(79,191,226,0.45)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                  <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    Locked
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {content?.lockedState?.summary ??
                    "Elite membership detail is restricted. This blue card marks the intelligence slot without exposing the locked content."}
                </p>
                <div className="mt-4 text-xs text-[var(--shell-muted)]">
                  {content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
