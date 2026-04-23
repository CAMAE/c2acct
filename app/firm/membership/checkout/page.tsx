import { redirect } from "next/navigation";
import MembershipCheckoutShell from "@/app/components/membership/MembershipCheckoutShell";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveCurrentMembership, startCheckoutPlaceholderFlow } from "@/lib/membership";
import {
  getMembershipCheckoutModel,
  getRequestedCheckoutPlan,
  getRequestedMembershipPaymentMethod,
} from "@/lib/membershipContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership Checkout | C2Acct",
  description: "Firm checkout scaffold for PAT membership.",
};

export default async function FirmMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; method?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "firm");
  const params = searchParams ? await searchParams : undefined;
  const selectedPlan = getRequestedCheckoutPlan(params?.plan?.toUpperCase(), membership.plan);
  const initialMethod = getRequestedMembershipPaymentMethod(params?.method);
  const model = getMembershipCheckoutModel({
    audience: "firm",
    selectedPlan,
    currentPlan: membership.plan,
    currentStatus: membership.status,
  });

  async function startCheckout(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/sign-in/firm");
    }

    const requestedPlan = String(formData.get("plan")) === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
    await startCheckoutPlaceholderFlow({
      sessionUser: actor,
      audience: "firm",
      requestedPlan,
    });

    redirect(`/firm/membership?checkout=${requestedPlan.toLowerCase()}`);
  }

  return (
    <MembershipCheckoutShell
      model={model}
      initialMethod={initialMethod}
      startCheckout={startCheckout}
    />
  );
}
