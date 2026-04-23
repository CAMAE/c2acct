import { notFound, redirect } from "next/navigation";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  buildVendorProductEliteInsightCards,
  buildVendorProductProInsightCards,
  getRequestedVendorProductInsightDetailMode,
  getVendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
};

type SearchParams = {
  mode?: string;
};

function getModeHref(productId: string, mode: "pro" | "elite" | "help") {
  return `/vendor/product-insight/${productId}?mode=${mode}`;
}

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

export default async function VendorProductInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { productId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
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
        body="This product-intelligence page is part of the current Pro vendor tier. PAT keeps the route visible so the upgrade path stays explicit, but it does not open the intelligence readout until Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor/product-insight"
        workspaceLabel="Back to product intelligence"
        availableNow="The baseline vendor state still keeps workspace entry and membership routing available."
        stagedNote="This product page packages current assessment evidence into the current vendor intelligence layer, so PAT treats it as a Pro surface."
      />
    );
  }

  if (!sessionUser.companyId) {
    notFound();
  }

  const snapshot = await getVendorProductInsightSnapshot(sessionUser.companyId, productId);
  if (!snapshot) {
    notFound();
  }

  const activeMode = getRequestedVendorProductInsightDetailMode(resolvedSearchParams?.mode);
  const toggleOptions = [
    { key: "pro", label: "Pro Insights", href: getModeHref(snapshot.product.id, "pro") },
    { key: "elite", label: "Elite Insights", href: getModeHref(snapshot.product.id, "elite") },
    { key: "help", label: "Help", href: getModeHref(snapshot.product.id, "help") },
  ] as const;
  const proCards = buildVendorProductProInsightCards(snapshot);
  const eliteCards = buildVendorProductEliteInsightCards();

  return (
    <InsightsModeShell
      activeMode={activeMode}
      eyebrow="Product intelligence"
      title={`Vendor product intelligence for ${snapshot.product.name}`}
      audienceTerms={["Vendor"]}
      heroBody={snapshot.combinedCurrentPatReadout}
      heroSupplement={(
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="pat-soft-panel p-5">
            <div className="pat-label">{messages.insights.vendorProduct.vendorSelfReportedSignal}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--shell-ink)]">
              {formatScore(snapshot.vendorSelfReported.latestScore)}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {snapshot.vendorSelfReported.sectionEvidence.length > 0
                ? `${snapshot.vendorSelfReported.sectionEvidence.length} scored section${
                    snapshot.vendorSelfReported.sectionEvidence.length === 1 ? "" : "s"
                  } are contributing to the current vendor-side readout.`
                : "No vendor-side section evidence is available yet."}
            </p>
          </div>
          <div className="pat-soft-panel p-5">
            <div className="pat-label">{messages.insights.vendorProduct.firmReviewedSignal}</div>
            <div className="mt-3 text-3xl font-semibold text-[var(--shell-ink)]">
              {formatScore(snapshot.firmReviewed.averageScore)}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {snapshot.firmReviewed.assessmentCount > 0
                ? `Based on ${snapshot.firmReviewed.assessmentCount} firm product assessment${
                    snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"
                  } with current feature-level review data.`
                : "No firm-reviewed product evidence is available yet."}
            </p>
          </div>
        </section>
      )}
      toggleAriaLabel="Vendor product intelligence modes"
      toggleOptions={toggleOptions}
      proPanel={{
        title: "Pro insights",
        intro: "Concise current-state product intelligence tied to current vendor and firm evidence.",
        cards: proCards,
        columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
      }}
      elitePanel={{
        title: "Elite insights",
        intro: "Coming soon. Unlock with Elite membership.",
        cards: eliteCards,
        columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
      }}
      helpPanel={{
        title: "Help",
        intro: "Use Pro Insights for the current grounded readouts. Elite Insights are coming soon and unlock with Elite membership.",
        infoCards: [
          {
            title: "Pro insights",
            body: "Open these cards when you want the current product-intelligence slices backed by current vendor self-report and firm-reviewed evidence.",
          },
          {
            title: "Elite insights",
            body: "Coming soon. Unlock with Elite membership.",
            tone: "muted",
            badgeLabel: "Coming soon",
            badgeTone: "locked",
          },
          {
            title: "Current product view",
            body: "Use this page to compare the vendor-side readout, the firm-reviewed readout, and the current product-intelligence cards for this product.",
          },
        ],
      }}
    />
  );
}
