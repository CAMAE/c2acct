import Link from "next/link";
import { MEMBERSHIP_PLAN, type ResolvedMembershipPlan } from "@/lib/membership";

/**
 * Block 14a/b/c — the shared hero utility row rendered at the top-right of every
 * portal page (via the firm/vendor/consultant layouts):
 *  - 14a "← Workspace" back chip → the role's workspace home.
 *  - 14b tier flag — a quiet Pro/Elite band chip (status, not a banner). Only for
 *    PRO/ELITE members (firm/vendor); consultants have no membership tier.
 *  - 14c "Upgrade to Elite" chip — Pro only, NEVER Elite; links to the membership
 *    page. A quiet chip adjacent to the tier flag, not a banner.
 */

const WORKSPACE_HOME = {
  firm: "/firm",
  vendor: "/vendor",
  consultant: "/consultants",
} as const;

export default function PortalHeroChips({
  audience,
  plan,
  upgradeHref,
}: {
  audience: "firm" | "vendor" | "consultant";
  /** Undefined for consultant (no membership tier). */
  plan?: ResolvedMembershipPlan;
  upgradeHref?: string;
}) {
  const isPro = plan === MEMBERSHIP_PLAN.PRO;
  const isElite = plan === MEMBERSHIP_PLAN.ELITE;

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-end gap-2"
      data-testid="portal-hero-chips"
    >
      {/* 14b — tier flag (status; PRO/ELITE only) */}
      {isPro || isElite ? (
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-3 py-1 text-xs font-semibold text-[var(--shell-ink)]"
          data-testid="tier-flag-chip"
          data-tier={isElite ? "ELITE" : "PRO"}
        >
          <span
            aria-hidden="true"
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: isElite ? "var(--brand-c2-blue)" : "var(--shell-muted)" }}
          />
          {isElite ? "Elite" : "Pro"}
        </span>
      ) : null}

      {/* 14c — upgrade CTA (Pro only, never Elite) */}
      {isPro && upgradeHref ? (
        <Link
          href={upgradeHref}
          className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[rgba(6,54,116,0.08)] px-3 py-1 text-xs font-semibold text-[var(--brand-c2-blue)] transition-colors hover:bg-[rgba(6,54,116,0.14)]"
          data-testid="upgrade-to-elite-chip"
        >
          Upgrade to Elite <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      {/* 14a — workspace back chip (top-right) */}
      <Link
        href={WORKSPACE_HOME[audience]}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-medium text-[var(--shell-muted)] transition-colors hover:text-[var(--shell-ink)]"
        data-testid="workspace-back-chip"
      >
        <span aria-hidden="true">←</span> Workspace
      </Link>
    </div>
  );
}
