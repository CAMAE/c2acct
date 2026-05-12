import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import { getSessionUser } from "@/lib/auth/session";
import { getDefaultMembershipTab } from "@/lib/membershipContent";
import { resolveCurrentMembership } from "@/lib/membership";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Membership | C2Acct",
  description: "Vendor membership state for PAT.",
};

export default async function VendorMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "vendor");
  const params = searchParams ? await searchParams : undefined;
  const checkoutNotice =
    params?.checkout === "success"
      ? "Provider checkout completed. PAT will reflect the final membership state as Stripe webhook events finish reconciling."
      : params?.checkout === "pro" || params?.checkout === "elite"
        ? `Vendor ${params.checkout === "pro" ? "Pro" : "Elite"} payment processing has started. Final state comes from provider webhook confirmation.`
      : null;

  return (
    <MembershipPageShell
      audience="vendor"
      billingSummary={membership.billingSummary}
      checkoutNotice={checkoutNotice}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      initialTab={getDefaultMembershipTab(membership.plan)}
    />
  );
}
