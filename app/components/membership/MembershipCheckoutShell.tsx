"use client";

import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import {
  getMembershipPathPrefix,
  type MembershipCheckoutModel,
  type MembershipPaymentMethodKey,
} from "@/lib/membershipContent";
import { ELEVATED_ACTION, ELEVATED_CONFIRMATION_FIELD } from "@/lib/security/elevatedAction";

type MembershipCheckoutShellProps = {
  model: MembershipCheckoutModel;
  initialMethod: MembershipPaymentMethodKey;
  startCheckout: (formData: FormData) => void;
};

function getAudienceEmailLabel(audience: MembershipCheckoutModel["audience"]) {
  if (audience === "vendor") {
    return "Billing email";
  }

  if (audience === "firm") {
    return "Accounts payable email";
  }

  return "Billing email";
}

function getCountryDefault(audience: MembershipCheckoutModel["audience"]) {
  return audience === "individual" ? "United States" : "United States";
}

export default function MembershipCheckoutShell({
  model,
  initialMethod,
  startCheckout,
}: MembershipCheckoutShellProps) {
  const firstMethod = model.paymentMethods[0]?.key ?? "card";
  const activeMethodPanel =
    model.paymentMethods.find((method) => method.key === initialMethod)?.key === initialMethod
      ? initialMethod
      : firstMethod;
  const checkoutHref = `${getMembershipPathPrefix(model.audience)}/membership/checkout?plan=${model.plan.toLowerCase()}`;
  const paymentMethods = model.paymentMethods.map((method) => ({
    ...method,
    href: `${checkoutHref}&method=${method.key}`,
  }));
  const paymentPanel = model.paymentPanels[activeMethodPanel];
  const providerBacked = model.billing.mode === "provider";

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{model.hero.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.hero.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.hero.body}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Selected tier: <span className="font-semibold text-[var(--shell-ink)]">{model.summary.tierLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current state: <span className="font-semibold text-[var(--shell-ink)]">{model.summary.currentState}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Payment state: <span className="font-semibold text-[var(--shell-ink)]">{model.summary.paymentStateLabel}</span>
          </div>
        </div>
        <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-950">
          {model.summary.processingNote}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <form action={startCheckout} className="pat-card p-6">
          <input type="hidden" name="plan" value={model.plan} />
          <input type="hidden" name="paymentMethod" value={activeMethodPanel} />

          <div className="pat-label">{providerBacked ? "Provider checkout" : "Checkout — no charge today"}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {providerBacked ? "Continue through Stripe" : "Payment form (nothing is billed today)"}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {providerBacked
              ? "PAT creates a Stripe-hosted checkout session. Payment details are collected by Stripe after redirect, not by this PAT form."
              : "Complete the non-sensitive billing fields below. PAT uses them as future-ready scaffold inputs only; submitting this form records checkout intent rather than processing a payment."}
          </p>

          {providerBacked ? (
            <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
              {model.billing.truthLabel} Entitlement remains pending until Stripe webhook reconciliation confirms an active or trialing subscription.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">{getAudienceEmailLabel(model.audience)}</span>
                <input
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">Billing contact name</span>
                <input
                  required
                  name="billingContactName"
                  autoComplete="name"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">Billing address</span>
                <input
                  required
                  name="billingAddressLine1"
                  autoComplete="address-line1"
                  placeholder="Address line 1"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="sr-only">Billing address line 2</span>
                <input
                  name="billingAddressLine2"
                  autoComplete="address-line2"
                  placeholder="Address line 2"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">City</span>
                <input
                  required
                  name="billingCity"
                  autoComplete="address-level2"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">State / region</span>
                <input
                  required
                  name="billingState"
                  autoComplete="address-level1"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">Postal code</span>
                <input
                  required
                  name="billingPostalCode"
                  autoComplete="postal-code"
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">Country</span>
                <input
                  required
                  name="billingCountry"
                  autoComplete="country-name"
                  defaultValue={getCountryDefault(model.audience)}
                  className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                />
              </label>
            </div>
          )}

          {model.paymentMethods.length > 1 ? (
            <div className="mt-6">
              <PatModeToggle
                activeKey={activeMethodPanel}
                ariaLabel="Payment methods"
                options={paymentMethods}
              />
            </div>
          ) : null}

          <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">{paymentPanel.title}</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{paymentPanel.summary}</p>
            {providerBacked ? null : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {paymentPanel.fields.map((field) => (
                  <label key={field} className="space-y-2">
                    <span className="text-sm font-medium text-[var(--shell-ink)]">{field}</span>
                    <input
                      name={`method-${field.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      className="w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)] outline-none transition focus:border-[var(--shell-accent)]"
                    />
                  </label>
                ))}
              </div>
            )}
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{paymentPanel.detail}</p>
          </div>

          <label className="mt-6 flex gap-3 rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4 text-sm leading-6 text-[var(--shell-muted)]">
            <input
              required
              type="checkbox"
              name={ELEVATED_CONFIRMATION_FIELD}
              value={ELEVATED_ACTION.MEMBERSHIP_CHECKOUT}
              className="mt-1 h-4 w-4"
            />
            <span>
              I confirm I am the signed-in account holder and understand this action may create a provider checkout session or record a billing checkout intent for this PAT membership.
            </span>
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="submit" className="pat-button-primary">
              {model.submitLabel}
            </button>
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
              {model.billing.truthLabel}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--shell-muted)]">
            Review your order and submit. Confirmation arrives by email.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--shell-border)] pt-5">
            <Link className="pat-button-secondary" href={model.navigation.membershipHref}>
              {model.navigation.membershipLabel}
            </Link>
            <Link className="pat-button-secondary" href={model.navigation.workspaceHref}>
              {model.navigation.workspaceLabel}
            </Link>
            {model.billingPortal.enabled ? (
              <form action="/api/billing/portal" method="post" className="grid gap-3">
                <input type="hidden" name="audience" value={model.audience} />
                <input type="hidden" name="returnTo" value={model.navigation.membershipHref} />
                <label className="flex gap-3 rounded-[16px] border border-[var(--shell-border)] bg-white/80 p-3 text-xs leading-5 text-[var(--shell-muted)]">
                  <input
                    required
                    type="checkbox"
                    name={ELEVATED_CONFIRMATION_FIELD}
                    value={ELEVATED_ACTION.BILLING_PORTAL}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>Confirm account-holder access to billing portal management.</span>
                </label>
                <button type="submit" className="pat-button-secondary">
                  {model.billingPortal.label}
                </button>
              </form>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
