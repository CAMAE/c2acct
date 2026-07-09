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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alignment Board | Patalign",
  description: "Elite firm Alignment Board — the interactive stack-and-swap forecaster.",
};

type SearchParams = { firm?: string };

/** Elite "Coming soon" placeholder shown while PAT_ENABLE_ALIGNMENT_BOARD is off. */
function ComingSoon() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6 flex items-center gap-2">
          Alignment Board
          <span className="rounded-full bg-[var(--shell-panel-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            Coming soon
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Your stack, as a board you can play with
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Your current products will render as pieces, each carrying its live alignment score. A
          product-fit radar plots your stack across five evidence-backed dimensions. Swap a piece for
          a candidate and watch your projected shape recompute — with a confidence band whenever the
          sample is thin. This Elite surface is unlocked for your firm; the interactive board is
          landing shortly.
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

  // --- Flag off: Elite-gated "Coming soon" placeholder (dark by default) ---
  if (!isAlignmentBoardEnabled()) {
    if (readOnlyConsultant) {
      return <ComingSoon />;
    }
    const entitlement = await resolveMembershipEntitlement(sessionUser!, "firm", MEMBERSHIP_PLAN.ELITE);
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="firm"
          surfaceLabel="Alignment Board"
          title="The Alignment Board is an Elite feature"
          body="The Alignment Board lays your current stack out as pieces you can swap to see projected firm alignment recompute in front of you. PAT keeps this route visible so the upgrade path stays explicit, but the board opens only with Elite membership."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/firm"
          workspaceLabel="Open firm workspace"
          availableNow="Your current tier keeps the firm workspace, insights, and membership routing available."
          stagedNote="The Alignment Board is the Elite packaging layer around your live alignment evidence, so PAT does not open it from a Pro tier."
        />
      );
    }
    return <ComingSoon />;
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
          surfaceLabel="Alignment Board"
          title="The Alignment Board needs Pro membership"
          body="The Alignment Board is part of the paid firm tiers. PAT keeps this route visible so the membership path stays explicit; the board opens once Pro is active, and Elite reveals the candidate product names."
          displayName={proEntitlement.membership.displayName}
          currentPlan={proEntitlement.membership.plan}
          currentStatus={proEntitlement.membership.status}
          requiredPlan={proEntitlement.requiredPlan}
          membershipHref={proEntitlement.membershipHref}
          upgradeHref={proEntitlement.upgradeHref}
          workspaceHref="/firm"
          workspaceLabel="Open firm workspace"
          availableNow="Your current tier keeps the firm workspace, insights, and membership routing available."
          stagedNote="The Alignment Board is the paid packaging layer around your live alignment evidence."
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

  return <AlignmentBoardClient data={data} entitled={entitled} membershipHref={membershipHref} />;
}
