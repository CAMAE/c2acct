import { redirect } from "next/navigation";
import MembershipPageShell from "@/app/components/membership/MembershipPageShell";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestedMembershipTab } from "@/lib/membershipContent";
import { resolveCurrentMembership } from "@/lib/membership";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Individual Membership | Patalign",
  description: "Individual membership state for PAT.",
};

export default async function UserMembershipPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string; tab?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/user");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "individual");
  const params = searchParams ? await searchParams : undefined;
  const checkoutNotice =
    params?.checkout === "pro" || params?.checkout === "elite"
      ? `Individual ${params.checkout === "pro" ? "Pro" : "Elite"} checkout scaffold started.`
      : null;

  return (
    <MembershipPageShell
      audience="individual"
      checkoutNotice={checkoutNotice}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      initialTab={getRequestedMembershipTab(params?.tab, membership.plan)}
    />
  );
}
