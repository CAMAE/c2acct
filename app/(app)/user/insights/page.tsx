import Link from "next/link";
import { redirect } from "next/navigation";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { ELITE_PLACEHOLDER_MESSAGE, ELITE_PLACEHOLDER_TITLE } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildUserInsightOverviewState,
  getUserAlignmentProgress,
  getRequestedUserInsightOverviewMode,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

type SearchParams = {
  mode?: string;
};

function getModeHref(mode: "pro" | "elite" | "help") {
  return `/user/insights?mode=${mode}`;
}

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
  const activeMode = getRequestedUserInsightOverviewMode(resolvedSearchParams?.mode);
  const alignmentProgress = await getUserAlignmentProgress(sessionUser);

  const proAvailable = Boolean(alignmentProgress?.tier1Unlocked);
  const insightOverview = buildUserInsightOverviewState({ tier1Unlocked: proAvailable });
  const toggleOptions = [
    { key: "pro", label: "Pro Insights", href: getModeHref("pro") },
    { key: "elite", label: "Elite Insights", href: getModeHref("elite") },
    { key: "help", label: "Help", href: getModeHref("help") },
  ] as const;

  return (
    <InsightsModeShell
      activeMode={activeMode}
      eyebrow="Individual insights"
      title="Individual insights"
      audienceTerms={["Individual"]}
      heroBody="Use this page to review the current person-level PAT readouts that can be supported from your individual alignment submissions today."
      currentStateSummary={insightOverview.currentStateSummary}
      toggleAriaLabel="Individual insight modes"
      toggleOptions={toggleOptions}
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
      helpPanel={{
        title: "Help",
        intro: "Use this page to review the current person-level picture, then open the insight that best matches the work question you need to understand next.",
        infoCards: [
          {
            title: "Pro insights",
            body: "These cards stay tied to person-level alignment evidence only. PAT does not invent a separate individual analysis model beyond the submissions it actually has.",
          },
          {
            title: "Elite insights",
            body: ELITE_PLACEHOLDER_MESSAGE,
            tone: "muted",
            badgeLabel: ELITE_PLACEHOLDER_TITLE,
            badgeTone: "locked",
          },
          {
            title: "Next step",
            body: "The individual alignment assessment remains the current input path that strengthens these readouts and opens more grounded person-level interpretation.",
            actions: (
              <>
                <Link className="pat-button-primary" href="/user/alignment-assessment">
                  {proAvailable ? "Review alignment assessment" : "Start alignment assessment"}
                </Link>
                <Link className="pat-button-secondary" href="/user/help">
                  Review individual help
                </Link>
              </>
            ),
          },
        ],
      }}
    />
  );
}
