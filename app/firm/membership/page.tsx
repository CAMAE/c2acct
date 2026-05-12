import { redirect } from "next/navigation";
import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import { getSessionUser } from "@/lib/auth/session";
import { getDefaultMembershipTab } from "@/lib/membershipContent";
import { resolveCurrentMembership } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership | C2Acct",
  description: "Firm membership state for PAT.",
};

export default async function FirmMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "firm");
  const params = searchParams ? await searchParams : undefined;
  const checkoutNotice =
    params?.checkout === "success"
      ? "Provider checkout completed. PAT will reflect the final membership state as Stripe webhook events finish reconciling."
      : params?.checkout === "pro" || params?.checkout === "elite"
        ? `Firm ${params.checkout === "pro" ? "Pro" : "Elite"} payment processing has started. Final state comes from provider webhook confirmation.`
      : null;

  return (
    <MembershipPageShell
      audience="firm"
      billingSummary={membership.billingSummary}
      checkoutNotice={checkoutNotice}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      initialTab={getDefaultMembershipTab(membership.plan)}
    />
  );
}
