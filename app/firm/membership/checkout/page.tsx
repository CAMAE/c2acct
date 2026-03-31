import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveCurrentMembership, startCheckoutPlaceholderFlow } from "@/lib/membership";
import { formatMembershipValue, getRequestedCheckoutPlan } from "@/lib/membershipContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Firm Membership Checkout | C2Acct",
  description: "Firm checkout placeholder for PAT membership.",
};

export default async function FirmMembershipCheckoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }

  const { membership } = await resolveCurrentMembership(sessionUser, "firm");
  const params = searchParams ? await searchParams : undefined;
  const selectedPlan = getRequestedCheckoutPlan(params?.plan?.toUpperCase(), membership.plan);

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
    <section className="space-y-8">
      <div className="pat-card p-8">
        <div className="pat-label">Firm checkout placeholder</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">Choose the next membership tier</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route stores a real pending checkout membership row without claiming payment is live yet. Later payment integration can adopt the row directly.
        </p>
        <div className="mt-6 text-sm leading-6 text-[var(--shell-muted)]">
          Current state: <span className="font-semibold text-[var(--shell-ink)]">{membership.plan} / {membership.status}</span>
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          Selected plan: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(selectedPlan)}</span>
        </div>
      </div>

      <form action={startCheckout} className="grid gap-4 md:grid-cols-2">
        <button
          type="submit"
          name="plan"
          value="PRO"
          className={`pat-card p-6 text-left ${selectedPlan === MEMBERSHIP_PLAN.PRO ? "ring-2 ring-[var(--shell-accent)]" : ""}`}
        >
          <div className="pat-label">Pro</div>
          <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">Start Pro checkout placeholder</div>
        </button>
        <button
          type="submit"
          name="plan"
          value="ELITE"
          className={`pat-card p-6 text-left ${selectedPlan === MEMBERSHIP_PLAN.ELITE ? "ring-2 ring-[var(--shell-accent)]" : ""}`}
        >
          <div className="pat-label">Elite</div>
          <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">Start Elite checkout placeholder</div>
        </button>
      </form>

      <Link className="pat-button-secondary inline-flex" href="/firm/membership">Back to firm membership</Link>
    </section>
  );
}
