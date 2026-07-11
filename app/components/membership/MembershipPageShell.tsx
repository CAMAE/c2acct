"use client";

import type { MembershipStatus } from "@prisma/client";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import MembershipComparisonTable from "@/app/components/membership/MembershipComparisonTable";
import MembershipPlanPanel from "@/app/components/membership/MembershipPlanPanel";
import MembershipTierGrid from "@/app/components/membership/MembershipTierGrid";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import {
  formatMembershipValue,
  getMembershipPageModel,
  getMembershipPathPrefix,
  getMembershipStatusSummary,
  getMembershipTabs,
  type MembershipTabKey,
} from "@/lib/membershipContent";
import type { ResolvedMembershipPlan } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

type MembershipPageShellProps = {
  audience: MembershipAudience;
  currentPlan: ResolvedMembershipPlan;
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
  const activeTab = initialTab;
  const membershipHref = `${getMembershipPathPrefix(audience)}/membership`;
  const model = getMembershipPageModel({
    audience,
    currentPlan,
    activeTab,
  });
  const membershipTabs = getMembershipTabs().map((tab) => ({
    key: tab.key,
    label: tab.label,
    href: `${membershipHref}?tab=${tab.key.toLowerCase()}`,
  }));
  const audienceTerms =
    audience === "vendor"
      ? ["Vendor"]
      : audience === "firm"
        ? ["Firm"]
        : ["Individual", "User"];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{model.hero.eyebrow}</div>
        <PatAudienceTitle
          as="h1"
          title={model.hero.title}
          audienceTerms={audienceTerms}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
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
        <div className="mt-6">
          <PatModeToggle
            activeKey={activeTab}
            ariaLabel="Membership modes"
            options={membershipTabs}
          />
        </div>
      </section>

      <MembershipTierGrid model={model} />

      <section className="space-y-6" key={activeTab}>
        <MembershipPlanPanel model={model} />
      </section>

      <MembershipComparisonTable model={model} />
    </div>
  );
}
