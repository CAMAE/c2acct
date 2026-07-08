import { notFound, redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import VendorSalesCardClient from "@/app/components/vendor/VendorSalesCardClient";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorSalesCardData, isSalesCardEnabled } from "@/lib/salesCard";
import {
  getConsultantAccessStateForUser,
  requireConsultantCompanyAccess,
} from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Card | Patalign",
  description: "Elite vendor Sales Card — the firms in your ecosystem, ranked by fit.",
};

type SearchParams = { vendor?: string };

/** Elite "Coming soon" placeholder shown while PAT_ENABLE_SALES_CARD is off. */
function ComingSoon() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6 flex items-center gap-2">
          Sales Card
          <span className="rounded-full bg-[var(--shell-panel-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
            Coming soon
          </span>
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          The firms in your ecosystem, ranked by fit
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The Sales Card ranks the firms in your ecosystem by how well your product strengths close
          their current gaps — one claim, one evidence line, one next action per firm. This Elite
          surface is unlocked for your vendor account; the ranked cards are landing shortly.
        </p>
      </section>
    </div>
  );
}

export default async function VendorSalesCardPage({
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
  if (!isSalesCardEnabled()) {
    if (readOnlyConsultant) {
      return <ComingSoon />;
    }
    const entitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.ELITE);
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="vendor"
          surfaceLabel="Sales Card"
          title="The Sales Card is an Elite feature"
          body="The Sales Card ranks the firms in your ecosystem by fit and shows where your products close their gaps. PAT keeps this route visible so the upgrade path stays explicit, but the ranked cards open only with Elite membership."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          stagedNote="The Sales Card is the Elite packaging layer around your ecosystem's firm signal, so PAT does not open it from a Pro tier."
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
          surfaceLabel="Sales Card"
          title="The Sales Card needs Pro membership"
          body="The Sales Card is part of the paid vendor tiers. PAT keeps this route visible so the membership path stays explicit; the ranked cards open once Pro is active, and Elite reveals the firm names."
          displayName={proEntitlement.membership.displayName}
          currentPlan={proEntitlement.membership.plan}
          currentStatus={proEntitlement.membership.status}
          requiredPlan={proEntitlement.requiredPlan}
          membershipHref={proEntitlement.membershipHref}
          upgradeHref={proEntitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          stagedNote="The Sales Card is the paid packaging layer around your ecosystem's firm signal."
        />
      );
    }
    membershipHref = proEntitlement.membershipHref;
    const eliteEntitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.ELITE);
    entitled = eliteEntitlement.allowed;
  }

  const data = await getVendorSalesCardData(vendorCompanyId);
  if (!data) {
    notFound();
  }

  return <VendorSalesCardClient data={data} entitled={entitled} membershipHref={membershipHref} />;
}
