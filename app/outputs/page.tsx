import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import DashboardPanel from "@/app/components/dashboard/DashboardPanel";
import InsightList from "@/app/components/dashboard/InsightList";
import MetricCard from "@/app/components/dashboard/MetricCard";
import OutputCatalog from "@/app/components/dashboard/OutputCatalog";
import PatDashboardShell from "@/app/components/dashboard/PatDashboardShell";
import { getRequestOrigin } from "@/lib/request-origin";
import { buildOutputAvailability } from "@/lib/patDashboard";
import { summarizeSubmissionScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type ApiCallResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

type ApiErrorBody = {
  error?: string;
  detail?: string;
};

type ResultsBody = ApiErrorBody & {
  result?: {
    score?: number | null;
    weightedAvg?: number | null;
    signalIntegrityScore?: number | null;
  } | null;
  summary?: {
    submissionCount?: number;
    badgeCount?: number;
    unlockedInsightCount?: number;
  };
};

type UnlockedInsight = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  unlockReason: string;
  evidence?: {
    requiredBadgeIds: string[];
    earnedBadgeIds: string[];
    missingBadgeIds: string[];
  };
};

type UnlockedInsightsBody = ApiErrorBody & {
  unlocked?: UnlockedInsight[];
};

type EarnedBadge = {
  id: string;
  badgeId: string;
  moduleId: string | null;
  awardedAt: string;
  name: string;
};

type EarnedBadgesBody = ApiErrorBody & {
  earned?: EarnedBadge[];
};

export default async function OutputsPage() {
  const apiBaseUrl = await getRequestOrigin();
  const loginRedirect = "/login?callbackUrl=%2Foutputs";
  const cookieHeader = (await cookies()).toString();
  const requestHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;

  async function safeApiGet(path: string): Promise<ApiCallResult> {
    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        cache: "no-store",
        headers: requestHeaders,
      });
      const body = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, body };
    } catch {
      return {
        ok: false,
        status: 503,
        body: { error: "Protected API request failed" },
      };
    }
  }

  const [resultsCall, unlockedCall, earnedCall] = await Promise.all([
    safeApiGet("/api/results"),
    safeApiGet("/api/insights/unlocked"),
    safeApiGet("/api/badges/earned"),
  ]);

  if (resultsCall.status === 401 || unlockedCall.status === 401 || earnedCall.status === 401) {
    redirect(loginRedirect);
  }

  const resultsJson = (resultsCall.body ?? {}) as ResultsBody;
  const unlockedJson = (unlockedCall.body ?? {}) as UnlockedInsightsBody;
  const earnedJson = (earnedCall.body ?? {}) as EarnedBadgesBody;

  const forbidden =
    resultsCall.status === 403 || unlockedCall.status === 403 || earnedCall.status === 403;
  const firstErrorStatus = !resultsCall.ok
    ? resultsCall.status
    : !unlockedCall.ok
      ? unlockedCall.status
      : !earnedCall.ok
        ? earnedCall.status
        : null;
  const apiError =
    !forbidden && firstErrorStatus !== null
      ? String(
          resultsJson.error ??
            resultsJson.detail ??
            unlockedJson.error ??
            unlockedJson.detail ??
            earnedJson.error ??
            earnedJson.detail ??
            `HTTP ${firstErrorStatus}`
        )
      : null;

  const latest = resultsJson.result ?? null;
  const summary = resultsJson.summary ?? {};
  const scoreSummary = summarizeSubmissionScores(latest);
  const unlockedInsights = Array.isArray(unlockedJson.unlocked) ? unlockedJson.unlocked : [];
  const earnedBadges = Array.isArray(earnedJson.earned) ? earnedJson.earned : [];
  const outputAvailability = buildOutputAvailability({
    earnedBadgeIds: earnedBadges.map((badge) => badge.badgeId),
    unlockedInsightKeys: unlockedInsights.map((insight) => insight.key),
  }).map((item) => ({
    ...item,
    content: unlockedInsights.find((insight) => insight.key === item.requiredInsightKey)?.body ?? null,
  }));

  const unlockedOutputCount = outputAvailability.filter((item) => item.unlocked).length;

  return (
    <>
      <EnsureCompanySelected />
      <PatDashboardShell
        eyebrow="PAT Outputs Workspace"
        title="Unlocked deliverables, current evidence, and staged next layers"
        description="This workspace explains what PAT can deliver now from earned badges, unlocked insights, and the current submission record. It does not present synthetic Tier 2 deliverables where the model and data are not ready."
      >
        {forbidden ? (
          <DashboardPanel title="Outputs unavailable">
            <div className="text-sm text-[var(--shell-muted)]">
              Signed in, but your account is not authorized for company-scoped outputs yet.
            </div>
          </DashboardPanel>
        ) : apiError ? (
          <DashboardPanel title="Outputs unavailable">
            <div className="text-sm text-[var(--shell-muted)]">Unable to load outputs right now: {apiError}</div>
          </DashboardPanel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Unlocked outputs"
                value={`${unlockedOutputCount} / ${outputAvailability.length}`}
                detail="Outputs currently available in the active subject scope."
              />
              <MetricCard
                label="Unlocked insights"
                value={String(summary.unlockedInsightCount ?? unlockedInsights.length)}
                detail="Tier 1 reflective content already activated."
              />
              <MetricCard
                label="Earned badges"
                value={String(summary.badgeCount ?? earnedBadges.length)}
                detail="Current badge state driving output access."
              />
              <MetricCard
                label="Canonical score"
                value={scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}
                detail="Displayed for context only. Outputs still unlock through explicit rules."
              />
            </div>

            <DashboardPanel
              title="What PAT can deliver now"
              description="Unlocked outputs are shown with the actual content currently backed by badge and insight rules."
            >
              <OutputCatalog items={outputAvailability} />
            </DashboardPanel>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <DashboardPanel
                title="Tier 1 interpretation already available"
                description="These are the reflective insights PAT has actually unlocked, not placeholder narratives."
              >
                <InsightList
                  insights={unlockedInsights}
                  emptyCopy="No unlocked insight bodies are available yet. The output workspace will expand automatically when the current unlock rules are met."
                />
              </DashboardPanel>

              <DashboardPanel
                title="Current output basis"
                description="This is the evidence currently supporting the output layer."
                tone="muted"
              >
                <div className="grid gap-4">
                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4">
                    <div className="text-sm font-semibold text-[var(--shell-ink)]">Badge state</div>
                    {earnedBadges.length === 0 ? (
                      <div className="mt-2 text-sm text-[var(--shell-muted)]">No badges earned yet in this scope.</div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {earnedBadges.map((badge) => (
                          <span
                            key={badge.id}
                            className="rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel)] px-3 py-1 text-[11px] font-semibold text-[var(--shell-ink)]"
                          >
                            {badge.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4">
                    <div className="text-sm font-semibold text-[var(--shell-ink)]">Scoring context</div>
                    <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                      Raw score: {scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}
                      <br />
                      Confidence-adjusted display: {scoreSummary.confidenceAdjustedScorePct === null ? "--" : `${scoreSummary.confidenceAdjustedScorePct}%`}
                      <br />
                      Signal integrity: {scoreSummary.signalIntegrityScore.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                    Tier 2 program dashboards, future-state projections, and benchmarking layers are intentionally staged until PAT has durable capability-score writes, benchmark cohorts, and more than thin submission history.
                  </div>
                </div>
              </DashboardPanel>
            </div>
          </>
        )}
      </PatDashboardShell>
    </>
  );
}
