import { redirect } from "next/navigation";
import MembershipPaymentProcessingPanel from "@/app/components/membership/MembershipPaymentProcessingPanel";
import { getSessionUser } from "@/lib/auth/session";
import {
  MembershipBillingInputSchema,
  createMembershipBillingSession,
  getBillingPageState,
  getConfiguredPriceSummary,
} from "@/lib/billing";
import { resolveCurrentMembership } from "@/lib/membership";
import { getRequestedCheckoutPlan } from "@/lib/membershipContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership Payment Processing | C2Acct",
  description: "Firm payment-processing handoff for PAT membership.",
};

function getSurfaceMessage(state: string | undefined) {
  if (state === "canceled") {
    return "The provider checkout was canceled before completion. No firm membership upgrade was finalized.";
  }

  return null;
}

export default async function FirmMembershipPaymentProcessingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; plan?: string; state?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const params = searchParams ? await searchParams : undefined;
  const { membership } = await resolveCurrentMembership(sessionUser, "firm");
  const selectedPlan = getRequestedCheckoutPlan(params?.plan?.toUpperCase(), membership.plan);
  const pageState = getBillingPageState({
    audience: "firm",
    plan: selectedPlan,
    currentPlan: membership.plan,
    status: membership.status,
  });

  async function startBillingSession(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/sign-in/firm");
    }

    const parsed = MembershipBillingInputSchema.safeParse({
      plan: String(formData.get("plan") ?? selectedPlan),
      methodChoice: String(formData.get("methodChoice") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      billingEmail: String(formData.get("billingEmail") ?? ""),
      billingPhone: String(formData.get("billingPhone") ?? ""),
      companyLegalName: String(formData.get("companyLegalName") ?? ""),
      taxId: String(formData.get("taxId") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      region: String(formData.get("region") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      country: String(formData.get("country") ?? "").toUpperCase(),
      consentToStoreMethod: formData.get("consentToStoreMethod") === "true",
    });

    if (!parsed.success) {
      redirect(`/firm/membership/payment-processing?plan=${selectedPlan.toLowerCase()}&error=invalid`);
    }

    const result = await createMembershipBillingSession({
      sessionUser: actor,
      audience: "firm",
      billingInput: parsed.data,
    });

    if (!result.ok) {
      redirect(`/firm/membership/payment-processing?plan=${selectedPlan.toLowerCase()}&error=${result.reason}`);
    }

    redirect(result.redirectUrl);
  }

  return (
    <MembershipPaymentProcessingPanel
      audience="firm"
      billingSummary={membership.billingSummary}
      currentPlan={membership.plan}
      currentStatus={membership.status}
      displayName={membership.displayName}
      errorMessage={params?.error ? "PAT could not start the requested provider billing handoff. Check the form and method availability, then try again." : null}
      formAction={startBillingSession}
      methodOptions={pageState.methods}
      priceSummary={getConfiguredPriceSummary("firm", selectedPlan)}
      providerEnabled={pageState.providerEnabled}
      selectedPlan={selectedPlan}
      statusMessage={pageState.statusSummary}
      surfaceMessage={getSurfaceMessage(params?.state)}
    />
  );
}
