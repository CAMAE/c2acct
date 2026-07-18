import { notFound, redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import FreshnessChip from "@/app/components/freshness/FreshnessChip";
import { getSessionUser } from "@/lib/auth/session";
import { resolveVendorSurfaceAccess } from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { getVendorRefreshBoard, type VendorProductRefreshRow } from "@/lib/vendorRefresh";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review Refresh | Patalign",
  description: "Freshness of the firm reviews of your products, with refresh-window timing.",
};

function ProductRow({ row }: { row: VendorProductRefreshRow }) {
  const needsRefresh = row.refreshWindow > 0 || row.expired > 0;
  return (
    <div className="pat-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-lg font-semibold text-[var(--shell-ink)]">{row.productName}</div>
        {row.reviewCount === 0 ? (
          <CardChip tone="muted">No firm reviews yet</CardChip>
        ) : needsRefresh ? (
          <CardChip tone="amber">
            {row.refreshWindow > 0 ? `${row.refreshWindow} in refresh window` : `${row.expired} expired`}
          </CardChip>
        ) : (
          <CardChip tone="positive">Reviews current</CardChip>
        )}
      </div>

      {row.reviewCount > 0 ? (
        <>
          <CardChipRow>
            {row.latestFreshness ? <FreshnessChip reading={row.latestFreshness} showAge={false} /> : null}
            <CardChip tone="muted">{row.reviewCount} firm review{row.reviewCount === 1 ? "" : "s"}</CardChip>
            {row.fresh > 0 ? <CardChip tone="positive">{row.fresh} fresh</CardChip> : null}
            {row.aging > 0 ? <CardChip tone="neutral">{row.aging} aging</CardChip> : null}
            {row.refreshWindow > 0 ? <CardChip tone="amber">{row.refreshWindow} in refresh window (month 10–12)</CardChip> : null}
            {row.expired > 0 ? <CardChip tone="amber">{row.expired} expired (&gt;12 months)</CardChip> : null}
          </CardChipRow>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {needsRefresh
              ? "Reviews past month 10 are nearing the 12-month benchmark window. PAT invites the reviewing firm to a short delta refresh — no action needed from you."
              : "These reviews are current for this cycle."}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          No firm has reviewed this product yet — its benchmark evidence opens with the first review.
        </p>
      )}
    </div>
  );
}

export default async function VendorReviewRefreshPage() {
  if (!isPingsEnabled()) {
    notFound();
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }

  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  const access = await resolveVendorSurfaceAccess(sessionUser, entitlement);
  if (access.kind === "denied") {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Review refresh"
        title="Review refresh requires Pro membership"
        body="Review refresh shows how current the firm reviews of your products are. PAT keeps the route visible so the upgrade path is clear, but the review-freshness view opens once Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor"
        workspaceLabel="Open vendor workspace"
        availableNow="The baseline vendor state still keeps portal entry, help, and membership routing available."
        upgradeNote="Review refresh packages firm-review recency into the vendor engagement layer, a current-state Pro surface."
      />
    );
  }

  const board = sessionUser.companyId
    ? await getVendorRefreshBoard(sessionUser.companyId)
    : { cutoffIso: "", cutoffLabel: "", rows: [], summary: { products: 0, reviews: 0, refreshWindow: 0, expired: 0 } };

  const { summary, rows, cutoffLabel } = board;
  const headline =
    summary.reviews === 0
      ? "No firm reviews of your products yet."
      : summary.refreshWindow + summary.expired === 0
        ? `All ${summary.reviews} firm reviews of your products are current.`
        : `${summary.refreshWindow + summary.expired} of ${summary.reviews} firm reviews of your products are due for a refresh.`;

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8" data-testid="vendor-review-refresh-hero">
        <HeroChips audience="vendor" />
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">Review refresh</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{headline}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          A firm review counts toward your benchmarks for 12 months, with visible decay. At month 10 PAT invites the
          reviewing firm to a short &ldquo;what changed?&rdquo; delta refresh that resets the clock. Freshness is a label on the
          review date — it never changes a score. The quarter cutoff for the next benchmark is <strong>{cutoffLabel}</strong>.
        </p>
        <CardChipRow>
          {summary.refreshWindow > 0 ? <CardChip tone="amber">{summary.refreshWindow} in refresh window</CardChip> : null}
          {summary.expired > 0 ? <CardChip tone="amber">{summary.expired} expired</CardChip> : null}
          <CardChip tone="muted">{summary.products} product{summary.products === 1 ? "" : "s"} reviewed</CardChip>
        </CardChipRow>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
          You don&apos;t have any products yet. Once a product is listed and a firm reviews it, its review freshness shows up here.
        </div>
      ) : (
        <div className="space-y-3" data-testid="vendor-review-refresh-rows">
          {rows.map((row) => (
            <ProductRow key={row.productId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
