"use client";

import Link from "next/link";
import type { MembershipTierDetailModel } from "@/lib/membershipContent";
import { formatMembershipValue, getMembershipStatusSummary } from "@/lib/membershipContent";

type MembershipTierDetailPageProps = {
  model: MembershipTierDetailModel;
  displayName: string;
};

export default function MembershipTierDetailPage({
  model,
  displayName,
}: MembershipTierDetailPageProps) {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{model.hero.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {model.hero.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {model.hero.body}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Account: <span className="font-semibold text-[var(--shell-ink)]">{displayName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current plan:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatMembershipValue(model.currentPlan)}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Status:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {getMembershipStatusSummary(model.currentStatus)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Link className="pat-card pat-card-interactive block p-6" href={model.routeCard.href}>
          <div className="pat-label">Live route</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {model.routeCard.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{model.routeCard.body}</p>
          <div className="mt-6 inline-flex items-center text-sm font-semibold text-[var(--shell-accent)]">
            {model.routeCard.ctaLabel}
          </div>
        </Link>

        <article className="pat-card p-6">
          <div className="pat-label">{model.ownsPlan ? "Current tier" : "Next step"}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {model.ownsPlan ? `Keep ${formatMembershipValue(model.plan)} active` : `Stage ${formatMembershipValue(model.plan)}`}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {model.ownsPlan
              ? "This tier is already the current membership state for this audience. Use the current placeholder flow if you need to continue the handoff."
              : "Open the existing checkout placeholder flow for this tier without inventing new payment or entitlement behavior."}
          </p>
          <Link className="pat-button-primary mt-6 inline-flex" href={model.actionHref}>
            {model.actionLabel}
          </Link>
        </article>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {model.sections.map((section) => (
          <article key={section.title} className="pat-card p-6">
            <div className="pat-label">{section.title}</div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{section.body}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-secondary" href={model.backHref}>
          Back to membership
        </Link>
        <Link className="pat-button-secondary" href={model.routeCard.href}>
          {model.routeCard.ctaLabel}
        </Link>
      </section>
    </div>
  );
}
