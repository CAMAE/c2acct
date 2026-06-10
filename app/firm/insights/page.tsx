import { redirect } from "next/navigation";
import ChartEmptyState from "@/app/components/charts/ChartEmptyState";
import RadarChart from "@/app/components/charts/RadarChart";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildFirmEliteInsightCards,
  buildFirmProInsightCards,
  getFirmInsightReports,
  getRequestedFirmInsightOverviewMode,
} from "@/lib/firmInsightEngine";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  ensureFirmAlignmentSystem,
  getFirmAssessmentProgress,
} from "@/lib/firmPat";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Alignment Insights | C2Acct",
  description: "Firm-facing alignment insights grounded in PAT module and capability evidence.",
};

type SearchParams = {
  mode?: string;
};

function getModeHref(mode: "pro" | "elite" | "help") {
  return `/firm/insights?mode=${mode}`;
}

export default async function FirmInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm alignment insights"
        title="Firm alignment insights require Pro membership"
        body="Firm alignment insights are part of the current Pro firm tier. PAT keeps this route visible so the membership path stays explicit, but the insight catalog opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm"
        workspaceLabel="Open firm workspace"
        availableNow="The baseline firm state still keeps workspace entry, help, and membership routing available."
        stagedNote="This catalog is the current Pro packaging layer around firm alignment evidence, so PAT does not open it from the baseline state."
      />
    );
  }

  await ensureFirmAlignmentSystem();

  const [moduleProgress, unlocked, insightReports] = await Promise.all([
    getFirmAssessmentProgress(sessionUser.companyId),
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    getFirmInsightReports(sessionUser.companyId),
  ]);

  const unlockedKeys = new Set(unlocked.map((item) => item.key));
  const activeMode = getRequestedFirmInsightOverviewMode(resolvedSearchParams?.mode);
  const completedModules = moduleProgress.filter((module) => module.latestSubmittedAt).length;
  const proCards = buildFirmProInsightCards({
    reports: insightReports,
    unlockedKeys,
  });
  const eliteCards = buildFirmEliteInsightCards();
  const toggleOptions = [
    { key: "pro", label: "Pro Insights", href: getModeHref("pro") },
    { key: "elite", label: "Elite Insights", href: getModeHref("elite") },
    { key: "help", label: "Help", href: getModeHref("help") },
  ] as const;

  const currentStateSummary =
    completedModules === 0
      ? "PAT needs completed firm alignment modules before it can open a grounded firm insight readout."
      : "PAT is summarizing current firm alignment and product-review evidence so you can review the operating picture in one place.";

  const moduleScores = moduleProgress
    .map((module) => module.latestScore)
    .filter((score): score is number => typeof score === "number");
  const alignmentIndex = moduleScores.length
    ? Math.round(moduleScores.reduce((sum, score) => sum + score, 0) / moduleScores.length)
    : null;
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
      <div className="pat-label">Current operating picture</div>
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
              score={alignmentIndex}
              context="Average of final module scores · current-state evidence only"
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
      activeMode={activeMode}
      eyebrow="Firm alignment insights"
      title={messages.insights.firm.heroTitle}
      audienceTerms={["Firm"]}
      heroBody={messages.insights.firm.heroBody}
      currentStateSummary={currentStateSummary}
      heroSupplement={activeMode === "pro" ? operatingPicture : undefined}
      toggleAriaLabel="Firm alignment insight modes"
      toggleOptions={toggleOptions}
      proPanel={{
        title: messages.insights.firm.proTitle,
        intro: messages.insights.firm.proBody,
        cards: proCards,
        columnsClassName: "md:grid-cols-2",
      }}
      elitePanel={{
        title: messages.insights.firm.eliteTitle,
        intro: messages.insights.firm.eliteBody,
        cards: eliteCards,
        columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
      }}
      helpPanel={{
        title: "Help",
        intro: "Use this page to review the current firm-side operating picture, then open the insight that best matches the decision you need to make next.",
        infoCards: [
          {
            title: "Pro insights",
            body: "Open these cards for grounded current-state readouts built from current module, capability, and question-pattern evidence.",
          },
          {
            title: "Elite insights",
            body: "Coming soon. Unlock with Elite membership.",
            tone: "muted",
            badgeLabel: "Coming soon",
            badgeTone: "locked",
          },
          {
            title: "How to use it",
            body: "Start with the insight that matches your biggest current operating question, then use the insight page to review the grounded Pro evidence or the Help view in simpler PAT language.",
          },
        ],
      }}
    />
  );
}
