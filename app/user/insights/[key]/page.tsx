import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { ELITE_PLACEHOLDER_CTA, ELITE_PLACEHOLDER_MESSAGE } from "@/lib/insightContent";
import { buildElitePlaceholderSurfaceContent, buildHelpSurfaceContent } from "@/lib/insightSurface";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  getUserAlignmentProgress,
  getUserInsightDefinition,
  getUserPatContext,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = {
  surface?: string;
};

type SurfaceKey = "help" | "current-evidence" | "next-step";

function getRequestedSurface(rawSurface: string | undefined): SurfaceKey {
  switch (rawSurface?.trim().toLowerCase()) {
    case "current-evidence":
      return "current-evidence";
    case "next-step":
      return "next-step";
    default:
      return "help";
  }
}

function formatDate(value: Date | null | undefined) {
  return value instanceof Date ? value.toLocaleDateString() : "No current submission yet";
}

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
        stagedNote="This route is part of the current Pro layer tied to person-level PAT state, so PAT does not open it from the baseline state."
      />
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [userPatContext, alignmentProgress] = await Promise.all([
    getUserPatContext(sessionUser),
    getUserAlignmentProgress(sessionUser),
  ]);

  const isElite = insight.tier === 2;
  const proAvailable = Boolean(alignmentProgress?.tier1Unlocked);
  const activeSurface = isElite ? "help" : getRequestedSurface(resolvedSearchParams?.surface);
  const surfaceOptions = isElite
    ? [{ key: "help", label: "Help", href: `/user/insights/${key}?surface=help` }]
    : [
        { key: "help", label: "Help", href: `/user/insights/${key}?surface=help` },
        { key: "current-evidence", label: "Current evidence", href: `/user/insights/${key}?surface=current-evidence` },
        { key: "next-step", label: "Next step", href: `/user/insights/${key}?surface=next-step` },
      ];

  const combinedEvidenceText = isElite
    ? "This route remains reserved for a deeper person-level PAT layer that is not available today."
    : `Current evidence combines ${userPatContext?.assessmentCount ?? 0} completed individual alignment submission${userPatContext?.assessmentCount === 1 ? "" : "s"}, the latest recorded score, and the current person-level unlock state behind this view.`;

  const surfaceContent = isElite
    ? buildElitePlaceholderSurfaceContent({
        key: "help",
        title: "Help",
        intro: ELITE_PLACEHOLDER_MESSAGE,
        what: insight.description,
        why: "PAT keeps this route visible so the future person-level intelligence layer is explicit without overstating what exists today.",
        how: ELITE_PLACEHOLDER_CTA,
      })
    : activeSurface === "current-evidence"
      ? {
          key: "current-evidence" as const,
          title: "Current evidence",
          intro: "This view stays grounded in the person-level alignment evidence PAT can support today.",
          items: [
            {
              title: "Available current data",
              body: `Person subject linked: ${userPatContext?.subjectMembershipReady ? "Yes" : "Not yet"}. Alignment submissions: ${userPatContext?.assessmentCount ?? 0}. Latest score: ${userPatContext?.latestScore ?? "--"}. Latest submission: ${formatDate(userPatContext?.latestSubmittedAt)}.`,
            },
            {
              title: "Current access state",
              body: proAvailable
                ? "The current person-level insight layer is open because PAT has a completed individual alignment submission to ground it."
                : "PAT still needs a completed individual alignment submission before this person-level view can carry more grounded interpretation.",
            },
          ],
        }
      : activeSurface === "next-step"
        ? {
            key: "next-step" as const,
            title: "Next step",
            intro: "The next useful step is still the individual alignment assessment and the evidence it creates.",
            items: [
              {
                title: "What to do next",
                body: proAvailable
                  ? "Review the current alignment assessment results and use them to sharpen where your workflow fit or adoption friction needs attention next."
                  : "Complete the individual alignment assessment so PAT has real person-level evidence to work from.",
              },
              {
                title: "What changes after that",
                body: "A stronger person-level layer would require more than completion alone. PAT would also need a deeper individual insight engine before it should claim richer comparison, projection, or coaching behavior.",
              },
            ],
          }
        : buildHelpSurfaceContent({
            intro: proAvailable
              ? "This page gives you a disciplined person-level readout without inventing a deeper individual insight model."
              : "This page stays visible so the route is clear, but a grounded person-level readout still depends on the individual alignment assessment.",
            what: insight.description,
            why: "It keeps the individual surface tied to the person-level evidence PAT actually has instead of generic advice or unsupported projection.",
            how: proAvailable
              ? "Use this page to understand your current work-fit picture, then return to the assessment when you need to refresh the evidence."
              : "Start with the individual alignment assessment so PAT can ground this page in current person-level evidence.",
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
