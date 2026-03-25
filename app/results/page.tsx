import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import DashboardPanel from "@/app/components/dashboard/DashboardPanel";
import InsightList from "@/app/components/dashboard/InsightList";
import MetricCard from "@/app/components/dashboard/MetricCard";
import PatDashboardShell from "@/app/components/dashboard/PatDashboardShell";
import SubmissionHistoryList from "@/app/components/dashboard/SubmissionHistoryList";
import { getRequestOrigin } from "@/lib/request-origin";
import {
  deriveIntegrityNarrative,
  deriveScoreBand,
  deriveSubmissionTrajectory,
  type DashboardSubmissionSnapshot,
} from "@/lib/patDashboard";
import { summarizeSubmissionScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type ResultsBody = {
  ok?: boolean;
  error?: string;
  detail?: string;
  result?: {
    id: string;
    score?: number | null;
    weightedAvg?: number | null;
    answeredCount?: number | null;
    moduleId?: string | null;
    moduleKey?: string | null;
    moduleTitle?: string | null;
    signalIntegrityScore?: number | null;
    createdAt?: string;
  } | null;
  history?: DashboardSubmissionSnapshot[];
  summary?: {
    submissionCount?: number;
    badgeCount?: number;
    unlockedInsightCount?: number;
    latestSubmittedAt?: string | null;
  };
  unlockedInsights?: Array<{
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
  }>;
};

export default async function ResultsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const apiBaseUrl = await getRequestOrigin();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const justSubmitted = resolvedSearchParams?.submitted === "1";
  const cookieHeader = (await cookies()).toString();
  const resultsRes = await fetch(`${apiBaseUrl}/api/results`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (resultsRes.status === 401) {
    redirect("/login?callbackUrl=%2Fresults");
  }

  const resultsJson = (await resultsRes.json().catch(() => ({}))) as ResultsBody;
  const forbidden = resultsRes.status === 403;
  const apiError =
    !resultsRes.ok && !forbidden
      ? String(resultsJson.error ?? resultsJson.detail ?? `HTTP ${resultsRes.status}`)
      : null;

  const result = resultsJson.result ?? null;
  const history = Array.isArray(resultsJson.history) ? resultsJson.history : [];
  const summary = resultsJson.summary ?? {};
  const unlockedInsights = Array.isArray(resultsJson.unlockedInsights) ? resultsJson.unlockedInsights : [];

  const scoreSummary = summarizeSubmissionScores(result);
  const posture = deriveScoreBand(scoreSummary.rawScorePct);
  const integrity = deriveIntegrityNarrative(scoreSummary.signalIntegrityScore);
  const trajectory = deriveSubmissionTrajectory(history);

  const answeredCount =
    typeof result?.answeredCount === "number" && Number.isFinite(result.answeredCount)
      ? result.answeredCount
      : 0;

  return (
    <>
      <EnsureCompanySelected />
      <PatDashboardShell
        eyebrow="PAT Tier 1 Results"
        title="Institutional results that turn a submission into an operating readout"
        description="This surface shows the current assessment posture, response confidence, unlock progress, and recent submission movement. It does not fabricate Tier 2 projections or benchmarks that the current data model does not yet support."
      >
        {justSubmitted ? (
          <DashboardPanel
            title="Assessment received"
            description="PAT recorded the submission and moved directly into the protected results layer."
            tone="accent"
          >
            <div className="flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
              <Link className="rounded-full bg-[var(--shell-ink)] px-5 py-3 font-semibold text-white" href="/outputs">
                Continue to outputs
              </Link>
              <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 font-semibold text-[var(--shell-ink)]" href="/profiles">
                Open profile shell
              </Link>
            </div>
          </DashboardPanel>
        ) : null}

        {forbidden ? (
          <DashboardPanel title="Results unavailable">
            <div className="text-sm text-[var(--shell-muted)]">
              Signed in, but your account is not authorized for company-scoped results.
            </div>
          </DashboardPanel>
        ) : apiError ? (
          <DashboardPanel title="Results unavailable">
            <div className="text-sm text-[var(--shell-muted)]">Unable to load results: {apiError}</div>
          </DashboardPanel>
        ) : !result ? (
          <DashboardPanel
            title="No submission on record"
            description="PAT cannot create a Tier 1 dashboard until at least one assessment is submitted."
          >
            <div className="flex flex-wrap items-center gap-4">
              <Link
                className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white"
                href="/survey"
              >
                Start assessment
              </Link>
              <div className="text-sm text-[var(--shell-muted)]">
                Current results, outputs, and profiles will become active after the first submission.
              </div>
            </div>
          </DashboardPanel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Canonical score"
                value={scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}
                detail="Raw score percent is the authoritative badge and unlock basis."
                tone={posture.tone}
              />
              <MetricCard
                label="Confidence-adjusted"
                value={scoreSummary.confidenceAdjustedScorePct === null ? "--" : `${scoreSummary.confidenceAdjustedScorePct}%`}
                detail="Display-only score after response-confidence adjustment."
                tone={integrity.tone}
              />
              <MetricCard
                label="Unlocked insights"
                value={String(summary.unlockedInsightCount ?? unlockedInsights.length)}
                detail="Tier 1 interpretation currently available from explicit unlock rules."
              />
              <MetricCard
                label="Submission history"
                value={String(summary.submissionCount ?? history.length)}
                detail="Completed submissions in the current company-backed PAT scope."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <DashboardPanel
                title={posture.label}
                description={posture.detail}
                tone="accent"
              >
                <div className="grid gap-3 text-sm text-[var(--shell-muted)]">
                  <div>
                    Latest module: <span className="font-semibold text-[var(--shell-ink)]">{result.moduleTitle ?? result.moduleKey ?? result.moduleId ?? "Assessment module"}</span>
                  </div>
                  <div>
                    Answered questions: <span className="font-semibold text-[var(--shell-ink)]">{answeredCount}</span>
                  </div>
                  <div>
                    Raw weighted average: <span className="font-semibold text-[var(--shell-ink)]">{scoreSummary.rawWeightedAvg === null ? "--" : scoreSummary.rawWeightedAvg.toFixed(2)}</span>
                  </div>
                  <div>
                    Confidence signal: <span className="font-semibold text-[var(--shell-ink)]">{integrity.label}</span>
                  </div>
                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4 text-xs leading-6 text-[var(--shell-muted)]">
                    Unlock thresholds still use the raw score. Confidence-adjusted values help interpret response quality but do not silently alter awards.
                  </div>
                </div>
              </DashboardPanel>

              <DashboardPanel
                title={trajectory.label}
                description={trajectory.detail}
              >
                <div className="grid gap-3 text-sm text-[var(--shell-muted)]">
                  <div>
                    Badge count in scope: <span className="font-semibold text-[var(--shell-ink)]">{summary.badgeCount ?? 0}</span>
                  </div>
                  <div>
                    Latest submission date: <span className="font-semibold text-[var(--shell-ink)]">
                      {summary.latestSubmittedAt ? new Date(summary.latestSubmittedAt).toLocaleString() : "--"}
                    </span>
                  </div>
                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4 text-sm leading-6 text-[var(--shell-muted)]">
                    {integrity.detail}
                  </div>
                </div>
              </DashboardPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <DashboardPanel
                title="Recent submission history"
                description="Recent submissions are shown as actual recorded snapshots. PAT is not inferring long-run trend lines yet."
              >
                <SubmissionHistoryList submissions={history} />
              </DashboardPanel>

              <DashboardPanel
                title="Unlocked Tier 1 interpretation"
                description="Only insights that were actually unlocked for this subject appear here."
              >
                <InsightList
                  insights={unlockedInsights}
                  emptyCopy="No Tier 1 insight content is unlocked yet. Complete the assessment and satisfy the current unlock rules to activate this layer."
                />
              </DashboardPanel>
            </div>

            <DashboardPanel
              title="Next surface"
              description="Tier 2 projections, capability comparisons, and benchmark placements are staged behind future score writes and benchmark data. PAT is not fabricating those views yet."
              tone="muted"
            >
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--shell-muted)]">
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 font-semibold text-[var(--shell-ink)]" href="/outputs">
                  View unlocked outputs
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 font-semibold text-[var(--shell-ink)]" href="/profiles">
                  Open profile shell
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 font-semibold text-[var(--shell-ink)]" href="/survey">
                  Run another submission
                </Link>
              </div>
            </DashboardPanel>
          </>
        )}
      </PatDashboardShell>
    </>
  );
}
