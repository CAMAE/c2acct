import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestedMembershipTab } from "@/lib/membershipContent";
import { MEMBERSHIP_STATUS, NO_MEMBERSHIP, resolveCurrentMembership } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Membership | Patalign",
  description: "Vendor membership state for PAT.",
};

export default async function VendorMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string; tab?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();

  // Membership is a SALES surface, so a signed-out visitor sees the tier grid
  // rather than being bounced to sign-in (AUDIT-OMNIBUS-A-001). Nothing
  // account-specific is rendered in this state: no display name, no plan, no
  // status — the resolver is not even called, so there is nothing to leak.
  if (!sessionUser) {
    return (
      <MembershipPageShell
        audience="vendor"
        checkoutNotice={null}
        currentPlan={NO_MEMBERSHIP}
        currentStatus={MEMBERSHIP_STATUS.CANCELED}
        displayName="Not signed in"
        initialTab={getRequestedMembershipTab(params?.tab, NO_MEMBERSHIP)}
      />
    );
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "vendor");
  const checkoutNotice =
    params?.checkout === "pro" || params?.checkout === "elite"
      ? `Vendor ${params.checkout === "pro" ? "Pro" : "Elite"} checkout started — intent recorded, no charge today.`
      : null;

  return (
    <MembershipPageShell
      audience="vendor"
      checkoutNotice={checkoutNotice}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      initialTab={getRequestedMembershipTab(params?.tab, membership.plan)}
    />
  );
}
