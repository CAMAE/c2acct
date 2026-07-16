import { notFound, redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import VendorBattleCardClient from "@/app/components/vendor/VendorBattleCardClient";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorBattleCardData, isBattleCardEnabled } from "@/lib/battleCard";
import {
  getConsultantAccessStateForUser,
  requireConsultantCompanyAccess,
} from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "BattleCard | Patalign",
  description: "Elite vendor BattleCard — the firms in your ecosystem, ranked by fit.",
};

type SearchParams = { vendor?: string };

/** Elite "Coming soon" placeholder shown while PAT_ENABLE_BATTLECARD is off. */
function ComingSoon() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6 flex items-center gap-2">
          BattleCard
          <span className="rounded-full bg-[var(--shell-panel-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            Coming soon
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          The firms in your ecosystem, ranked by fit
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The BattleCard ranks the firms in your ecosystem by how well your product strengths close
          their current gaps — one claim, one evidence line, one next action per firm. This Elite
          surface is unlocked for your vendor account; the ranked cards are landing shortly.
        </p>
      </section>
    </div>
  );
}

export default async function VendorBattleCardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();

  // --- Resolve the target vendor + read-only consultant bypass (tenancy FIRST) ---
  const vendorParam = params?.vendor?.trim() || null;
  const consultant = await getConsultantAccessStateForUser(sessionUser);

  let vendorCompanyId: string;
  let readOnlyConsultant = false;
  if (vendorParam && consultant) {
    const allowed = await requireConsultantCompanyAccess(vendorParam, "/consultants");
    if (!allowed) {
      notFound();
    }
    vendorCompanyId = vendorParam;
    readOnlyConsultant = true;
  } else {
    if (!sessionUser?.companyId) {
      redirect("/sign-in/vendor");
    }
    vendorCompanyId = sessionUser.companyId;
  }

  // --- Flag off: Elite-gated "Coming soon" placeholder (dark by default) ---
  if (!isBattleCardEnabled()) {
    if (readOnlyConsultant) {
      return <ComingSoon />;
    }
    const entitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.ELITE);
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="vendor"
          surfaceLabel="BattleCard"
          title="The BattleCard is an Elite feature"
          body="The BattleCard ranks the firms in your ecosystem by fit and shows where your products close their gaps. PAT keeps this route visible so the upgrade path stays explicit, but the ranked cards open only with Elite membership."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          upgradeNote="The BattleCard is the Elite packaging layer around your ecosystem's firm signal, so PAT does not open it from a Pro tier."
        />
      );
    }
    return <ComingSoon />;
  }

  // --- Flag on: live ranked cards with the entitlement split ---
  let entitled: boolean;
  let membershipHref = "/vendor/membership";
  if (readOnlyConsultant) {
    entitled = true;
  } else {
    const proEntitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.PRO);
    if (!proEntitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="vendor"
          surfaceLabel="BattleCard"
          title="The BattleCard needs Pro membership"
          body="The BattleCard is part of the paid vendor tiers. PAT keeps this route visible so the membership path stays explicit; the ranked cards open once Pro is active, and Elite reveals the firm names."
          displayName={proEntitlement.membership.displayName}
          currentPlan={proEntitlement.membership.plan}
          currentStatus={proEntitlement.membership.status}
          requiredPlan={proEntitlement.requiredPlan}
          membershipHref={proEntitlement.membershipHref}
          upgradeHref={proEntitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          upgradeNote="The BattleCard is the paid packaging layer around your ecosystem's firm signal."
        />
      );
    }
    membershipHref = proEntitlement.membershipHref;
    const eliteEntitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.ELITE);
    entitled = eliteEntitlement.allowed;
  }

  const data = await getVendorBattleCardData(vendorCompanyId);
  if (!data) {
    notFound();
  }

  return <VendorBattleCardClient data={data} entitled={entitled} membershipHref={membershipHref} />;
}
