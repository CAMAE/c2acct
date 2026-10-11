import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import FirmInsightDetailBody from "@/app/components/insights/detail/FirmInsightDetailBody";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildFirmInsightDetailSurfaceContent,
  buildFirmLockedInsightDetailSurfaceContent,
  getFirmInsightReports,
} from "@/lib/firmInsightEngine";
import { getFirmInsightContent } from "@/lib/insightContent";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import prisma from "@/lib/prisma";
import { getAlignmentBoardData } from "@/lib/alignmentBoard";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { buildFirmPeerPosition, buildFirmGapPlan, buildFirmTrajectory, getFirmEvidenceFreshness } from "@/lib/eliteInsightsV2";
import EliteCardShell from "@/app/components/insights/elite/EliteCardShell";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import { FIRM_ELITE_V2_META } from "@/lib/eliteInsightsV2";
import FirmPeerPositionCard from "@/app/components/insights/elite/FirmPeerPositionCard";
import FirmGapPlanCard from "@/app/components/insights/elite/FirmGapPlanCard";
import FirmTrajectoryCard from "@/app/components/insights/elite/FirmTrajectoryCard";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
  FIRM_TIER2_INSIGHT_DEFINITIONS,
  ensureFirmAlignmentSystemMemo,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

/**
 * Elite Insights v2 (verdict §4) — render a firm Tier-2 decision product: F1 Peer
 * Position (firm_tier2_benchmark), F2 Gap Plan (firm_tier2_recommendation),
 * F3 Trajectory (firm_tier2_projection). Rank/percentile + charts, not averages.
 */
async function renderFirmEliteSurface(key: string, companyId: string) {
  const boundary = await resolveCompanyBoundary(companyId);
  // Block 12f: one shared live reader feeds "you" module scores + the alignment
  // index into every Elite surface (peer position, trajectory).
  const signal = await getFirmAlignmentSignal(companyId);

  if (key === "firm_tier2_benchmark") {
    const [data, freshness] = await Promise.all([
      buildFirmPeerPosition(prisma, companyId, boundary, signal),
      getFirmEvidenceFreshness(prisma, companyId),
    ]);
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Peer Position"
        title="Peer Position Report"
        summary="Where your firm ranks against peer firms, module by module: a percentile position, not an average. Cuts below the evidence floor are withheld."
      >
        <FirmPeerPositionCard data={data} freshness={freshness} chartDesign={isNewFrontDoorEnabled() ? "labelled" : "classic"} />
      </EliteCardShell>
    );
  }

  if (key === "firm_tier2_recommendation") {
    const data = await buildFirmGapPlan({ getFirmInsightReports }, companyId);
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Gap Plan"
        title="Gap Plan"
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
    const [data, freshness] = await Promise.all([
      buildFirmTrajectory(prisma, companyId, {
        currentPercentile,
        bestSwapPercentile,
        currentIndex: signal.alignmentIndex,
      }),
      getFirmEvidenceFreshness(prisma, companyId),
    ]);
    return (
      <EliteCardShell
        eyebrow="Firm Elite · Trajectory"
        title="Trajectory"
        summary="Your alignment index over time — built from your module-submission history, not sandbox activity — with momentum, a clearly-labelled projection, and the single biggest lever to bend it up."
      >
        <FirmTrajectoryCard data={data} rankedAction={peer.bestAction} freshness={freshness} />
      </EliteCardShell>
    );
  }

  return null;
}

export default async function FirmInsightDetailPage({ params }: { params: Promise<Params> }) {
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
        body="This insight view is part of the current Pro firm tier. This page stays visible so the upgrade path stays explicit, but it does not open the grounded readout until Pro is active."
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

  await ensureFirmAlignmentSystemMemo();

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

  // Box 3h (R58, Cam 10/01): one surface, no Pro / Elite / Help pill, no ?surface.
  const surfaceContent = report
    ? buildFirmInsightDetailSurfaceContent({ report, surface: "pro" })
    : buildFirmLockedInsightDetailSurfaceContent({
        surface: "pro",
        summary: content?.lockedState?.summary,
        what: content?.lockedState?.what,
        why: content?.lockedState?.why,
        how: content?.lockedState?.how,
      });

  // Block 12a: the full Pro insight body (headline + module completion + colored
  // module/capability evidence bars + "what this means") is a single shared
  // component rendered here AND inline when a face card expands.
  // membership-enterprise box rider (Cam's ruling 10/02): the "Full prose readout" collapse is
  // ruled out; Current limits and Evidence provenance render inline at the end of the full
  // view, the same as the vendor full view after 3h (ops/qa/link-removals.json).
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
      : "Current evidence stays grounded in the current module, capability, and question-pattern signal already visible in this page."
    : isElite
      ? "Your Elite Insights for this view are live, grounded in your firm-reviewed evidence."
      : "This deeper Elite layer becomes available with Elite membership, grounded in your firm-reviewed evidence.";

  return (
    <InsightDetailShell
      audience="firm"
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
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={isTier2 && !isElite ? "Available with Elite membership." : undefined}
      muted={isTier2}
      visualLead={visualLead}
    >
      {isTier2 && !isElite ? (
        // A Pro viewer on a tier-2 key: the honest locked preview (v2 name + blurred chart),
        // never Elite-classified data. Elite viewers never reach here for tier 2.
        <section className="pat-card p-6">
          <LockedElitePreview
            title={FIRM_ELITE_V2_META[key as keyof typeof FIRM_ELITE_V2_META]?.title ?? insight.title}
            description={
              FIRM_ELITE_V2_META[key as keyof typeof FIRM_ELITE_V2_META]?.description ??
              "A deeper, firm-reviewed Elite readout."
            }
            shape={key === "firm_tier2_projection" ? "line" : key === "firm_tier2_benchmark" ? "distribution" : "bars"}
            upgradeHref={eliteEntitlement.upgradeHref}
          />
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
