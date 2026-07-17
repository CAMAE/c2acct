import Link from "next/link";
import { MEMBERSHIP_PLAN, type ResolvedMembershipPlan } from "@/lib/membership";

/**
 * Pure, prop-driven renderer for the Block 14a/b/c hero chips. Kept free of
 * server-only imports (no session/prisma) so it is unit-testable via
 * renderToStaticMarkup — the 14c "Elite never sees the upgrade CTA" contract lives
 * in tests/hero-chips.contract.test.ts. The async wrapper `HeroChips` resolves
 * membership and renders this. Absolutely positioned to the top-right corner of a
 * `relative` hero card. Corner order: [← Workspace] [tier flag] [Upgrade — Pro only].
 */

export const HERO_WORKSPACE_HOME = {
  firm: "/firm",
  vendor: "/vendor",
  consultant: "/consultants",
} as const;

export type HeroAudience = keyof typeof HERO_WORKSPACE_HOME;

export function HeroChipsView({
  audience,
  plan,
  upgradeHref,
}: {
  audience: HeroAudience;
  /** Undefined for consultant (no membership tier). */
  plan?: ResolvedMembershipPlan;
  upgradeHref?: string;
}) {
  const isPro = plan === MEMBERSHIP_PLAN.PRO;
  const isElite = plan === MEMBERSHIP_PLAN.ELITE;

  return (
    <div
      className="absolute right-6 top-6 z-10 flex flex-wrap items-center justify-end gap-2 sm:right-8 sm:top-8"
      data-testid="hero-chips"
    >
      {/* 14a — workspace back chip (first) */}
      <Link
        href={HERO_WORKSPACE_HOME[audience]}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel)] px-3 py-1 text-xs font-medium text-[var(--shell-muted)] transition-colors hover:text-[var(--shell-ink)]"
        data-testid="workspace-back-chip"
      >
        <span aria-hidden="true">←</span> Workspace
      </Link>

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
    </div>
  );
}
