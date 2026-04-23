import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import {
  buildFirmInsightDetailSurfaceCards,
  buildFirmInsightDetailSurfaceContent,
  getFirmInsightReports,
  getRequestedFirmInsightDetailSurface,
} from "@/lib/firmInsightEngine";
import { getFirmInsightContent } from "@/lib/insightContent";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { buildHelpSurfaceContent } from "@/lib/insightSurface";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
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
        stagedNote="This page is part of the current firm Pro insight layer grounded in current assessment evidence, so PAT does not open it from the baseline state."
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

  const [unlockedRecords, insightReports] = await Promise.all([
    evaluateUnlocked({ companyId: sessionUser.companyId }),
    getFirmInsightReports(sessionUser.companyId),
  ]);
  const unlockedKeys = new Set(unlockedRecords.map((item) => item.key));
  const isTier2 = Boolean(tier2Insight);
  const unlocked = isTier2 ? false : unlockedKeys.has(key);
  const report = !isTier2 ? insightReports.get(key as (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"]) : null;
  const activeSurface = getRequestedFirmInsightDetailSurface(resolvedSearchParams?.surface);
  const visibleSurfaceKey = report ? activeSurface : "help";

  const surfaceCards = report
    ? buildFirmInsightDetailSurfaceCards({
        insightKey: key,
        report,
        locked: false,
      })
    : [
        {
          key: "help" as const,
          title: "Help",
          summary: content?.lockedState?.summary ?? "Coming soon.",
          href: `/firm/insights/${key}?surface=help`,
          interactive: true,
        },
      ];
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
    : buildHelpSurfaceContent({
        intro: content?.lockedState?.summary ?? "Coming soon.",
        what: content?.lockedState?.what ?? "A restricted Elite insight reserved for a deeper PAT layer.",
        why: content?.lockedState?.why ?? "PAT keeps this route visible so the future intelligence layer is explicit.",
        how: content?.lockedState?.how ?? "Unlock with Elite membership.",
      });

  const combinedEvidenceText = report
    ? unlocked
      ? "Current evidence combines current module results, supporting capability signal, and stored question patterns behind this insight."
      : "Current evidence stays grounded in the current module, capability, and question-pattern signal already visible in this route."
    : "This route remains reserved for a deeper PAT layer that is not available yet.";

  return (
    <InsightDetailShell
      activeKey={visibleSurfaceKey}
      eyebrow="Firm alignment insight"
      title={insight.title}
      summary={
        report
          ? report.currentStateSummary
          : (content?.lockedState?.summary ?? "Coming soon. Unlock with Elite membership.")
      }
      surfaceContent={surfaceContent}
      toggleAriaLabel="Firm alignment insight views"
      toggleOptions={toggleOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={isTier2 ? "Coming soon. Unlock with Elite membership." : undefined}
      muted={isTier2}
    >
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
