import { redirect } from "next/navigation";
import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestedMembershipTab } from "@/lib/membershipContent";
import { resolveCurrentMembership } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership | C2Acct",
  description: "Firm membership state for PAT.",
};

export default async function FirmMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string; tab?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "firm");
  const params = searchParams ? await searchParams : undefined;
  const checkoutNotice =
    params?.checkout === "pro" || params?.checkout === "elite"
      ? `Firm ${params.checkout === "pro" ? "Pro" : "Elite"} checkout placeholder started.`
      : null;

  return (
    <MembershipPageShell
      audience="firm"
      checkoutNotice={checkoutNotice}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      initialTab={getRequestedMembershipTab(params?.tab, membership.plan)}
    />
  );
}
