import Link from "next/link";
import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import DivergenceBar from "@/app/components/charts/DivergenceBar";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { resolveVendorSurfaceAccess } from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildVendorProductGapCallout,
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Insight | C2Acct",
  description: "Completed vendor product assessment catalog for product intelligence.",
};

function ProductInsightCard({ snapshot }: { snapshot: VendorProductInsightSnapshot }) {
  const vendorScore = snapshot.vendorSelfReported.latestScore;
  const firmScore = snapshot.firmReviewed.averageScore;
  const gapCallout = buildVendorProductGapCallout(snapshot);
  const featureCount = snapshot.product.utilityKeys.length;
  const assessmentCount = snapshot.firmReviewed.assessmentCount;
  const descriptor = [
    snapshot.product.category,
    `${featureCount} declared feature${featureCount === 1 ? "" : "s"}`,
    `${assessmentCount} firm assessment${assessmentCount === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/vendor/product-insight/${snapshot.product.id}`}
      className="pat-card pat-card-interactive block p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--shell-ink)]">{snapshot.product.name}</h2>
        <span aria-hidden="true" className="text-lg text-[var(--shell-muted)]">›</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--shell-muted)]">{descriptor}</p>
      <div className="mt-4">
        {vendorScore !== null && firmScore !== null ? (
          <DivergenceBar
            title={`${snapshot.product.name}: vendor self-reported vs firm-reviewed signal`}
            a={{ label: "Vendor self-reported", value: vendorScore }}
            b={{ label: "Firm-reviewed", value: firmScore }}
            gapLabel={gapCallout.label}
          />
        ) : vendorScore !== null ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-[var(--shell-ink)]">
                {Math.round(vendorScore)}%
              </span>
              <span className="text-xs text-[var(--shell-muted)]">self-reported signal</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
              No firm-reviewed signal yet — the divergence view opens with the first firm review.
            </p>
          </div>
        ) : (
          <p className="text-xs leading-5 text-[var(--shell-muted)]">
            No scored signal is available for this product yet.
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function VendorProductInsightPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  // WS1-B (manual-review item 6): consultants bypass the vendor Pro gate.
  // Block E (WS-PERF-TENANCY-AUDIT-001): routing folded into
  // resolveVendorSurfaceAccess so the consultant-or-entitlement branch is
  // a single helper call instead of hand-copied across three vendor pages.
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  const access = await resolveVendorSurfaceAccess(sessionUser, entitlement);
  if (access.kind === "denied") {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Product intelligence"
        title="Vendor product intelligence requires Pro membership"
        body="Vendor product intelligence is part of the current Pro vendor tier. PAT keeps this route visible so the upgrade path is clear, but the product-intelligence catalog only opens once Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor"
        workspaceLabel="Open vendor workspace"
        availableNow="The baseline vendor state still keeps portal entry, help, and membership routing available."
        stagedNote="The catalog and product pages are current-state Pro surfaces. PAT does not open them from the baseline state because they package assessment evidence into the vendor intelligence layer."
      />
    );
  }
  const cards: VendorProductInsightSnapshot[] = sessionUser?.companyId
    ? await getVendorProductInsightCatalog(sessionUser.companyId)
    : [];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">Product intelligence</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Vendor product intelligence
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Only products with a completed final vendor product assessment appear here. Open a product
          to review its current product intelligence.
        </p>
      </section>

      {cards.length === 0 ? (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          No products have a completed final vendor product assessment yet. Complete a product
          assessment first, then return here to access product intelligence insights.
        </section>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((snapshot) => (
            <ProductInsightCard key={snapshot.product.id} snapshot={snapshot} />
          ))}
        </section>
      )}
    </div>
  );
}
