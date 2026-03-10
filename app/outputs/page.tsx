import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type ApiCallResult = {
  ok: boolean;
  status: number;
  body: any;
};

type UnlockedInsight = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
};

type EarnedBadge = {
  id: string;
  badgeId: string;
  moduleId: string | null;
  awardedAt: string;
  name: string;
};

type OutputCard = {
  title: string;
  desc: string;
  badgeName: string;
  badgeId: string;
  insightKey?: string;
};

const TIER1_BADGE_ID = "49d380c5-b1d0-493b-b9c3-f2391fa3430b";
const TIER1_BADGE_NAME = "Tier 1 Unlocked";

export default async function OutputsPage({
  searchParams,
}: {
  searchParams?: Promise<{ productId?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const productIdParamRaw = resolvedSearchParams.productId;
  const productIdParam = Array.isArray(productIdParamRaw)
    ? productIdParamRaw[0]
    : productIdParamRaw;
  const requestedProductId = typeof productIdParam === "string" ? productIdParam.trim() : "";
  const productIdFilter = requestedProductId.length > 0 ? requestedProductId : null;

  const apiBaseUrl = await getRequestOrigin();
  const loginRedirect = "/login?callbackUrl=%2Foutputs";
  const cookieHeader = (await cookies()).toString();
  const requestHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;

  const contextRes = await fetch(`${apiBaseUrl}/api/products/context`, {
    cache: "no-store",
    headers: requestHeaders,
  });

  if (contextRes.status === 401) {
    redirect(loginRedirect);
  }

  const contextJson = await contextRes.json().catch(() => ({}));
  const contextForbidden = contextRes.status === 403;
  const contextError = !contextRes.ok && !contextForbidden;
  const enableProductSelection = !contextError && contextJson?.enableProductSelection === true;
  const products: Array<{ id: string; name: string }> = Array.isArray(contextJson?.products)
    ? contextJson.products
    : [];

  const productQuery = productIdFilter ? `?productId=${encodeURIComponent(productIdFilter)}` : "";

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
    safeApiGet(`/api/results${productQuery}`),
    safeApiGet(`/api/insights/unlocked${productQuery}`),
    safeApiGet(`/api/badges/earned${productQuery}`),
  ]);

  if (resultsCall.status === 401 || unlockedCall.status === 401 || earnedCall.status === 401) {
    redirect(loginRedirect);
  }

  const resultsJson = resultsCall.body;
  const unlockedJson = unlockedCall.body;
  const earnedJson = earnedCall.body;

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

  const latest = resultsJson?.result as
    | {
        score?: number | null;
        weightedAvg?: number | null;
        signalIntegrityScore?: number | null;
      }
    | null;
  const latestScore = latest?.score;
  const latestWeightedAvg = latest?.weightedAvg;
  const rawScore =
    typeof latestScore === "number" && Number.isFinite(latestScore) ? Math.round(latestScore) : null;
  const rawWeightedAvg =
    typeof latestWeightedAvg === "number" && Number.isFinite(latestWeightedAvg)
      ? latestWeightedAvg
      : null;
  const integrityRaw = Number(latest?.signalIntegrityScore);
  const signalIntegrityScore =
    Number.isFinite(integrityRaw) && integrityRaw > 0 ? integrityRaw : 1;
  const effectiveScore = rawScore === null ? null : Math.round(rawScore * signalIntegrityScore);
  const effectiveWeightedAvg =
    rawWeightedAvg === null ? null : Math.round(rawWeightedAvg * signalIntegrityScore * 100) / 100;

  const unlockedInsights: UnlockedInsight[] = Array.isArray(unlockedJson?.unlocked)
    ? (unlockedJson.unlocked as UnlockedInsight[])
    : [];
  const earnedBadges: EarnedBadge[] = Array.isArray(earnedJson?.earned)
    ? (earnedJson.earned as EarnedBadge[])
    : [];
  const unlockedKeys = new Set(unlockedInsights.map((insight) => insight.key));
  const unlockedByKey = new Map(unlockedInsights.map((insight) => [insight.key, insight]));

  const normalizeBadgeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const badgeKeys = new Set<string>();
  for (const badge of earnedBadges) {
    if (typeof badge.badgeId === "string" && badge.badgeId.trim()) {
      badgeKeys.add(`id:${badge.badgeId.trim().toLowerCase()}`);
    }
    if (typeof badge.name === "string" && badge.name.trim()) {
      badgeKeys.add(`name:${normalizeBadgeName(badge.name)}`);
    }
  }

  const outputCards: OutputCard[] = [
    {
      title: "Alignment Baseline",
      desc: "Where the firm is now, quantified.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
      insightKey: "tier1_alignment_baseline",
    },
    {
      title: "Operating System Map",
      desc: "How work actually moves through the firm.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
      insightKey: "tier1_operating_system_map",
    },
    {
      title: "Risk & Control Posture",
      desc: "Controls, exposure, and governance maturity.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
      insightKey: "tier1_risk_control_posture",
    },
    {
      title: "Implementation Roadmap",
      desc: "Sequenced steps to reach high alignment.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
      insightKey: "tier1_implementation_roadmap",
    },
    {
      title: "Institutional Profile",
      desc: "Capability scoring and operational alignment snapshot.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
    },
    {
      title: "Automation Readiness",
      desc: "What can be delegated, what must stay human.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
    },
    {
      title: "Executive Brief",
      desc: "Board-ready summary and next actions.",
      badgeName: TIER1_BADGE_NAME,
      badgeId: TIER1_BADGE_ID,
    },
  ];

  function isCardUnlocked(card: OutputCard): boolean {
    const hasBadgeMeta = Boolean(card.badgeName?.trim()) || Boolean(card.badgeId?.trim());
    const hasInsightMeta = Boolean(card.insightKey);
    const isGated = hasBadgeMeta || hasInsightMeta;

    if (!isGated) {
      return true;
    }

    if (hasBadgeMeta) {
      const badgeNameKey = card.badgeName?.trim()
        ? `name:${normalizeBadgeName(card.badgeName)}`
        : null;
      const badgeIdKey = card.badgeId?.trim() ? `id:${card.badgeId.trim().toLowerCase()}` : null;
      if ((badgeNameKey && badgeKeys.has(badgeNameKey)) || (badgeIdKey && badgeKeys.has(badgeIdKey))) {
        return true;
      }
    }

    if (hasInsightMeta && card.insightKey && unlockedKeys.has(card.insightKey)) {
      return true;
    }

    return false;
  }

  const unlockedOutputCount = outputCards.filter((card) => isCardUnlocked(card)).length;

  return (
    <section className="text-slate-900">
      <div className="mb-10">
        <EnsureCompanySelected />
        <h1 className="text-5xl font-semibold tracking-tight text-slate-900">Firm Intelligence</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          Unlocked intelligence and institutional insights for high-alignment firms.
        </p>

        {enableProductSelection ? (
          <div className="mt-6 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <form method="GET" className="flex flex-wrap items-center gap-3">
              <label htmlFor="productId" className="text-sm font-medium text-slate-800">
                Context
              </label>
              <select
                id="productId"
                name="productId"
                defaultValue={productIdFilter ?? ""}
                className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Company-root outputs</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-md border border-black/15 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Apply
              </button>
            </form>
          </div>
        ) : null}
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
          Latest alignment score: {rawScore === null ? "--" : `${rawScore}%`}
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
        <div className="mt-1 text-slate-800">{signalIntegrityScore.toFixed(2)}</div>
        <div className="mt-3 font-semibold text-slate-900">Raw</div>
        <div className="mt-1 text-slate-700">
          Score: {rawScore === null ? "--" : `${rawScore}%`} | Weighted average: {rawWeightedAvg === null ? "--" : rawWeightedAvg.toFixed(2)}
        </div>
        <div className="mt-3 font-semibold text-slate-900">Integrity-adjusted</div>
        <div className="mt-1 text-slate-700">
          Score: {effectiveScore === null ? "--" : `${effectiveScore}%`} | Weighted average: {effectiveWeightedAvg === null ? "--" : effectiveWeightedAvg.toFixed(2)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {outputCards.map((x) => {
          const unlocked = isCardUnlocked(x);
          const unlockedInsight = x.insightKey ? unlockedByKey.get(x.insightKey) : null;
          const hasBadgeMeta = Boolean(x.badgeName?.trim()) || Boolean(x.badgeId?.trim());
          const hasInsightMeta = Boolean(x.insightKey);
          const isGated = hasBadgeMeta || hasInsightMeta;
          const lockHint = unlocked ? "Unlocked" : "Locked until corresponding unlock criteria are met";
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
              <div className="mt-2 whitespace-pre-line text-sm text-slate-700">{cardBody}</div>
              {isGated ? (
                <div className="mt-4 text-xs text-slate-600">
                  {unlocked
                    ? "Available based on earned badge or unlocked insight"
                    : "Not yet available in this company session"}
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