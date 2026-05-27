import Link from "next/link";
import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { formatMembershipValue, getMembershipStatusSummary } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

type MembershipSurfaceGateProps = {
  audience: MembershipAudience;
  surfaceLabel: string;
  title: string;
  body: string;
  displayName: string;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  requiredPlan: MembershipPlan;
  membershipHref: string;
  upgradeHref: string;
  workspaceHref: string;
  workspaceLabel: string;
  availableNow: string;
  stagedNote: string;
};

function getAudienceTerms(audience: MembershipAudience) {
  if (audience === "vendor") {
    return ["Vendor"];
  }

  if (audience === "firm") {
    return ["Firm"];
  }

  return ["Individual", "User"];
}

export default function MembershipSurfaceGate({
  audience,
  surfaceLabel,
  title,
  body,
  displayName,
  currentPlan,
  currentStatus,
  requiredPlan,
  membershipHref,
  upgradeHref,
  workspaceHref,
  workspaceLabel,
  availableNow,
  stagedNote,
}: MembershipSurfaceGateProps) {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{surfaceLabel}</div>
        <PatAudienceTitle
          as="h1"
          title={title}
          audienceTerms={getAudienceTerms(audience)}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{body}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Account: <span className="font-semibold text-[var(--shell-ink)]">{displayName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Current plan: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(currentPlan)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Status: <span className="font-semibold text-[var(--shell-ink)]">{getMembershipStatusSummary(currentStatus)}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Required tier: <span className="font-semibold text-[var(--shell-ink)]">{formatMembershipValue(requiredPlan)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="pat-card p-6">
          <div className="pat-label">Current access truth</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{availableNow}</p>
          <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5">
            <div className="pat-label">Why this page is locked</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{stagedNote}</p>
          </div>
        </article>

        <article className="pat-card p-6">
          <div className="pat-label">Next step</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Open membership or stage the Pro path
          </h2>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            PAT keeps the route visible so the upgrade path is explicit. Basic portal entry stays available, but this assessment or insight surface opens only after the required membership tier is active.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href={membershipHref}>
              Open membership
            </Link>
            <Link className="pat-button-secondary" href={upgradeHref}>
              Open checkout scaffold
            </Link>
            <Link className="pat-button-secondary" href={workspaceHref}>
              {workspaceLabel}
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
