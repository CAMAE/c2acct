import { redirect } from "next/navigation";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { ELITE_PLACEHOLDER_MESSAGE } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildUserInsightOverviewState,
  getUserAlignmentProgress,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

type SearchParams = {
  mode?: string;
};

export default async function UserInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/user");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "individual", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="individual"
        surfaceLabel="Individual insights"
        title="Individual insights require Pro membership"
        body="The current individual insight route is part of the current Pro individual tier. PAT keeps the route visible so the membership path stays explicit, but the insight surface opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/user"
        workspaceLabel="Open individual workspace"
        availableNow="The baseline individual state still keeps workspace entry, help, profile continuity, and membership routing available."
        upgradeNote="This route is the current Pro packaging layer around person-level PAT state, so PAT does not open it from the baseline state."
      />
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Box 3h (R58): the hub has no modes; a saved ?mode link lands on the hub itself.
  if (typeof resolvedSearchParams?.mode === "string") {
    redirect("/user/insights");
  }
  const alignmentProgress = await getUserAlignmentProgress(sessionUser);

  const proAvailable = Boolean(alignmentProgress?.tier1Unlocked);
  const insightOverview = buildUserInsightOverviewState({ tier1Unlocked: proAvailable });
  return (
    <InsightsModeShell
      eyebrow="Individual insights"
      title="Individual insights"
      helpHref="/user?panel=help"
      audienceTerms={["Individual"]}
      heroBody="Use this page to review the current person-level PAT readouts that can be supported from your individual alignment submissions today."
      currentStateSummary={insightOverview.currentStateSummary}
      proPanel={{
        title: "Pro Insights",
        intro: "Open these cards for current person-level readouts tied to the alignment evidence PAT can support today.",
        cards: insightOverview.proCards,
        columnsClassName: "md:grid-cols-2",
      }}
      elitePanel={{
        title: "Elite Insights",
        intro: ELITE_PLACEHOLDER_MESSAGE,
        cards: insightOverview.eliteCards,
        columnsClassName: "md:grid-cols-2",
      }}
    />
  );
}
