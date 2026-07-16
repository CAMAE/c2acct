import Link from "next/link";
import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getVendorUtilityLabels } from "@/lib/vendorPat";
import { getFirmProductCatalog } from "@/lib/firmPat";
import AvailableCompletedToggle, {
  type ProductFilterValue,
} from "./_components/AvailableCompletedToggle";

export const dynamic = "force-dynamic";

type SearchParams = {
  blockedProductId?: string;
  filter?: string;
};

function resolveFilter(raw: string | undefined): ProductFilterValue {
  return raw === "completed" ? "completed" : "available";
}

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
  const products = await getFirmProductCatalog(sessionUser.companyId);
  const reviewableProducts = products.filter((product) => product.reviewAvailable);
  // WS2-B (manual-review items 8/9): card-level Available|Completed toggle
  // replaces the per-card status pill. Completion is keyed on
  // latestFirmReviewSubmittedAt being non-null.
  const activeFilter = resolveFilter(params?.filter);
  const availableProducts = reviewableProducts.filter(
    (product) => product.latestFirmReviewSubmittedAt === null
  );
  const completedProducts = reviewableProducts.filter(
    (product) => product.latestFirmReviewSubmittedAt !== null
  );
  const visibleProducts =
    activeFilter === "completed" ? completedProducts : availableProducts;
  const blockedProduct =
    params?.blockedProductId ? products.find((product) => product.id === params.blockedProductId) : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <PatAudienceTitle
          as="h1"
          title="Firm product assessments"
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Review the products that are available for firm-side input.
        </p>
        <div className="mt-6">
          <AvailableCompletedToggle
            currentFilter={activeFilter}
            availableCount={availableProducts.length}
            completedCount={completedProducts.length}
          />
        </div>
      </section>

      {blockedProduct && !blockedProduct.reviewAvailable ? (
        <div className="pat-banner pat-banner-warning">
          {blockedProduct.name} is not reviewable yet. Firm product review opens only after the vendor completes the
          full product assessment.
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="grid gap-5 md:grid-cols-2">
          {visibleProducts.length === 0 ? (
            <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
              {activeFilter === "completed"
                ? "No firm reviews have been submitted yet. Switch to Available to start one."
                : "No products are reviewable yet. Firm review opens only after the vendor completes the full product assessment."}
            </div>
          ) : (
            visibleProducts.map((product) => (
              <Link
                key={product.id}
                href={`/firm/product-assessments/${product.id}`}
                className="pat-card pat-card-interactive block p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                  </div>
                  <CardChip>{product.firmReviewStatusLabel}</CardChip>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {product.summary ?? "No summary added yet."}
                </p>
                <CardChipRow>
                  <CardChip>{product.questionCount} questions</CardChip>
                  {getVendorUtilityLabels(product.utilityKeys).map((featureLabel) => (
                    <CardChip key={featureLabel}>{featureLabel}</CardChip>
                  ))}
                </CardChipRow>
                <p className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">{product.firmReviewStatusReason}</p>
              </Link>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
