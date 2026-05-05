"use client";

import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
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
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{model.hero.eyebrow}</div>
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
        <div className="grid gap-5 md:grid-cols-2">
          {model.sections.map((section) => (
            <article key={section.title} className="pat-card p-6">
              <div className="pat-label">{section.title}</div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{section.body}</p>
            </article>
          ))}
        </div>

        <article className="pat-card p-6">
          <div className="pat-label">{model.ownsPlan ? "Current tier" : "Next step"}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {model.actionTitle}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{model.actionBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href={model.actionHref}>
              {model.actionLabel}
            </Link>
            <Link className="pat-button-secondary" href={model.workspaceHref}>
              {model.workspaceLabel}
            </Link>
          </div>
        </article>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-secondary" href={model.backHref}>
          Back to membership
        </Link>
      </section>
    </div>
  );
}
