import { redirect } from "next/navigation";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import VendorAlignmentInsightDetailBody from "@/app/components/insights/detail/VendorAlignmentInsightDetailBody";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import prisma from "@/lib/prisma";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import {
  VENDOR_ELITE_V2_META,
  buildVendorCategoryPosition,
  buildVendorDemandSignals,
  buildVendorGapMap,
  vendorEliteHubMetrics,
} from "@/lib/eliteInsightsV2";
import { getSessionUser } from "@/lib/auth/session";
import { resolveVendorSurfaceAccess } from "@/lib/consultantAccess";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  buildVendorAlignmentEliteInsightCards,
  buildVendorAlignmentProInsightCards,
  getVendorAlignmentInsightBundle,
} from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Alignment Insights | Patalign",
  description: "Vendor alignment insights connected to firm alignment signal.",
};

type SearchParams = {
  mode?: string;
  /** R34: card key whose readout opens on load. */
  readout?: string;
};

export default async function VendorAlignmentInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Box 3h (R58): the hub has no modes; a saved ?mode link lands on the hub itself.
  if (typeof resolvedSearchParams?.mode === "string") {
    redirect("/vendor/alignment-insights");
  }
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  // WS1-B (manual-review item 7): consultants bypass the vendor Pro gate.
  // Block E (WS-PERF-TENANCY-AUDIT-001): routing folded into
  // resolveVendorSurfaceAccess; see lib/consultantAccess.ts.
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  const access = await resolveVendorSurfaceAccess(sessionUser, entitlement);
  if (access.kind === "denied") {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Vendor alignment insights"
        title="Vendor alignment insights require Pro membership"
        body="Vendor alignment insights are part of the current Pro vendor tier. This page stays visible so the membership path is explicit, but the insight catalog opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor"
        workspaceLabel="Open vendor workspace"
        availableNow="The baseline vendor state still keeps workspace entry, help, and membership routing available."
        upgradeNote="This overview is the current Pro packaging layer around firm-alignment signal, so PAT does not open it from the baseline state."
      />
    );
  }
  const bundle = await getVendorAlignmentInsightBundle({
    vendorCompanyId: sessionUser.companyId,
  });
  // The evidence floor (Governance Phase 2). Below five contributing firms this
  // cross-firm readout is not a publishable peer benchmark; the surface tells the
  // vendor so instead of presenting the averages as settled.
  const peerBenchmarkSuppressed = bundle.benchmarkSuppression.suppressed && bundle.sampleSize > 0;
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE);
  // Block 12a: every Pro face card expands inline into the COMPLETE insight body
  // (same component the detail route renders), not a text-only readout.
  const reportByKey = new Map(bundle.reports.map((report) => [report.key, report]));
  const proCards = buildVendorAlignmentProInsightCards(bundle).map((card) => {
    const report = reportByKey.get(card.key);
    return report && !report.locked
      ? { ...card, expandedNode: <VendorAlignmentInsightDetailBody report={report} /> }
      : card;
  });
  // Block 12c: entitled Elite hub cards carry their own headline number, from the
  // same builders that power each detail surface.
  let eliteCards = buildVendorAlignmentEliteInsightCards(bundle, { elite: eliteEntitlement.allowed });
  if (eliteEntitlement.allowed && sessionUser.companyId) {
    const companyId = sessionUser.companyId;
    const boundary = await resolveCompanyBoundary(companyId);
    const [category, demand, catalog] = await Promise.all([
      buildVendorCategoryPosition(prisma, companyId, boundary),
      buildVendorDemandSignals(prisma, companyId, poolForViewerBoundary(boundary), { identityAllowed: true }),
      getVendorProductInsightCatalog(companyId),
    ]);
    const gapMap = buildVendorGapMap(
      catalog.map((snapshot) => ({
        productId: snapshot.product.id,
        productName: snapshot.product.name,
        firmAssessmentCount: snapshot.firmReviewed.assessmentCount,
        firmDimensions: snapshot.firmReviewed.dimensionEvidence.map((d) => ({ key: d.key, title: d.title, score: d.score })),
        vendorDimensions: snapshot.vendorSelfReported.dimensionEvidence.map((d) => ({ key: d.key, title: d.title, score: d.score })),
      }))
    );
    const faces = vendorEliteHubMetrics({ category, demand, gapMap });
    eliteCards = eliteCards.map((card) => {
      const eliteFace = faces[card.key];
      return eliteFace ? { ...card, eliteFace } : card;
    });
  }
  return (
    <InsightsModeShell
      initialReadoutKey={typeof resolvedSearchParams?.readout === "string" ? resolvedSearchParams.readout : null}
      audience="vendor"
      eyebrow="Vendor alignment insights"
      title={messages.insights.vendorAlignment.heroTitle}
      helpHref="/vendor?panel=help"
      audienceTerms={["Vendor"]}
      heroBody={messages.insights.vendorAlignment.heroBody}
      currentStateSummary={
        bundle.sampleSize === 0
          ? "PAT does not have enough current firm alignment evidence yet to open a grounded vendor alignment readout."
          : peerBenchmarkSuppressed
            ? "Insufficient peer data: fewer than 5 contributing firms. PAT shows these cross-firm readings as early evidence only and does not publish them as a peer benchmark until the peer set clears the evidence floor."
            : undefined
      }
      proPanel={{
        title: "Pro insights",
        intro: "Concise current-state vendor alignment insight grounded in current firm PAT evidence.",
        cards: proCards,
        columnsClassName: "md:grid-cols-2",
      }}
      elitePanel={{
        title: "Elite insights",
        intro: eliteEntitlement.allowed
          ? "Live with your Elite membership. Open any card for the grounded readout built from current firm-reviewed evidence."
          : "Live with Elite membership.",
        // B9c: Elite members see the live cards; Pro sees one honest
        // LockedElitePreview per surface (v2 name + blurred chart).
        cards: eliteEntitlement.allowed ? eliteCards : undefined,
        lockedPreviews: eliteEntitlement.allowed
          ? undefined
          : [
              {
                title: VENDOR_ELITE_V2_META["benchmark-comparison"].title,
                description: VENDOR_ELITE_V2_META["benchmark-comparison"].description,
                shape: "distribution" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
              {
                title: VENDOR_ELITE_V2_META["forward-projection"].title,
                description: VENDOR_ELITE_V2_META["forward-projection"].description,
                shape: "bars" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
              {
                title: VENDOR_ELITE_V2_META["scenario-simulation"].title,
                description: VENDOR_ELITE_V2_META["scenario-simulation"].description,
                shape: "bars" as const,
                upgradeHref: eliteEntitlement.upgradeHref,
              },
            ],
        columnsClassName: "md:grid-cols-2 xl:grid-cols-3",
      }}
    />
  );
}
