"use client";

import Link from "next/link";
import type { MembershipPageModel } from "@/lib/membershipContent";

type MembershipTierGridProps = {
  model: MembershipPageModel;
};

export default function MembershipTierGrid({ model }: MembershipTierGridProps) {
  return (
    <section
      className="grid gap-4 md:grid-cols-2"
      data-testid="membership-tier-grid"
      aria-label="Membership tier comparison"
    >
      {model.tiers.map((tier) => {
        const ariaLabel = tier.isRecommended
          ? `${tier.label} tier (Recommended)`
          : `${tier.label} tier`;
        const ariaCurrent = tier.isCurrent ? "page" : undefined;
        return (
          <article
            key={tier.plan}
            data-testid="membership-tier-card"
            data-plan={tier.plan}
            data-current={tier.isCurrent ? "1" : "0"}
            data-recommended={tier.isRecommended ? "1" : "0"}
            aria-label={ariaLabel}
            aria-current={ariaCurrent}
            className={`pat-card relative flex flex-col p-8 ${
              tier.isRecommended
                ? "border-[var(--brand-c2-blue)] shadow-[0_0_0_1px_var(--brand-c2-blue)]"
                : ""
            }`}
          >
            {tier.isRecommended ? (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-c2-blue)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                Most popular
              </div>
            ) : null}
            {tier.isCurrent ? (
              <div className="pat-label text-[var(--shell-positive)]">
                <span aria-hidden="true">✓ </span>Your current plan
              </div>
            ) : (
              <div className="pat-label">{tier.label}</div>
            )}
            <div className="mt-4 flex items-baseline gap-2">
              <div className="pat-stat-number text-5xl">{tier.priceDisplay}</div>
              <div className="text-sm text-[var(--shell-muted)]">{tier.cadence}</div>
            </div>
            <p className="mt-3 text-base leading-7 text-[var(--shell-muted)]">{tier.tagline}</p>
            {tier.ctaHref ? (
              <Link
                href={tier.ctaHref}
                className={`mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  tier.isRecommended
                    ? "bg-[var(--brand-c2-blue)] text-white hover:bg-[rgba(6,54,116,0.85)]"
                    : "border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)] hover:bg-[rgba(6,54,116,0.1)]"
                }`}
              >
                {tier.ctaLabel}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="pointer-events-none mt-6 inline-flex cursor-default items-center justify-center rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--shell-muted)]"
              >
                {tier.ctaLabel}
              </span>
            )}
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[var(--shell-ink)]">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-0.5 text-[var(--shell-positive)]">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
