"use client";

import { useState } from "react";
import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import MembershipPlanPanel from "@/app/components/membership/MembershipPlanPanel";
import {
  formatMembershipValue,
  getMembershipPageModel,
  getMembershipStatusSummary,
  getMembershipTabs,
  type MembershipTabKey,
} from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

type MembershipPageShellProps = {
  audience: MembershipAudience;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  displayName: string;
  initialTab: MembershipTabKey;
  checkoutNotice?: string | null;
};

export default function MembershipPageShell({
  audience,
  currentPlan,
  currentStatus,
  displayName,
  initialTab,
  checkoutNotice,
}: MembershipPageShellProps) {
  const [activeTab, setActiveTab] = useState<MembershipTabKey>(initialTab);
  const model = getMembershipPageModel({
    audience,
    currentPlan,
    activeTab,
  });

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{model.hero.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{model.hero.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{model.hero.body}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Account: <span className="font-semibold text-[var(--shell-ink)]">{displayName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current plan: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(currentPlan)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Status: <span className="font-semibold text-[var(--shell-ink)]">{getMembershipStatusSummary(currentStatus)}</span>
          </div>
        </div>
        {checkoutNotice ? (
          <div className="mt-5 rounded-[18px] border border-sky-200 bg-sky-50/90 p-4 text-sm leading-6 text-sky-900">
            {checkoutNotice}
          </div>
        ) : null}
      </section>

      <section className="pat-card p-4">
        <div className="flex flex-wrap gap-3">
          {getMembershipTabs().map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                className={isActive ? "pat-button-primary" : "pat-button-secondary"}
                onClick={() => setActiveTab(tab.key)}
                type="button"
                aria-pressed={isActive}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-6" key={activeTab}>
        <MembershipPlanPanel model={model} />
      </section>
    </div>
  );
}
