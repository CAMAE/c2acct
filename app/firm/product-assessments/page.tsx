import Link from "next/link";
import { redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { getSessionUser } from "@/lib/auth/session";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getVendorUtilityLabels } from "@/lib/vendorPat";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type SearchParams = {
  blockedProductId?: string;
};

export default async function FirmProductAssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm product assessments"
        title="Firm product assessments require Pro membership"
        body="Firm product review is part of the current Pro firm tier. PAT keeps this route visible so the upgrade path is explicit, but the feature-scoped product review flow opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm"
        workspaceLabel="Open firm workspace"
        availableNow="The baseline firm state still keeps workspace entry, help, and membership routing available."
        stagedNote="The product review flow feeds the current PAT product-evidence loop, so PAT treats it as a Pro assessment surface rather than a baseline route."
      />
    );
  }
  const params = searchParams ? await searchParams : undefined;
  const products = await getFirmProductCatalog();
  const reviewableProducts = products.filter((product) => product.reviewAvailable);
  const blockedProduct =
    params?.blockedProductId ? products.find((product) => product.id === params.blockedProductId) : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{PAT_PRODUCT_NAME}</div>
        <PatAudienceTitle
          as="h1"
          title="Firm product assessments"
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Review the products already available for firm-side input. PAT keeps each review tied to the product’s completed vendor assessment so your feedback stays inside the current product scope and carries forward into the broader insight layer.
        </p>
        <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Only products with a completed vendor product assessment appear here.
        </div>
      </section>

      {blockedProduct && !blockedProduct.reviewAvailable ? (
        <div className="pat-banner pat-banner-warning">
          {blockedProduct.name} is not reviewable yet. Firm product review opens only after the vendor completes the
          full product assessment.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Available product reviews</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
            Open one product to add your firm-side review to the current PAT evidence set.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {reviewableProducts.length === 0 ? (
            <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
              No products are reviewable yet. Firm review opens only after the vendor completes the full product assessment.
            </div>
          ) : (
            reviewableProducts.map((product) => (
              <Link
                key={product.id}
                href={`/firm/product-assessments/${product.id}`}
                className="pat-card pat-card-interactive block rounded-[24px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                    <div className="mt-2 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                  </div>
                  <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    {product.questionCount} q
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                  {product.summary ?? "No summary added yet."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {getVendorUtilityLabels(product.utilityKeys).map((featureLabel) => (
                    <span
                      key={featureLabel}
                      className="rounded-full border border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium text-[var(--shell-ink)]"
                    >
                      {featureLabel}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
