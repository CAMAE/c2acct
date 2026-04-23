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
  title: "Vendor Membership Checkout | C2Acct",
  description: "Vendor checkout scaffold for PAT membership.",
};

export default async function VendorMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string; method?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "vendor");
  const params = searchParams ? await searchParams : undefined;
  const selectedPlan = getRequestedCheckoutPlan(params?.plan?.toUpperCase(), membership.plan);
  const initialMethod = getRequestedMembershipPaymentMethod(params?.method);
  const model = getMembershipCheckoutModel({
    audience: "vendor",
    selectedPlan,
    currentPlan: membership.plan,
    currentStatus: membership.status,
  });

  async function startCheckout(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/sign-in/vendor");
    }

    const requestedPlan = String(formData.get("plan")) === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
    await startCheckoutPlaceholderFlow({
      sessionUser: actor,
      audience: "vendor",
      requestedPlan,
    });

    redirect(`/vendor/membership?checkout=${requestedPlan.toLowerCase()}`);
  }

  return (
    <MembershipCheckoutShell
      model={model}
      initialMethod={initialMethod}
      startCheckout={startCheckout}
    />
  );
}
