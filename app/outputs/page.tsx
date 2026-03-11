import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { redirect } from "next/navigation";
import { getExternalObservedAnnotation } from "@/lib/reviews/getExternalObservedAnnotation";
import { getExternalObservedUnlockDiagnostics } from "@/lib/reviews/getExternalObservedUnlockDiagnostics";
import { getExternalObservedUnlockCandidates } from "@/lib/reviews/getExternalObservedUnlockCandidates";

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

type ProductDimensionScores = {
  positioningClarity: number | null;
  workflowFit: number | null;
  integrationReadiness: number | null;
  supportConfidence: number | null;
};

const PRODUCT_DIMENSION_LABELS: Record<keyof ProductDimensionScores, string> = {
  positioningClarity: "Positioning Clarity",
  workflowFit: "Workflow Fit",
  integrationReadiness: "Integration Readiness",
  supportConfidence: "Support Confidence",
};

const PRODUCT_DIMENSION_BY_INSIGHT_KEY: Record<string, keyof ProductDimensionScores> = {
  product_positioning_clarity: "positioningClarity",
  product_workflow_fit_snapshot: "workflowFit",
  product_integration_readiness: "integrationReadiness",
  product_support_confidence_signal: "supportConfidence",
};

const TIER1_BADGE_ID = "49d380c5-b1d0-493b-b9c3-f2391fa3430b";
const TIER1_BADGE_NAME = "Tier 1 Unlocked";
const PRODUCT_BADGE_ID = "3a53d563-c4f9-45dc-9aa5-a8f8c018c006";
const PRODUCT_BADGE_NAME = "Product GTM Unlocked";

const FIRM_OUTPUT_CARDS: OutputCard[] = [
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

const PRODUCT_OUTPUT_CARDS: OutputCard[] = [
  {
    title: "Product Positioning Clarity",
    desc: "How clearly the product value proposition lands for buyer priorities.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_positioning_clarity",
  },
  {
    title: "Workflow Fit Snapshot",
    desc: "Where the product fits naturally into day-to-day accounting workflows.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_workflow_fit_snapshot",
  },
  {
    title: "Integration Readiness",
    desc: "Current readiness of integrations required for scale adoption.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_integration_readiness",
  },
  {
    title: "Onboarding Friction Estimate",
    desc: "Likely friction points from purchase to first operational value.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_onboarding_friction_estimate",
  },
  {
    title: "Support Confidence Signal",
    desc: "Trust signal based on expected quality and consistency of support.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_support_confidence_signal",
  },
  {
    title: "Product GTM Readiness Summary",
    desc: "A concise readiness view for rollout and customer-facing launch motions.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_gtm_readiness_summary",
  },
  {
    title: "Product Improvement Priorities",
    desc: "Sequenced product-level priorities most likely to improve fit and retention.",
    badgeName: PRODUCT_BADGE_NAME,
    badgeId: PRODUCT_BADGE_ID,
    insightKey: "product_improvement_priorities",
  },
];

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
  const isProductContext = Boolean(productIdFilter);
  const productDimensionsCall = isProductContext
    ? await safeApiGet(`/api/outputs/product-dimensions${productQuery}`)
    : null;

  if (
    resultsCall.status === 401 ||
    unlockedCall.status === 401 ||
    earnedCall.status === 401 ||
    productDimensionsCall?.status === 401
  ) {
    redirect(loginRedirect);
  }

  const resultsJson = resultsCall.body;
  const unlockedJson = unlockedCall.body;
  const earnedJson = earnedCall.body;

  const forbidden =
    resultsCall.status === 403 ||
    unlockedCall.status === 403 ||
    earnedCall.status === 403 ||
    productDimensionsCall?.status === 403;
  const firstErrorStatus = !resultsCall.ok
    ? resultsCall.status
    : !unlockedCall.ok
      ? unlockedCall.status
      : !earnedCall.ok
        ? earnedCall.status
        : productDimensionsCall && !productDimensionsCall.ok
          ? productDimensionsCall.status
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
            productDimensionsCall?.body?.error ??
            productDimensionsCall?.body?.detail ??
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

  const outputCards = isProductContext ? PRODUCT_OUTPUT_CARDS : FIRM_OUTPUT_CARDS;
  const subjectCompanyId =
    typeof contextJson?.companyId === "string" && contextJson.companyId.trim()
      ? contextJson.companyId.trim()
      : null;
  const externalObservedAnnotation = subjectCompanyId
    ? await getExternalObservedAnnotation({
        moduleKey: "product_workflow_fit_review_v1",
        subjectCompanyId,
        subjectProductId: productIdFilter,
      })
    : null;
  const externalObservedUnlockDiagnostics =
    isProductContext && subjectCompanyId
      ? await getExternalObservedUnlockDiagnostics({
          subjectCompanyId,
          subjectProductId: productIdFilter,
        })
      : null;
  const externalObservedUnlockCandidates =
    isProductContext && subjectCompanyId
      ? await getExternalObservedUnlockCandidates({
          subjectCompanyId,
          subjectProductId: productIdFilter,
        })
      : null;
  const dimensionScores: ProductDimensionScores | null =
    productDimensionsCall && productDimensionsCall.ok && productDimensionsCall.body?.dimensions
      ? (productDimensionsCall.body.dimensions as ProductDimensionScores)
      : null;

  const dimensionEntries = Object.entries(PRODUCT_DIMENSION_LABELS).map(([key, label]) => {
    const dimensionKey = key as keyof ProductDimensionScores;
    const value = dimensionScores?.[dimensionKey] ?? null;
    return { key: dimensionKey, label, value };
  });

  const scoredDimensionValues = dimensionEntries
    .map((entry) => entry.value)
    .filter((value): value is number => typeof value === "number");
  const productDimensionAverage =
    scoredDimensionValues.length > 0
      ? Math.round(scoredDimensionValues.reduce((sum, value) => sum + value, 0) / scoredDimensionValues.length)
      : null;
  const hasExternalObservedUnlockDiagnostics = Boolean(
    externalObservedUnlockDiagnostics &&
      (externalObservedUnlockDiagnostics.global.featureFlagEnabled ||
        externalObservedUnlockDiagnostics.global.annotationEligible ||
        externalObservedUnlockDiagnostics.global.unlockAt60 ||
        externalObservedUnlockDiagnostics.global.unlockAt75)
  );
  const candidateByCardId = new Map(
    (externalObservedUnlockCandidates?.candidates ?? []).map((candidate) => [candidate.cardId, candidate])
  );

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
          {isProductContext
            ? "Product-specific intelligence for the selected vendor product context."
            : "Unlocked intelligence and institutional insights for high-alignment firms."}
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
        <div className="mt-2 text-xs text-slate-700">Unlocked outputs: {unlockedOutputCount} / {outputCards.length}</div>
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

      {isProductContext ? (
        <div className="mb-6 rounded-2xl border border-black/10 bg-white/85 p-4 text-sm text-slate-800 shadow-sm">
          <div className="font-semibold text-slate-900">Product dimension scores (0-100)</div>
          <div className="mt-1 text-xs text-slate-700">
            {productDimensionAverage === null
              ? "Awaiting product-scoped submission data"
              : `Dimension average: ${productDimensionAverage}`}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {dimensionEntries.map((entry) => (
              <div key={entry.key} className="rounded-md border border-black/10 bg-white px-3 py-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{entry.label}</div>
                <div className="text-sm font-semibold text-slate-900">
                  {entry.value === null ? "--" : `${entry.value}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {externalObservedAnnotation?.eligible && externalObservedAnnotation.annotation ? (
        <div className="mb-6 rounded-2xl border border-black/10 bg-white/85 p-4 text-sm text-slate-800 shadow-sm">
          <div className="font-semibold text-slate-900">Observed market signal</div>
          <div className="mt-2 text-slate-700">Review count: {externalObservedAnnotation.annotation.reviewCount}</div>
          <div className="mt-1 text-slate-700">
            Score average: {externalObservedAnnotation.annotation.scoreAvg === null ? "--" : externalObservedAnnotation.annotation.scoreAvg.toFixed(2)}
          </div>
          <div className="mt-1 text-slate-700">
            Weighted average: {externalObservedAnnotation.annotation.weightedAvgAvg === null ? "--" : externalObservedAnnotation.annotation.weightedAvgAvg.toFixed(2)}
          </div>
          <div className="mt-1 text-slate-700">
            Signal integrity average: {externalObservedAnnotation.annotation.signalIntegrityAvg === null ? "--" : externalObservedAnnotation.annotation.signalIntegrityAvg.toFixed(2)}
          </div>
          <div className="mt-1 text-slate-700">
            Latest review: {externalObservedAnnotation.annotation.latestReviewAt ? new Date(externalObservedAnnotation.annotation.latestReviewAt).toLocaleString() : "--"}
          </div>
        </div>
      ) : null}

      {isProductContext && hasExternalObservedUnlockDiagnostics ? (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-800 shadow-sm">
          <div className="font-semibold text-slate-900">External observed unlock diagnostics</div>
          <div className="mt-2 text-slate-700">
            Feature flag enabled: {externalObservedUnlockDiagnostics?.global.featureFlagEnabled ? "yes" : "no"}
          </div>
          <div className="mt-1 text-slate-700">
            Annotation eligible: {externalObservedUnlockDiagnostics?.global.annotationEligible ? "yes" : "no"}
          </div>
          <div className="mt-1 text-slate-700">
            Unlock at 60 reason: {externalObservedUnlockDiagnostics?.global.unlockAt60?.reason ?? "--"}
          </div>
          <div className="mt-1 text-slate-700">
            Unlock at 75 reason: {externalObservedUnlockDiagnostics?.global.unlockAt75?.reason ?? "--"}
          </div>
        </div>
      ) : null}

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
          const dimensionKey = x.insightKey ? PRODUCT_DIMENSION_BY_INSIGHT_KEY[x.insightKey] : undefined;
          const cardScore = dimensionKey ? dimensionScores?.[dimensionKey] ?? null : null;
          const observedCandidate =
            isProductContext && x.insightKey ? candidateByCardId.get(x.insightKey) ?? null : null;

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
              {isProductContext && dimensionKey ? (
                <div className="mt-3 rounded-md border border-black/10 bg-white px-3 py-2 text-xs text-slate-700">
                  {PRODUCT_DIMENSION_LABELS[dimensionKey]} score: {cardScore === null ? "--" : `${cardScore}/100`}
                </div>
              ) : null}
              {isProductContext && observedCandidate ? (
                <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  <div>Observed candidate: {observedCandidate.wouldQualify ? "yes" : "no"}</div>
                  <div>Basis: external observed score</div>
                  <div>Threshold: {observedCandidate.thresholdUsed}</div>
                  <div>Reason: {observedCandidate.reason}</div>
                </div>
              ) : null}
              {isGated ? (
                <div className="mt-4 text-xs text-slate-600">
                  {unlocked
                    ? "Available based on earned badge or unlocked insight"
                    : isProductContext
                      ? "Not yet available in this product context"
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