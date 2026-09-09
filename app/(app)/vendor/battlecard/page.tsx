import { notFound, redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import type { HeroAudience } from "@/app/components/pat/HeroChipsView";
import VendorBattleCardClient from "@/app/components/vendor/VendorBattleCardClient";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorBattleCardData, isBattleCardEnabled } from "@/lib/battleCard";
import LockedSurfaceVeil from "@/app/components/membership/LockedSurfaceVeil";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

const DEMO_VENDOR_COMPANY_ID = "demo-vendor-company-pat-demo-vendor";
import {
  getConsultantAccessStateForUser,
  requireConsultantCompanyAccess,
} from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Product Fit Card | Patalign",
  description: "Elite vendor Product Fit Card — the firms in your ecosystem, ranked by fit.",
};

type SearchParams = { vendor?: string };

/**
 * Honest-empty BattleCard hero (B3, Mythos 16a rider). BattleCard is a live
 * Elite surface — the copy never promises a future arrival ("coming soon" /
 * "landing shortly" is false wherever it renders). It states plainly that no
 * reviewed firms are in the ecosystem yet and what fills the ranking.
 */
function EmptyBattleCard({ audience }: { audience: HeroAudience }) {
  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8">
        <HeroChips audience={audience} />
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">Product Fit Card</div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          The firms in your ecosystem, ranked by fit
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The Product Fit Card ranks the firms in your ecosystem by how well your product strengths close
          their current gaps — one claim, one evidence line, one next action per firm. No reviewed
          firms in your ecosystem yet; ranked cards appear as firms complete their alignment
          assessments.
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

  // --- Flag off (dark by default): honest-empty hero for entitled callers,
  //     membership gate for Pro-only. Never "coming soon" — the feature is live. ---
  if (!isBattleCardEnabled()) {
    if (readOnlyConsultant) {
      return <EmptyBattleCard audience="consultant" />;
    }
    const entitlement = await resolveMembershipEntitlement(sessionUser!, "vendor", MEMBERSHIP_PLAN.ELITE);
    if (!entitlement.allowed && isNewFrontDoorEnabled()) {
      // Depth box 3: the real Product Fit Card (own values, demo vendor when none) behind a veil.
      const previewData =
        (await getVendorBattleCardData(vendorCompanyId)) ?? (await getVendorBattleCardData(DEMO_VENDOR_COMPANY_ID));
      return (
        <div className="space-y-8">
          {previewData ? (
            <LockedSurfaceVeil
              surfaceLabel="Product Fit Card"
              unlocks={[
                "The firms in your ecosystem ranked by how well your product strengths close their current gaps",
                "One claim, one evidence line and one next action per firm",
                "The per-firm strengths and gaps anatomy behind each rank",
              ]}
              price="Ecosystem license · contact us"
              upgradeHref={entitlement.upgradeHref}
              membershipHref={entitlement.membershipHref}
            >
              <VendorBattleCardClient data={previewData} entitled={false} membershipHref={entitlement.membershipHref} />
            </LockedSurfaceVeil>
          ) : (
            <EmptyBattleCard audience="vendor" />
          )}
        </div>
      );
    }
    if (!entitlement.allowed) {
      return (
        <MembershipSurfaceGate
          audience="vendor"
          surfaceLabel="Product Fit Card"
          title="The Product Fit Card is an Elite feature"
          body="The Product Fit Card ranks the firms in your ecosystem by fit and shows where your products close their gaps. PAT keeps this route visible so the upgrade path stays explicit, but the ranked cards open only with Elite membership."
          displayName={entitlement.membership.displayName}
          currentPlan={entitlement.membership.plan}
          currentStatus={entitlement.membership.status}
          requiredPlan={entitlement.requiredPlan}
          membershipHref={entitlement.membershipHref}
          upgradeHref={entitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          upgradeNote="The Product Fit Card is the Elite packaging layer around your ecosystem's firm signal, so PAT does not open it from a Pro tier."
        />
      );
    }
    return <EmptyBattleCard audience="vendor" />;
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
          surfaceLabel="Product Fit Card"
          title="The Product Fit Card needs Pro membership"
          body="The Product Fit Card is part of the paid vendor tiers. PAT keeps this route visible so the membership path stays explicit; the ranked cards open once Pro is active, and Elite reveals the firm names."
          displayName={proEntitlement.membership.displayName}
          currentPlan={proEntitlement.membership.plan}
          currentStatus={proEntitlement.membership.status}
          requiredPlan={proEntitlement.requiredPlan}
          membershipHref={proEntitlement.membershipHref}
          upgradeHref={proEntitlement.upgradeHref}
          workspaceHref="/vendor"
          workspaceLabel="Open vendor workspace"
          availableNow="Your current tier keeps the vendor workspace, product insight, and membership routing available."
          upgradeNote="The Product Fit Card is the paid packaging layer around your ecosystem's firm signal."
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

  return (
    <VendorBattleCardClient
      data={data}
      entitled={entitled}
      membershipHref={membershipHref}
      heroChips={<HeroChips audience={readOnlyConsultant ? "consultant" : "vendor"} />}
    />
  );
}
