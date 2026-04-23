import Link from "next/link";
import { redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Insight | C2Acct",
  description: "Completed vendor product assessment catalog for product intelligence.",
};

function ProductInsightCard({ snapshot }: { snapshot: VendorProductInsightSnapshot }) {
  return (
    <Link
      href={`/vendor/product-insight/${snapshot.product.id}`}
      className="pat-card pat-card-interactive block p-6"
    >
      <h2 className="text-xl font-semibold text-[var(--shell-ink)]">{snapshot.product.name}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
        Click to access product intelligence insights
      </p>
    </Link>
  );
}

export default async function VendorProductInsightPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
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
        <div className="pat-label">Product intelligence</div>
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
