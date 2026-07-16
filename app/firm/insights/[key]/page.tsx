import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import FirmInsightDetailBody from "@/app/components/insights/detail/FirmInsightDetailBody";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildFirmInsightDetailSurfaceCards,
  buildFirmInsightDetailSurfaceContent,
  buildFirmLockedInsightDetailSurfaceCards,
  buildFirmLockedInsightDetailSurfaceContent,
  getFirmInsightReports,
  getRequestedFirmInsightDetailSurface,
} from "@/lib/firmInsightEngine";
import { getFirmInsightContent } from "@/lib/insightContent";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import prisma from "@/lib/prisma";
import { getAlignmentBoardData } from "@/lib/alignmentBoard";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { buildFirmPeerPosition, buildFirmGapPlan, buildFirmTrajectory, buildFirmThemeDepth } from "@/lib/eliteInsightsV2";
import EliteCardShell from "@/app/components/insights/elite/EliteCardShell";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import { FIRM_ELITE_V2_META } from "@/lib/eliteInsightsV2";
import FirmPeerPositionCard from "@/app/components/insights/elite/FirmPeerPositionCard";
import FirmThemeEliteDepthCard from "@/app/components/insights/elite/FirmThemeEliteDepthCard";
import FirmGapPlanCard from "@/app/components/insights/elite/FirmGapPlanCard";
import FirmTrajectoryCard from "@/app/components/insights/elite/FirmTrajectoryCard";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
  FIRM_TIER2_INSIGHT_DEFINITIONS,
  ensureFirmAlignmentSystem,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = {
  surface?: string;
};

/**
 * Elite Insights v2 (verdict §4) — render a firm Tier-2 decision product: F1 Peer
 * Position (firm_tier2_benchmark), F2 Gap-to-Top-Quartile (firm_tier2_recommendation),
 * F3 Trajectory (firm_tier2_projection). Rank/percentile + charts, not averages.
 */
async function renderFirmEliteSurface(key: string, companyId: string) {
  const boundary = await resolveCompanyBoundary(companyId);
  // Block 12f: one shared live reader feeds "you" module scores + the alignment
  // index into every Elite surface (peer position, trajectory).
  const signal = await getFirmAlignmentSignal(companyId);

  if (key === "firm_tier2_benchmark") {
    const data = await buildFirmPeerPosition(prisma, companyId, boundary, signal);
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Peer Position"
        title="Peer Position Report"
        summary="Where your firm ranks against peer firms, module by module — a percentile position, not an average. Cuts below the minimum-n safe harbor are withheld."
      >
        <FirmPeerPositionCard data={data} />
      </EliteCardShell>
    );
  }

  if (key === "firm_tier2_recommendation") {
    const data = await buildFirmGapPlan({ getFirmInsightReports }, companyId);
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Gap Plan"
        title="Gap-to-Top-Quartile Plan"
        summary="The capabilities holding your alignment index down, ranked by point deficit — a prescription (fix this first), not a description. Grounded in your firm-reviewed evidence."
      >
        <FirmGapPlanCard data={data} />
      </EliteCardShell>
    );
  }

  if (key === "firm_tier2_projection") {
    // Percentile-movement link to the Sandbox: map the best swap's projected
    // alignment to a percentile against the peer alignment-index distribution.
    const [peer, board] = await Promise.all([
      buildFirmPeerPosition(prisma, companyId, boundary, signal),
      getAlignmentBoardData(companyId).catch(() => null),
    ]);
    const currentPercentile = peer.overall?.percentile ?? null;
    let bestSwapPercentile: number | null = null;
    const best = board?.candidates[0] ?? null;
    if (best && typeof best.projectedScore === "number" && peer.overall && currentPercentile !== null) {
      // directional: nudge the current percentile by the swap's projected index gain.
      const gain = Math.max(0, Math.round(best.projectedScore - peer.overall.score));
      bestSwapPercentile = Math.min(100, currentPercentile + gain);
    }
    const data = await buildFirmTrajectory(prisma, companyId, {
      currentPercentile,
      bestSwapPercentile,
      currentIndex: signal.alignmentIndex,
    });
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Trajectory"
        title="Trajectory"
        summary="Your alignment index over time — built from your module-submission history, not sandbox activity — with momentum, a clearly-labelled directional projection, and the single biggest lever to bend it up."
      >
        <FirmTrajectoryCard data={data} rankedAction={peer.bestAction} />
      </EliteCardShell>
    );
  }

  return null;
}

export default async function FirmInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm alignment insight"
        title="Firm alignment insight view requires Pro membership"
        body="This insight view is part of the current Pro firm tier. PAT keeps the route visible so the upgrade path stays explicit, but it does not open the grounded readout until Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm/insights"
        workspaceLabel="Back to firm alignment insights"
        availableNow="The baseline firm state still keeps workspace entry and membership routing available."
        upgradeNote="This page is part of the current firm Pro insight layer grounded in current assessment evidence, so PAT does not open it from the baseline state."
      />
    );
  }

  await ensureFirmAlignmentSystem();

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const { key } = await params;
  const tier1Insight = FIRM_TIER1_INSIGHT_DEFINITIONS.find((item) => item.key === key);
  const tier2Insight = FIRM_TIER2_INSIGHT_DEFINITIONS.find((item) => item.key === key);
  const insight = tier1Insight ?? tier2Insight;
  const content = getFirmInsightContent(key);
  if (!insight) {
    notFound();
  }

  const isTier2 = Boolean(tier2Insight);

  // Elite Insights v1 (Block 3): an Elite member opening a Tier-2 surface gets the
  // real, data-grounded readout; Pro-only members keep the locked "Coming soon".
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE);
  const isElite = eliteEntitlement.allowed;
  if (isTier2 && isElite && sessionUser.companyId) {
    const surface = await renderFirmEliteSurface(key, sessionUser.companyId);
    if (surface) return surface;
  }

  const [unlockedRecords, insightReports] = await Promise.all([
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    getFirmInsightReports(sessionUser.companyId),
  ]);
  const unlockedKeys = new Set(unlockedRecords.map((item) => item.key));
  const unlocked = isTier2 ? false : unlockedKeys.has(key);
  const report = !isTier2 ? insightReports.get(key as (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"]) : null;
  const activeSurface = getRequestedFirmInsightDetailSurface(resolvedSearchParams?.surface);
  const visibleSurfaceKey = activeSurface;

  // Block 12b: a tier-1 Elite pane for an ENTITLED firm is REAL theme-scoped peer
  // depth (percentile band + ranked action), not locked-boundary boilerplate.
  // Pro-only firms fall through and keep the LockedElitePreview grammar below.
  if (!isTier2 && isElite && report && activeSurface === "elite" && sessionUser.companyId) {
    const boundary = await resolveCompanyBoundary(sessionUser.companyId);
    const signal = await getFirmAlignmentSignal(sessionUser.companyId);
    const peer = await buildFirmPeerPosition(prisma, sessionUser.companyId, boundary, signal);
    const depth = buildFirmThemeDepth(
      peer,
      report.contributingModules.map((module) => module.key)
    );
    return <FirmThemeEliteDepthCard data={depth} themeTitle={insight.title} />;
  }

  const surfaceCards = report
    ? buildFirmInsightDetailSurfaceCards({
        insightKey: key,
        report,
        locked: false,
      })
    : buildFirmLockedInsightDetailSurfaceCards({
        insightKey: key,
        summary: content?.lockedState?.summary,
      });
  const toggleOptions = surfaceCards.map((card) => ({
    key: card.key,
    label: card.title,
    href: card.href ?? `/firm/insights/${key}?surface=${card.key}`,
  }));

  const surfaceContent = report
    ? buildFirmInsightDetailSurfaceContent({
        report,
        surface: visibleSurfaceKey,
      })
    : buildFirmLockedInsightDetailSurfaceContent({
        surface: visibleSurfaceKey,
        summary: content?.lockedState?.summary,
        what: content?.lockedState?.what,
        why: content?.lockedState?.why,
        how: content?.lockedState?.how,
        entitled: isElite,
      });

  // Block 12a: the full Pro insight body (headline + module completion + colored
  // module/capability evidence bars + "what this means") is a single shared
  // component rendered here AND inline when a face card expands.
  const scoredModules = report
    ? report.contributingModules.filter((module) => typeof module.score === "number")
    : [];

  let visualLead = null;
  if (report) {
    visualLead = <FirmInsightDetailBody report={report} insightKey={key} />;
  }

  // Block 11 N2: tier-2 copy must be consistent with entitlement — Elite
  // Insights v2 ARE live, so an entitled firm should never see "not available
  // yet", and a Pro firm should see one coherent "available with Elite" message
  // rather than "not available yet" stacked above "Live with Elite membership".
  const combinedEvidenceText = report
    ? unlocked
      ? "Current evidence combines current module results, supporting capability signal, and stored question patterns behind this insight."
      : "Current evidence stays grounded in the current module, capability, and question-pattern signal already visible in this route."
    : isElite
      ? "Your Elite Insights for this view are live, grounded in your firm-reviewed evidence."
      : "This deeper Elite layer becomes available with Elite membership, grounded in your firm-reviewed evidence.";

  return (
    <InsightDetailShell
      activeKey={visibleSurfaceKey}
      eyebrow="Firm alignment insight"
      title={insight.title}
      summary={
        report
          ? report.currentStateSummary
          : isElite
            ? "Your live Elite readout for this view, grounded in your firm-reviewed evidence."
            : (content?.lockedState?.summary ?? "Available with Elite membership.")
      }
      surfaceContent={surfaceContent}
      toggleAriaLabel="Firm alignment insight views"
      toggleOptions={toggleOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={isTier2 && !isElite ? "Available with Elite membership." : undefined}
      muted={isTier2}
      visualLead={visualLead}
      surfaceCollapsed={Boolean(visualLead) && scoredModules.length > 0 && visibleSurfaceKey === "pro"}
    >
      {visibleSurfaceKey === "elite" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Elite Insights</div>
          {isElite ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Your Elite Insights are live — future-state projection, a peer benchmark, and a recommendation
                engine, each grounded in your firm-reviewed evidence.
              </p>
              <Link href="/firm/insights?mode=elite" className="pat-button-secondary mt-4 inline-flex">
                Open Elite Insights
              </Link>
            </>
          ) : (
            <LockedElitePreview
              title={FIRM_ELITE_V2_META[key as keyof typeof FIRM_ELITE_V2_META]?.title ?? insight.title}
              description={
                FIRM_ELITE_V2_META[key as keyof typeof FIRM_ELITE_V2_META]?.description ??
                "A deeper, firm-reviewed Elite readout."
              }
              shape={key === "firm_tier2_projection" ? "line" : key === "firm_tier2_benchmark" ? "distribution" : "bars"}
              upgradeHref={eliteEntitlement.upgradeHref}
            />
          )}
        </section>
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
    </InsightDetailShell>
  );
}
