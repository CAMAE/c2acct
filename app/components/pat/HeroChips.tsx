import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, getMembershipUpgradeHref, resolveCurrentMembership } from "@/lib/membership";
import { HeroChipsView, type HeroAudience } from "@/app/components/pat/HeroChipsView";

/**
 * Block 14a/b/c — async server wrapper that resolves the current membership and
 * renders HeroChipsView pinned to the top-right corner of a portal hero card.
 * Render as the FIRST child of a `relative` hero container:
 *   <section className="pat-card relative p-8"><HeroChips audience="firm" /> … </section>
 */
export default async function HeroChips({ audience }: { audience: HeroAudience }) {
  if (audience === "consultant") {
    return <HeroChipsView audience="consultant" />;
  }
  const sessionUser = await getSessionUser();
  const plan = sessionUser
    ? (await resolveCurrentMembership(sessionUser, audience)).membership.plan
    : undefined;
  return (
    <HeroChipsView
      audience={audience}
      plan={plan}
      upgradeHref={getMembershipUpgradeHref(audience, MEMBERSHIP_PLAN.ELITE)}
    />
  );
}
