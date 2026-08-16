import { redirect } from "next/navigation";
import MembershipCheckoutShell from "@/app/components/membership/MembershipCheckoutShell";
import { getSessionUser } from "@/lib/auth/session";
import { getBillingConfig, getBillingModeForPlan } from "@/lib/billing/config";
import { startMembershipCheckoutFlow } from "@/lib/billing/checkout";
import { MEMBERSHIP_PLAN, resolveCurrentMembership } from "@/lib/membership";
import {
  getMembershipCheckoutModel,
  getRequestedCheckoutPlan,
  getRequestedMembershipPaymentMethod,
} from "@/lib/membershipContent";
import { ELEVATED_ACTION, hasElevatedConfirmation } from "@/lib/security/elevatedAction";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Membership Checkout | Patalign",
  description: "Vendor checkout for PAT membership.",
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
  const billingConfig = getBillingConfig();
  const billingMode = getBillingModeForPlan({
    config: billingConfig,
    audience: "vendor",
    plan: selectedPlan,
  });
  const model = getMembershipCheckoutModel({
    audience: "vendor",
    selectedPlan,
    currentPlan: membership.plan,
    currentStatus: membership.status,
    billingMode: billingMode.mode === "configured" ? "provider" : "scaffold",
    billingDisabledReason: billingMode.reason,
  });
  const initialMethod = model.billing.mode === "provider"
    ? "stripe"
    : getRequestedMembershipPaymentMethod(params?.method);

  async function startCheckout(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/sign-in/vendor");
    }

    const requestedPlan = String(formData.get("plan")) === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
    if (!hasElevatedConfirmation(formData, ELEVATED_ACTION.MEMBERSHIP_CHECKOUT)) {
      redirect(`/vendor/membership/checkout?plan=${requestedPlan.toLowerCase()}&billing=confirmation_required`);
    }

    const result = await startMembershipCheckoutFlow({
      sessionUser: actor,
      audience: "vendor",
      requestedPlan,
    });

    if (result.ok && result.mode === "provider" && result.redirectUrl) {
      redirect(result.redirectUrl);
    }

    if (result.ok) {
      redirect(`/vendor/membership?checkout=${requestedPlan.toLowerCase()}&billing=scaffold&reason=${result.billingDisabledReason ?? "billing_disabled"}`);
    }

    redirect(`/vendor/membership/checkout?plan=${requestedPlan.toLowerCase()}&billing=unavailable&reason=${result.reason}`);
  }

  return (
    <MembershipCheckoutShell
      model={model}
      initialMethod={initialMethod}
      startCheckout={startCheckout}
    />
  );
}
