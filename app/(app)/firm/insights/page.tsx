import { redirect } from "next/navigation";
import ChartEmptyState from "@/app/components/charts/ChartEmptyState";
import RadarChart from "@/app/components/charts/RadarChart";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import FirmInsightDetailBody from "@/app/components/insights/detail/FirmInsightDetailBody";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import prisma from "@/lib/prisma";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import {
  FIRM_ELITE_V2_META,
  buildFirmPeerPosition,
  buildFirmGapPlan,
  buildFirmTrajectory,
  firmEliteHubMetrics,
} from "@/lib/eliteInsightsV2";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildFirmEliteInsightCards,
  buildFirmProInsightCards,
  getFirmInsightReports,
} from "@/lib/firmInsightEngine";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  ensureFirmAlignmentSystemMemo,
  getFirmAssessmentProgress,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Alignment Insights | Patalign",
  description: "Firm-facing alignment insights grounded in PAT module and capability evidence.",
};

type SearchParams = {
  mode?: string;
  /** R34: card key whose readout opens on load. */
  readout?: string;
};

export default async function FirmInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Box 3h (R58): the hub has no modes; a saved ?mode link lands on the hub itself.
  if (typeof resolvedSearchParams?.mode === "string") {
    redirect("/firm/insights");
  }
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm alignment insights"
        title="Firm alignment insights require Pro membership"
        body="Firm alignment insights are part of the current Pro firm tier. This page stays visible so the membership path stays explicit, but the insight catalog opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm"
        workspaceLabel="Open firm workspace"
        availableNow="The baseline firm state still keeps workspace entry, help, and membership routing available."
        upgradeNote="This catalog is the current Pro packaging layer around firm alignment evidence, so PAT does not open it from the baseline state."
      />
    );
  }

  await ensureFirmAlignmentSystemMemo();

  const [moduleProgress, unlocked, insightReports, alignmentSignal] = await Promise.all([
    getFirmAssessmentProgress(sessionUser.companyId),
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    getFirmInsightReports(sessionUser.companyId),
    getFirmAlignmentSignal(sessionUser.companyId),
  ]);

  const unlockedKeys = new Set(unlocked.map((item) => item.key));
  const completedModules = moduleProgress.filter((module) => module.latestSubmittedAt).length;
  // Block 12a: every Pro face card expands inline into the COMPLETE insight body
  // (same component the detail route renders), not a text-only readout — so all
  // four cards behave identically. "Open full view" still links to the route.
  const proCards = buildFirmProInsightCards({
    reports: insightReports,
    unlockedKeys,
  }).map((card) => {
    const report = insightReports.get(card.key as (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"]);
    return report
      ? { ...card, expandedNode: <FirmInsightDetailBody report={report} insightKey={card.key} /> }
      : card;
  });
  // Block 12c: entitled Elite hub cards carry their own headline number (from the
  // same builders that power each detail surface), restoring firm-standard grammar.
  let eliteCards = buildFirmEliteInsightCards({ elite: eliteEntitlement.allowed });
  if (eliteEntitlement.allowed) {
    const boundary = await resolveCompanyBoundary(sessionUser.companyId);
    const [peer, gapPlan, trajectory] = await Promise.all([
      buildFirmPeerPosition(prisma, sessionUser.companyId, boundary, alignmentSignal),
      buildFirmGapPlan({ getFirmInsightReports }, sessionUser.companyId),
      buildFirmTrajectory(prisma, sessionUser.companyId, { currentIndex: alignmentSignal.alignmentIndex }),
    ]);
    const faces = firmEliteHubMetrics({ peer, gapPlan, trajectory });
    eliteCards = eliteCards.map((card) => {
      const eliteFace = faces[card.key];
      return eliteFace ? { ...card, eliteFace } : card;
    });
  }
  // Box 3f item F (F3): only the zero state renders as a callout; the filler line is gone.
  const currentStateSummary =
    completedModules === 0
      ? "PAT needs completed firm alignment modules before it can open a grounded firm insight readout."
      : undefined;

  // Block 12f: the visible Alignment index reads the ONE shared signal, so it
  // equals the Trajectory face-card "current" and the what-this-means prose.
  const firmIndex = alignmentSignal.alignmentIndex;
  const radarAxes = moduleProgress.map((module) => ({
    key: module.key,
    label: module.title,
    value: module.latestScore,
  }));
  const capabilityByKey = new Map<string, { meetsThreshold: boolean }>();
  for (const report of insightReports.values()) {
    for (const capability of report.contributingCapabilities) {
      const existing = capabilityByKey.get(capability.key);
      capabilityByKey.set(capability.key, {
        meetsThreshold: (existing?.meetsThreshold ?? false) || capability.meetsThreshold,
      });
    }
  }
  const capabilitiesTotal = capabilityByKey.size;
  const capabilitiesMet = Array.from(capabilityByKey.values()).filter(
    (capability) => capability.meetsThreshold
  ).length;
  const radarTitle = `Five-module maturity profile: ${radarAxes
    .map((axis) => `${axis.label} ${typeof axis.value === "number" ? `${Math.round(axis.value)}%` : "not scored"}`)
    .join(", ")}`;

  const operatingPicture = (
    <section className="pat-card p-8">
      <div className="pat-label">Operating brief</div>
      {completedModules === 0 ? (
        <div className="mt-5">
          <ChartEmptyState
            variant="radar"
            message="The maturity profile draws from final module submissions. Complete the first alignment module to open the five-module readout."
            ctaHref="/firm/alignment-assessment"
            ctaLabel="Start the alignment assessment"
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center">
          <div className="grid gap-8 sm:grid-cols-3">
            <ScoreLockup
              label="Alignment index"
              score={firmIndex}
              displayValue={firmIndex === null && completedModules > 0 ? "Partial" : undefined}
              context={firmIndex === null && completedModules > 0 ? `${completedModules} of ${moduleProgress.length} modules scored; the index opens at three` : "Average of your five module scores"}
            />
            <ScoreLockup
              label="Modules complete"
              score={null}
              displayValue={`${completedModules}/${moduleProgress.length}`}
              context="Final submissions across the five PAT modules"
            />
            <ScoreLockup
              label="Capabilities met"
              score={null}
              displayValue={capabilitiesTotal ? `${capabilitiesMet}/${capabilitiesTotal}` : "—"}
              context="Distinct capabilities at or above the 60% unlock threshold"
            />
          </div>
          <RadarChart axes={radarAxes} title={radarTitle} />
        </div>
      )}
    </section>
  );

  return (
    <InsightsModeShell
      initialReadoutKey={typeof resolvedSearchParams?.readout === "string" ? resolvedSearchParams.readout : null}
      audience="firm"
      eyebrow="Firm alignment insights"
      title={messages.insights.firm.heroTitle}
      helpHref="/firm?panel=help"
      audienceTerms={["Firm"]}
      heroBody={messages.insights.firm.heroBody}
      currentStateSummary={currentStateSummary}
      heroSupplement={operatingPicture}
      proPanel={{
        title: messages.insights.firm.proTitle,
        intro: messages.insights.firm.proBody,
        cards: proCards,
        columnsClassName: "md:grid-cols-2",
      }}
      elitePanel={{
        title: messages.insights.firm.eliteTitle,
        intro: eliteEntitlement.allowed
          ? "Live with your Elite membership. Open any card for the grounded readout built from your firm-reviewed evidence."
          : messages.insights.firm.eliteBody,
        // B9c: Elite members see the live cards; Pro sees one honest
        // LockedElitePreview per surface (v2 name + blurred chart).
        cards: eliteEntitlement.allowed ? eliteCards : undefined,
        lockedPreviews: eliteEntitlement.allowed
          ? undefined
          : [
              {
                title: FIRM_ELITE_V2_META.firm_tier2_benchmark.title,
                description: FIRM_ELITE_V2_META.firm_tier2_benchmark.description,
                shape: "distribution" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
              {
                title: FIRM_ELITE_V2_META.firm_tier2_recommendation.title,
                description: FIRM_ELITE_V2_META.firm_tier2_recommendation.description,
                shape: "bars" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
              {
                title: FIRM_ELITE_V2_META.firm_tier2_projection.title,
                description: FIRM_ELITE_V2_META.firm_tier2_projection.description,
                shape: "line" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
            ],
        columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
      }}
    />
  );
}
