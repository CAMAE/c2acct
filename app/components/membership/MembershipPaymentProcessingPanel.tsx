import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import TrackPageEvent from "@/app/components/telemetry/TrackPageEvent";
import type { buildMembershipBillingSummary, BillingMethodOption } from "@/lib/billing";
import { formatMembershipValue } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

type MembershipPaymentProcessingPanelProps = {
  audience: MembershipAudience;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  displayName: string;
  selectedPlan: MembershipPlan;
  statusMessage: string;
  providerEnabled: boolean;
  priceSummary: string;
  methodOptions: BillingMethodOption[];
  billingSummary?: Awaited<ReturnType<typeof buildMembershipBillingSummary>> | null;
  surfaceMessage?: string | null;
  errorMessage?: string | null;
  formAction: (formData: FormData) => void | Promise<void>;
};

export default function MembershipPaymentProcessingPanel({
  audience,
  currentPlan,
  currentStatus,
  displayName,
  selectedPlan,
  statusMessage,
  providerEnabled,
  priceSummary,
  methodOptions,
  billingSummary,
  surfaceMessage,
  errorMessage,
  formAction,
}: MembershipPaymentProcessingPanelProps) {
  const liveMethod = methodOptions.find((option) => option.live) ?? methodOptions[0];

  return (
    <div className="space-y-8">
      <TrackPageEvent
        distinctId={`${audience}:${displayName}`}
        event="payment_processing_open"
        properties={{
          audience,
          currentPlan,
          currentStatus,
          selectedPlan,
          providerEnabled,
        }}
      />

      <section className="pat-card p-8">
        <div className="pat-label">{formatMembershipValue(audience)} membership payment processing</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Review the billing details before provider handoff
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          PAT uses provider-hosted payment processing for live methods. Raw card and bank credentials stay with the
          provider, and webhook updates determine the final subscription truth.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Account: <span className="font-semibold text-[var(--shell-ink)]">{displayName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current plan: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(currentPlan)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Selected plan: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(selectedPlan)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current status: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(currentStatus)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Saved method: <span className="font-semibold text-[var(--shell-ink)]">{billingSummary?.defaultPaymentMethodLabel ?? "No saved provider method yet"}</span>
          </div>
        </div>
        <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {statusMessage}
        </div>
        {surfaceMessage ? (
          <div className="mt-4 rounded-[18px] border border-sky-200 bg-sky-50/90 p-4 text-sm leading-6 text-sky-900">
            {surfaceMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50/90 p-4 text-sm leading-6 text-rose-900">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <form action={formAction} className="space-y-8">
        <input type="hidden" name="plan" value={selectedPlan} />

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="pat-card p-6">
            <div className="pat-label">Payment method</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Choose the provider-backed handoff
            </h2>
            <div className="mt-6 grid gap-4">
              {methodOptions.map((method) => (
                <label
                  key={method.key}
                  className={`block rounded-[20px] border p-5 ${method.live ? "border-[var(--shell-border)] bg-white/85" : "border-slate-200 bg-slate-50/85"}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      defaultChecked={method.key === liveMethod?.key}
                      name="methodChoice"
                      type="radio"
                      value={method.key}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold text-[var(--shell-ink)]">{method.label}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${method.live ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                          {method.live ? "Live" : "Staged"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{method.description}</p>
                      {method.stagedReason ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                          {method.stagedReason}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </article>

          <article className="pat-card p-6">
            <div className="pat-label">Plan summary</div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {formatMembershipValue(selectedPlan)} membership
            </h3>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{priceSummary}</p>
            <div className="mt-6 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                What is being saved:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">
                  Provider-managed payment method token and billing customer reference only
                </span>
              </div>
              <div>
                What is not stored in PAT:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">Raw card numbers, bank credentials, or security codes</span>
              </div>
              <div>
                Final state source: <span className="font-semibold text-[var(--shell-ink)]">Provider webhooks</span>
              </div>
            </div>
            <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Method guidance: cards and wallet-backed card methods are the primary hosted path, bank or ACH is only live when explicitly enabled, PayPal remains staged unless a provider-backed handoff exists, and billing-help visibility does not imply manual invoicing is live.
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="pat-card p-6">
            <div className="pat-label">Billing profile</div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <input name="contactName" className="pat-input" placeholder="Billing contact name" required />
              <input name="billingEmail" type="email" className="pat-input" placeholder="Billing email" required />
              <input name="billingPhone" className="pat-input" placeholder="Billing phone" required />
              <input name="companyLegalName" className="pat-input" placeholder="Company or legal entity" />
              <input name="taxId" className="pat-input" placeholder="VAT / EIN / tax id" />
              <input name="country" className="pat-input" maxLength={2} placeholder="Country code (US)" required />
              <input name="addressLine1" className="pat-input md:col-span-2" placeholder="Billing address line 1" required />
              <input name="addressLine2" className="pat-input md:col-span-2" placeholder="Billing address line 2" />
              <input name="city" className="pat-input" placeholder="City" required />
              <input name="region" className="pat-input" placeholder="State / region" />
              <input name="postalCode" className="pat-input" placeholder="Postal code" required />
            </div>
          </article>

          <article className="pat-card p-6">
            <div className="pat-label">Consent</div>
            <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--shell-muted)]">
              <label className="flex items-start gap-3">
                <input name="consentToStoreMethod" type="checkbox" value="true" required />
                <span>
                  I authorize the payment provider to store and reuse the selected payment method for this membership,
                  future renewals, and later upgrades if the provider-managed subscription remains active.
                </span>
              </label>
              <p>
                PAT will store billing contact details, provider customer references, subscription references, and saved
                payment-method display metadata only.
              </p>
            </div>
            <button
              className="pat-button-primary mt-6"
              disabled={!providerEnabled}
              type="submit"
            >
              {providerEnabled ? "Continue to provider checkout" : "Live billing not configured"}
            </button>
          </article>
        </section>
      </form>
    </div>
  );
}
