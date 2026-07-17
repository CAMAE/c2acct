import type { ReactNode } from "react";
import { enforceAudience } from "@/lib/audienceGuard";
import { getSessionUser } from "@/lib/auth/session";
import {
  MEMBERSHIP_PLAN,
  getMembershipUpgradeHref,
  resolveCurrentMembership,
} from "@/lib/membership";
import PortalHeroChips from "@/app/components/pat/PortalHeroChips";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  await enforceAudience("vendor"); // B5-4: wrong-audience accounts redirect to their portal home
  const sessionUser = await getSessionUser();
  const plan = sessionUser
    ? (await resolveCurrentMembership(sessionUser, "vendor")).membership.plan
    : undefined;
  return (
    <>
      <PortalHeroChips
        audience="vendor"
        plan={plan}
        upgradeHref={getMembershipUpgradeHref("vendor", MEMBERSHIP_PLAN.ELITE)}
      />
      {children}
    </>
  );
}
