import { notFound, redirect } from "next/navigation";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import FirmProductAssessmentClient from "@/app/components/firm/FirmProductAssessmentClient";
import { getSessionUser } from "@/lib/auth/session";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
};

export default async function FirmProductAssessmentDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    redirect("/sign-in/firm");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="firm"
        surfaceLabel="Firm product assessment"
        title="Firm product assessment requires Pro membership"
        body="This firm product review runtime is part of the current Pro firm tier. PAT keeps the route visible so the upgrade path stays explicit, but it does not open the assessment body until Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/firm/product-assessments"
        workspaceLabel="Back to firm product assessments"
        availableNow="The baseline firm state still keeps workspace entry and membership routing available."
        stagedNote="This runtime sits inside the current product-review loop that feeds PAT product evidence, so it stays behind the current Pro tier."
      />
    );
  }

  const products = await getFirmProductCatalog();
  const { productId } = await params;
  const product = products.find((entry) => entry.id === productId);
  if (!product) {
    notFound();
  }

  if (!product.reviewAvailable) {
    const redirectParams = new URLSearchParams({
      blockedProductId: product.id,
    });
    redirect(`/firm/product-assessments?${redirectParams.toString()}`);
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{PAT_PRODUCT_NAME}</div>
        <PatAudienceTitle
          as="h1"
          title={`Firm product assessment for ${product.name}`}
          audienceTerms={["Firm"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Review this product inside the feature scope the vendor already declared. Your submission becomes part of the current PAT evidence set rather than a disconnected side form.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Vendor: <span className="font-semibold text-[var(--shell-ink)]">{product.vendorName}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Features: <span className="font-semibold text-[var(--shell-ink)]">{product.utilityKeys.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Questions: <span className="font-semibold text-[var(--shell-ink)]">{product.questionCount}</span>
          </div>
        </div>
      </section>

      <FirmProductAssessmentClient product={product} />
    </div>
  );
}
