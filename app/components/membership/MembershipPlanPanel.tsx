"use client";

import Link from "next/link";
import type { MembershipPageModel } from "@/lib/membershipContent";

type MembershipPlanPanelProps = {
  model: MembershipPageModel;
};

export default function MembershipPlanPanel({ model }: MembershipPlanPanelProps) {
  if (model.panel.kind === "narrative") {
    return (
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <article className="pat-card p-6">
          <div className="pat-label">{model.activeTab === "MEET_PAT" ? "Meet PAT" : "Help"}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.panel.summary}</p>
        </article>
        <article className="pat-card p-6">
          <div className="pat-label">Inline notes</div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
            {model.panel.bullets.map((bullet) => (
              <p key={bullet}>{bullet}</p>
            ))}
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
      <article className="pat-card p-6">
        <div className="pat-label">{model.activeTab}</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.panel.summary}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">What it is</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.what}</p>
          </div>
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">Why it helps</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.why}</p>
          </div>
        </div>
      </article>
      <article className="pat-card p-6">
        <div className="pat-label">{model.panel.ownsPlan ? "Current tier" : "Upgrade path"}</div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.ctaTitle}</h3>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.ctaBody}</p>
        <Link className="pat-button-primary mt-6 inline-flex" href={model.panel.ctaHref}>
          {model.panel.ownsPlan ? "Continue" : "Open checkout placeholder"}
        </Link>
      </article>
    </section>
  );
}
