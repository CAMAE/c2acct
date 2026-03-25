import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { redirect } from "next/navigation";
import { summarizeSubmissionScores } from "@/lib/scoring";
import { TOP_OUTPUT_CARDS } from "@/lib/patUnlocks";

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
};

type UnlockedInsightsBody = ApiErrorBody & {
  unlocked?: UnlockedInsight[];
};

type EarnedBadgesBody = ApiErrorBody & {
  earned?: EarnedBadge[];
};

type UnlockedInsight = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  unlockReason: string;
  evidence: {
    requiredBadgeIds: string[];
    earnedBadgeIds: string[];
    missingBadgeIds: string[];
  };
};

type EarnedBadge = {
  id: string;
  badgeId: string;
  moduleId: string | null;
  awardedAt: string;
  name: string;
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
          resultsJson?.error ??
            resultsJson?.detail ??
            unlockedJson?.error ??
            unlockedJson?.detail ??
            earnedJson?.error ??
            earnedJson?.detail ??
            `HTTP ${firstErrorStatus}`
        )
      : null;

  const latest = resultsJson.result ?? null;
  const scoreSummary = summarizeSubmissionScores(latest);

  const unlockedInsights: UnlockedInsight[] = Array.isArray(unlockedJson.unlocked)
    ? unlockedJson.unlocked
    : [];
  const earnedBadges: EarnedBadge[] = Array.isArray(earnedJson.earned)
    ? earnedJson.earned
    : [];
  const unlockedKeys = new Set(unlockedInsights.map((insight) => insight.key));
  const unlockedByKey = new Map(unlockedInsights.map((insight) => [insight.key, insight]));
  const earnedBadgeIds = new Set(earnedBadges.map((badge) => badge.badgeId));

  function isCardUnlocked(card: (typeof TOP_OUTPUT_CARDS)[number]): boolean {
    const hasBadgeMeta = Boolean(card.requiredBadgeId?.trim());
    const hasInsightMeta = Boolean(card.requiredInsightKey);
    const isGated = hasBadgeMeta || hasInsightMeta;

    if (!isGated) {
      return true;
    }

    if (hasBadgeMeta) {
      if (card.requiredBadgeId && earnedBadgeIds.has(card.requiredBadgeId)) {
        return true;
      }
    }

    if (hasInsightMeta && card.requiredInsightKey && unlockedKeys.has(card.requiredInsightKey)) {
      return true;
    }

    return false;
  }

  const unlockedOutputCount = TOP_OUTPUT_CARDS.filter((card) => isCardUnlocked(card)).length;

  return (
    <section className="text-slate-900">
      <div className="mb-10">
        <EnsureCompanySelected />
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900">Top Seven Outputs</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          The seven institutional deliverables that define high-alignment firms.
        </p>
      </div>

      {forbidden ? (
        <div className="mb-6 rounded-2xl border border-black/10 bg-white/80 p-4 text-sm text-slate-800 shadow-sm">
          Signed in, but your account is not authorized for company-scoped outputs yet.
        </div>
      ) : null}

      {apiError ? (
        <div className="mb-6 rounded-2xl border border-black/10 bg-white/80 p-4 text-sm text-slate-800 shadow-sm">
          Unable to load outputs right now: {apiError}
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">
          Latest canonical score: {scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`}
        </div>
        <div className="mt-2 text-xs text-slate-700">Unlocked outputs: {unlockedOutputCount} / 7</div>
        <div className="mt-1 text-xs text-slate-700">Earned badges: {earnedBadges.length}</div>
      </div>

      <div className="mb-6 rounded-2xl border border-black/10 bg-white/85 p-4 text-sm text-slate-800 shadow-sm">
        <div className="font-semibold text-slate-900">Earned badges</div>
        {earnedBadges.length === 0 ? (
          <div className="mt-2 text-slate-700">No badges earned yet.</div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {earnedBadges.map((badge) => (
              <span
                key={badge.id}
                className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700"
              >
                {badge.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-black/10 bg-white/85 p-4 text-sm text-slate-800 shadow-sm">
        <div className="font-semibold text-slate-900">Signal integrity</div>
        <div className="mt-1 text-slate-800">{scoreSummary.signalIntegrityScore.toFixed(2)}</div>
        <div className="mt-3 font-semibold text-slate-900">Canonical raw values</div>
        <div className="mt-1 text-slate-700">
          Score: {scoreSummary.rawScorePct === null ? "--" : `${scoreSummary.rawScorePct}%`} • Weighted average: {scoreSummary.rawWeightedAvg === null ? "--" : scoreSummary.rawWeightedAvg.toFixed(2)}
        </div>
        <div className="mt-3 font-semibold text-slate-900">Confidence-adjusted display values</div>
        <div className="mt-1 text-slate-700">
          Score: {scoreSummary.confidenceAdjustedScorePct === null ? "--" : `${scoreSummary.confidenceAdjustedScorePct}%`} • Weighted average: {scoreSummary.confidenceAdjustedWeightedAvg === null ? "--" : scoreSummary.confidenceAdjustedWeightedAvg.toFixed(2)}
        </div>
        <div className="mt-3 text-xs text-slate-600">
          Unlocks are driven by earned badges and explicit insight rules, not by the confidence-adjusted display values.
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TOP_OUTPUT_CARDS.map((x) => {
          const unlocked = isCardUnlocked(x);
          const unlockedInsight = x.requiredInsightKey ? unlockedByKey.get(x.requiredInsightKey) : null;
          const hasBadgeMeta = Boolean(x.requiredBadgeId?.trim());
          const hasInsightMeta = Boolean(x.requiredInsightKey);
          const isGated = hasBadgeMeta || hasInsightMeta;
          const lockHint = unlocked ? "Unlocked" : "Locked until explicit badge or insight rules are satisfied";
          const showInsightContent = Boolean(unlocked && unlockedInsight);
          const cardHeading = showInsightContent ? unlockedInsight?.title : x.title;
          const cardBody = showInsightContent ? unlockedInsight?.body : x.desc;

          return (
          <div
            key={x.title}
            title={isGated ? lockHint : undefined}
            className={`rounded-2xl border border-black/10 bg-white/85 p-6 shadow-sm ${
              !unlocked ? "opacity-70 grayscale" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                {showInsightContent ? (
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{x.title}</div>
                ) : null}
                <div className="text-lg font-semibold text-slate-900">{cardHeading}</div>
              </div>
              {isGated ? (
                <div className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-semibold tracking-wide text-slate-700">
                  {unlocked ? "UNLOCKED" : "LOCKED"}
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">{cardBody}</div>
            {isGated ? (
              <div className="mt-4 text-xs text-slate-600">
                {unlocked
                  ? `Available through ${showInsightContent ? "insight unlock rules" : "earned badge state"}`
                  : "Not yet available in this subject scope"}
              </div>
            ) : null}
          </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm">
        <p className="text-sm text-slate-700">Output framework interface coming next.</p>
      </div>
    </section>
  );
}
