import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { ELITE_PLACEHOLDER_MESSAGE } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildUserCombinedEvidenceText,
  buildUserInsightDetailSurfaceContent,
  getUserAlignmentProgress,
  getUserInsightDefinition,
  getUserPatContext,
  getRequestedUserInsightDetailSurface,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = {
  surface?: string;
};

export default async function UserInsightPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { key } = await params;
  const insight = getUserInsightDefinition(key);
  if (!insight) {
    notFound();
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/user");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "individual", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="individual"
        surfaceLabel="Individual insight"
        title="Individual insight requires Pro membership"
        body="This insight route is part of the current Pro individual tier. PAT keeps the route visible so the upgrade path stays explicit, but the grounded readout opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/user/insights"
        workspaceLabel="Back to individual insights"
        availableNow="The baseline individual state still keeps workspace entry and membership routing available."
        upgradeNote="This route is part of the current Pro layer tied to person-level PAT state, so PAT does not open it from the baseline state."
      />
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [userPatContext, alignmentProgress] = await Promise.all([
    getUserPatContext(sessionUser),
    getUserAlignmentProgress(sessionUser),
  ]);

  const isElite = insight.tier === 2;
  const activeSurface = isElite ? "help" : getRequestedUserInsightDetailSurface(resolvedSearchParams?.surface);
  const surfaceOptions = isElite
    ? [{ key: "help", label: "Help", href: `/user/insights/${key}?surface=help` }]
    : [
        { key: "help", label: "Help", href: `/user/insights/${key}?surface=help` },
        { key: "current-evidence", label: "Current evidence", href: `/user/insights/${key}?surface=current-evidence` },
        { key: "next-step", label: "Next step", href: `/user/insights/${key}?surface=next-step` },
      ];

  const combinedEvidenceText = buildUserCombinedEvidenceText({ insight, userPatContext });
  const surfaceContent = buildUserInsightDetailSurfaceContent({
    insight,
    userPatContext,
    alignmentProgress,
    surface: activeSurface,
  });

  return (
    <InsightDetailShell
      activeKey={activeSurface}
      eyebrow="Individual insight"
      title={insight.title}
      summary={
        isElite
          ? ELITE_PLACEHOLDER_MESSAGE
          : `${insight.description} PAT keeps this view tied to current person-level evidence rather than a fabricated deeper individual engine.`
      }
      surfaceContent={surfaceContent}
      toggleAriaLabel="Individual insight views"
      toggleOptions={surfaceOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={isElite ? ELITE_PLACEHOLDER_MESSAGE : undefined}
      muted={isElite}
    />
  );
}
