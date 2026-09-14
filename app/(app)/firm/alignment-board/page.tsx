import { notFound, redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import AlignmentBoardClient from "@/app/components/firm/AlignmentBoardClient";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getAlignmentBoardData, isAlignmentBoardEnabled } from "@/lib/alignmentBoard";
import {
  getConsultantAccessStateForUser,
  requireConsultantCompanyAccess,
} from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { boardLabel, sandboxLabel } from "@/lib/sandboxLabel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${boardLabel()} | Patalign`,
  description: `Elite firm ${boardLabel()} — the interactive stack-and-swap forecaster.`,
};

type SearchParams = { firm?: string };

/**
 * Honest-empty Alignment Board hero (B3, Mythos 16a rider). The board is a live
 * Elite surface — the copy never promises a future arrival. It describes the
 * board and states plainly what populates it.
 */
function EmptyAlignmentBoard() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{boardLabel()}</div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Your stack, as a board you can play with
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Your current products render as pieces, each carrying its live alignment score. A
          product-fit radar plots your stack across five evidence-backed dimensions. Swap a piece for
          a candidate and watch your projected shape recompute — with a confidence band whenever the
          sample is thin. The board appears once your firm has completed its alignment assessment and
          has products in its stack.
        </p>
      </section>
    </div>
  );
}

export default async function FirmAlignmentBoardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();

  // --- Resolve the target firm + read-only consultant bypass (tenancy FIRST) ---
  const firmParam = params?.firm?.trim() || null;
  const consultant = await getConsultantAccessStateForUser(sessionUser);

  let firmCompanyId: string;
  let readOnlyConsultant = false;
  if (firmParam && consultant) {
    // Consultant read-only view of a scoped firm. Cross-tenant probe → 404.
    const allowed = await requireConsultantCompanyAccess(firmParam, "/consultants");
    if (!allowed) {
      notFound();
    }
    firmCompanyId = firmParam;
    readOnlyConsultant = true;
  } else {
    if (!sessionUser?.companyId) {
      redirect("/sign-in/firm");
    }
    firmCompanyId = sessionUser.companyId;
  }

  // --- Flag off (dark by default): honest-empty hero for entitled callers,
  //     membership gate for Pro-only. Never "coming soon" — the board is live. ---
  if (!isAlignmentBoardEnabled()) {
    if (readOnlyConsultant) {
      return <EmptyAlignmentBoard />;
    }
    const entitlement = await resolveMembershipEntitlement(sessionUser!, "firm", MEMBERSHIP_PLAN.ELITE);
    // R1 (box 2, 2026-09-11): the Depth-3 veil ("What Elite unlocks here" over
    // a blurred board) is reversed. With the board flag on — production's
    // value — Pro gets the playable teaser board below (Secret Product
    // candidates, "Reveal with Elite" on names only); with it off, the
    // membership gate that production's code carries.
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="firm"
          surfaceLabel={boardLabel()}
          title={`The ${boardLabel()} is an Elite feature`}
          body={`The ${boardLabel()} lays your current stack out as pieces you can swap to see projected firm alignment recompute in front of you. PAT keeps this route visible so the upgrade path stays explicit, but the board opens only with Elite membership.`}
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/firm"
          workspaceLabel="Open firm workspace"
          availableNow="Your current tier keeps the firm workspace, insights, and membership routing available."
          upgradeNote={`The ${boardLabel()} is the Elite packaging layer around your live alignment evidence, so PAT does not open it from a Pro tier.`}
        />
      );
    }
    return <EmptyAlignmentBoard />;
  }

  // --- Flag on: live board with the entitlement split ---
  let entitled: boolean;
  let membershipHref = "/firm/membership";
  if (readOnlyConsultant) {
    // Managing consultant sees real names read-only (bypass, as usual).
    entitled = true;
  } else {
    // Board entry requires Pro; name reveal requires Elite. Pro sees the teaser.
    const proEntitlement = await resolveMembershipEntitlement(sessionUser!, "firm", MEMBERSHIP_PLAN.PRO);
    if (!proEntitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="firm"
          surfaceLabel={boardLabel()}
          title={`The ${boardLabel()} needs Pro membership`}
          body={`The ${boardLabel()} is part of the paid firm tiers. PAT keeps this route visible so the membership path stays explicit; the board opens once Pro is active, and Elite reveals the candidate product names.`}
          displayName={proEntitlement.membership.displayName}
          currentPlan={proEntitlement.membership.plan}
          currentStatus={proEntitlement.membership.status}
          requiredPlan={proEntitlement.requiredPlan}
          membershipHref={proEntitlement.membershipHref}
          upgradeHref={proEntitlement.upgradeHref}
          workspaceHref="/firm"
          workspaceLabel="Open firm workspace"
          availableNow="Your current tier keeps the firm workspace, insights, and membership routing available."
          upgradeNote={`The ${boardLabel()} is the paid packaging layer around your live alignment evidence.`}
        />
      );
    }
    membershipHref = proEntitlement.membershipHref;
    const eliteEntitlement = await resolveMembershipEntitlement(sessionUser!, "firm", MEMBERSHIP_PLAN.ELITE);
    entitled = eliteEntitlement.allowed;
  }

  const data = await getAlignmentBoardData(firmCompanyId);
  if (!data) {
    notFound();
  }

  return <AlignmentBoardClient data={data} entitled={entitled} membershipHref={membershipHref} sandboxLabel={sandboxLabel()} />;
}
