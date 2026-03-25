import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import DashboardPanel from "@/app/components/dashboard/DashboardPanel";
import InsightList from "@/app/components/dashboard/InsightList";
import MetricCard from "@/app/components/dashboard/MetricCard";
import PatDashboardShell from "@/app/components/dashboard/PatDashboardShell";
import SubmissionHistoryList from "@/app/components/dashboard/SubmissionHistoryList";
import { getRequestOrigin } from "@/lib/request-origin";
import { deriveIntegrityNarrative, deriveScoreBand, type DashboardSubmissionSnapshot } from "@/lib/patDashboard";
import { summarizeSubmissionScores } from "@/lib/scoring";

export const dynamic = "force-dynamic";

type ResultsBody = {
  ok?: boolean;
  error?: string;
  detail?: string;
  result?: {
    score?: number | null;
    weightedAvg?: number | null;
    signalIntegrityScore?: number | null;
    answeredCount?: number | null;
    moduleKey?: string | null;
    moduleTitle?: string | null;
  } | null;
  history?: DashboardSubmissionSnapshot[];
  summary?: {
    submissionCount?: number;
    badgeCount?: number;
    unlockedInsightCount?: number;
  };
  scope?: {
    companyId?: string | null;
    subjectId?: string | null;
    source?: string;
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

export default async function ProfilesPage() {
  const apiBaseUrl = await getRequestOrigin();
  const cookieHeader = (await cookies()).toString();
  const resultsRes = await fetch(`${apiBaseUrl}/api/results`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (resultsRes.status === 401) {
    redirect("/login?callbackUrl=%2Fprofiles");
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
  const scope = resultsJson.scope ?? {};
  const unlockedInsights = Array.isArray(resultsJson.unlockedInsights) ? resultsJson.unlockedInsights : [];
  const scoreSummary = summarizeSubmissionScores(result);
  const posture = deriveScoreBand(scoreSummary.rawScorePct);
  const integrity = deriveIntegrityNarrative(scoreSummary.signalIntegrityScore);

  return (
    <>
      <EnsureCompanySelected />
      <PatDashboardShell
        eyebrow="PAT Profile Shell"
        title="Current institutional profile for the active PAT subject"
        description="This profile surface captures what PAT can currently say about the active company-backed subject from submissions, unlocks, and scope context. Capability maps, benchmark placement, and forward projections remain staged until those data writes are live."
      >
        {forbidden ? (
          <DashboardPanel title="Profile unavailable">
            <div className="text-sm text-[var(--shell-muted)]">
              Signed in, but your account is not authorized for company-scoped profiles.
            </div>
          </DashboardPanel>
        ) : apiError ? (
          <DashboardPanel title="Profile unavailable">
            <div className="text-sm text-[var(--shell-muted)]">Unable to load profile data: {apiError}</div>
          </DashboardPanel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Subject posture"
                value={posture.label}
                detail={posture.detail}
                tone={posture.tone}
              />
              <MetricCard
                label="Signal integrity"
                value={scoreSummary.signalIntegrityScore.toFixed(2)}
                detail={integrity.detail}
                tone={integrity.tone}
              />
              <MetricCard
                label="Unlocked insights"
                value={String(summary.unlockedInsightCount ?? unlockedInsights.length)}
                detail="Reflective content currently attached to this profile."
              />
              <MetricCard
                label="Submission count"
                value={String(summary.submissionCount ?? history.length)}
                detail="Recorded assessment snapshots in the active PAT scope."
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <DashboardPanel
                title="Profile identity"
                description="Current scope and module identity available from the live PAT beta model."
                tone="accent"
              >
                <div className="grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
                  <div>
                    Scope source: <span className="font-semibold text-[var(--shell-ink)]">{scope.source ?? "--"}</span>
                  </div>
                  <div>
                    Subject ID: <span className="font-semibold text-[var(--shell-ink)]">{scope.subjectId ?? "--"}</span>
                  </div>
                  <div>
                    Company ID: <span className="font-semibold text-[var(--shell-ink)]">{scope.companyId ?? "--"}</span>
                  </div>
                  <div>
                    Current module: <span className="font-semibold text-[var(--shell-ink)]">{result?.moduleTitle ?? result?.moduleKey ?? "--"}</span>
                  </div>
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Profile narrative"
                description="What the current PAT record can support without inventing unsupported analytics."
              >
                <div className="grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
                  <div>
                    Canonical score: <span className="font-semibold text-[var(--shell-ink)]">{scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}</span>
                  </div>
                  <div>
                    Confidence-adjusted display: <span className="font-semibold text-[var(--shell-ink)]">{scoreSummary.confidenceAdjustedScorePct === null ? "--" : `${scoreSummary.confidenceAdjustedScorePct}%`}</span>
                  </div>
                  <div>
                    Current profile use: <span className="font-semibold text-[var(--shell-ink)]">Tier 1 interpretation and output access</span>
                  </div>
                  <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/65 p-4">
                    Tier 2 growth areas are explicit but inactive here: capability scorecards, peer benchmarks, and future-state projections.
                  </div>
                </div>
              </DashboardPanel>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <DashboardPanel
                title="Profile history"
                description="Recent snapshots contributing to the current institutional profile."
              >
                <SubmissionHistoryList submissions={history} />
              </DashboardPanel>

              <DashboardPanel
                title="Profile interpretation"
                description="Unlocked PAT insight content currently attached to this profile shell."
              >
                <InsightList
                  insights={unlockedInsights}
                  emptyCopy="No interpretation is attached yet. This profile will deepen when Tier 1 unlocks are satisfied."
                />
              </DashboardPanel>
            </div>
          </>
        )}
      </PatDashboardShell>
    </>
  );
}
