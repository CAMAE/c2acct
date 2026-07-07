import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Alignment Board | Patalign",
  description: "Elite firm Alignment Board — the interactive stack-and-swap forecaster.",
};

/**
 * Firm Alignment Board (Elite Sprint Block C — the first real ELITE-gated
 * surface). Today it is the entitlement gate plus an Elite "Coming soon"
 * placeholder; Block D lands the interactive board behind this gate (flag
 * PAT_ENABLE_ALIGNMENT_BOARD). Establishing the ELITE code path here means
 * Block D only has to fill the entitled branch — the tenancy + entitlement
 * boundary is already proven.
 */
export default async function FirmAlignmentBoardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }

  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE);
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

  // Entitled Elite firm: the interactive board lands in Block D behind
  // PAT_ENABLE_ALIGNMENT_BOARD. Until then, an honest Coming-soon placeholder.
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
          Your current products will render as pieces, each carrying its live alignment score against
          your firm&rsquo;s five-module shape. Swap a piece for a candidate and watch your projected
          alignment recompute — with a confidence band whenever the sample is thin, never faked
          precision. This Elite surface is unlocked for your firm; the interactive board is landing
          shortly.
        </p>
      </section>
    </div>
  );
}
