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

export default async function FirmLayout({ children }: { children: ReactNode }) {
  await enforceAudience("firm"); // B5-4: wrong-audience accounts redirect to their portal home
  const sessionUser = await getSessionUser();
  const plan = sessionUser
    ? (await resolveCurrentMembership(sessionUser, "firm")).membership.plan
    : undefined;
  return (
    <>
      <PortalHeroChips
        audience="firm"
        plan={plan}
        upgradeHref={getMembershipUpgradeHref("firm", MEMBERSHIP_PLAN.ELITE)}
      />
      {children}
    </>
  );
}
