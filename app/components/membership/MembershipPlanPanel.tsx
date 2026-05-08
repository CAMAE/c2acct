"use client";

import Link from "next/link";
import { formatMembershipValue } from "@/lib/membershipContent";
import type { MembershipPageModel } from "@/lib/membershipContent";

type MembershipPlanPanelProps = {
  model: MembershipPageModel;
};

export default function MembershipPlanPanel({ model }: MembershipPlanPanelProps) {
  if (model.panel.kind === "help") {
    return (
      <section className="space-y-6">
        <article className="pat-card p-6">
          <div className="pat-label">Help</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.panel.summary}</p>
        </article>

        <section className="grid gap-5 md:grid-cols-2">
          {model.panel.cards.map((card) => (
            <article key={card.title} className="pat-card p-6">
              <div className="pat-label">{card.title}</div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{card.body}</p>
            </article>
          ))}
        </section>
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
      <div className="space-y-6">
        <article className="pat-card p-6">
          <div className="pat-label">{`${formatMembershipValue(model.activeTab)} membership`}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.panel.summary}</p>
          <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">Current truthful scope</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.scopeNote}</p>
          </div>
          <div className="mt-6">
            <Link className="pat-button-secondary inline-flex" href={model.panel.detailHref}>
              {model.panel.detailLabel}
            </Link>
          </div>
        </article>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">What it is</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.what}</p>
            <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
              <div className="pat-label">What&apos;s available today</div>
              <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.liveNowNote}</p>
            </div>
            <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
              <div className="pat-label">What&apos;s coming next</div>
              <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.stagedNote}</p>
            </div>
          </div>
          <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">Why it helps</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.why}</p>
          </div>
        </div>
      </div>

      <article className="pat-card p-6">
        <div className="pat-label">{model.panel.ownsPlan ? "Current tier" : "Upgrade path"}</div>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.panel.ctaTitle}</h3>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{model.panel.ctaBody}</p>
        <Link className="pat-button-primary mt-6 inline-flex" href={model.panel.ctaHref}>
          {model.panel.ownsPlan ? "Continue in checkout scaffold" : "Open checkout scaffold"}
        </Link>
      </article>
    </section>
  );
}
