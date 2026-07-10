import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildVendorAlignmentInsightDetailSurfaceCards,
  buildVendorAlignmentInsightDetailSurfaceContent,
  buildVendorAlignmentPlainLanguage,
  getRequestedVendorAlignmentInsightDetailSurface,
  getVendorAlignmentInsightBundle,
} from "@/lib/vendorAlignmentInsightEngine";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { getPeerBenchmark, getPlatformProductBenchmark } from "@/lib/adminPlatformPicture";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import {
  buildVendorMarketComparison,
  buildVendorFutureDemand,
  buildVendorExpansionSimulation,
  type EliteInsightResult,
} from "@/lib/eliteInsights";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = { surface?: string };

/**
 * Elite Insights v1 (Block 3) — build real, data-grounded content for a vendor
 * Tier-2 surface. Boundary-scoped to the viewer's pool, confidence-banded, with
 * minimum-n suppression on peer/benchmark cuts. See lib/eliteInsights.ts.
 */
async function buildVendorEliteResult(key: string, companyId: string): Promise<EliteInsightResult | null> {
  const boundaries = poolForViewerBoundary(await resolveCompanyBoundary(companyId));

  if (key === "benchmark-comparison") {
    const [catalog, market] = await Promise.all([
      getVendorProductInsightCatalog(companyId),
      getPlatformProductBenchmark(boundaries),
    ]);
    return buildVendorMarketComparison({
      rows: catalog.map((snapshot) => ({
        label: snapshot.product.name,
        subjectAverage: snapshot.firmReviewed.averageScore,
        subjectContributorCount: snapshot.firmReviewed.assessmentCount,
        peerAverage: market.marketAverage,
        peerContributorCount: market.contributorCount,
      })),
    });
  }

  if (key === "forward-projection") {
    const peer = await getPeerBenchmark(boundaries);
    return buildVendorFutureDemand({
      weakModules: peer.modules.map((m) => ({
        title: m.title,
        averageScore: m.averageScore,
        contributorCount: m.contributorCount,
      })),
    });
  }

  if (key === "scenario-simulation") {
    const catalog = await getVendorProductInsightCatalog(companyId);
    return buildVendorExpansionSimulation({
      candidates: catalog.map((snapshot) => ({
        productName: snapshot.product.name,
        grade: snapshot.firmReviewed.assessmentCount > 0 ? "firm_reviewed" : "vendor_reported",
        projectedScore:
          snapshot.firmReviewed.averageScore ?? snapshot.vendorSelfReported.latestScore ?? null,
        dimensions: [],
      })),
    });
  }

  return null;
}

export default async function VendorAlignmentInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { key } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Vendor alignment insight"
        title="Vendor alignment insight view requires Pro membership"
        body="This insight view is part of the current Pro vendor tier. PAT keeps the route visible so the upgrade path stays explicit, but the grounded readout opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor/alignment-insights"
        workspaceLabel="Back to vendor alignment insights"
        availableNow="The baseline vendor state still keeps portal entry and membership routing available."
        stagedNote="This page packages current firm-alignment signal into the current vendor Pro layer, so PAT does not open it from the baseline state."
      />
    );
  }
  const bundle = await getVendorAlignmentInsightBundle({
    vendorCompanyId: sessionUser.companyId,
  });
  const report = bundle.reports.find((entry) => entry.key === key);
  const content = getVendorAlignmentInsightContent(key);
  const activeSurface = getRequestedVendorAlignmentInsightDetailSurface(resolvedSearchParams?.surface);

  if (!report) {
    notFound();
  }

  // Elite Insights v1 (Block 3): an Elite member opening a Tier-2 vendor surface
  // gets the real, data-grounded readout; Pro-only members keep "Coming soon".
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE);
  if (report.tier === 2 && eliteEntitlement.allowed && sessionUser.companyId) {
    const eliteResult = await buildVendorEliteResult(key, sessionUser.companyId);
    if (eliteResult) {
      return (
        <InsightDetailShell
          activeKey="elite"
          eyebrow="Vendor alignment insight · Elite"
          title={report.title}
          summary={eliteResult.summary}
          surfaceContent={eliteResult.content}
          toggleAriaLabel="Vendor Elite insight views"
          toggleOptions={[{ key: "elite", label: "Elite", href: `/vendor/alignment-insights/${key}?surface=elite` }]}
          combinedEvidenceText={`Evidence grade: ${eliteResult.grade}${
            eliteResult.confidenceLabel ? ` · confidence: ${eliteResult.confidenceLabel}` : ""
          }.${eliteResult.available ? "" : " Truthful-scope: PAT does not present a number it cannot honestly support yet."}`}
        >
          <OutputDisclaimer variant="note" />
        </InsightDetailShell>
      );
    }
  }

  const surfaceCards = buildVendorAlignmentInsightDetailSurfaceCards({ report });
  const surfaceContent = buildVendorAlignmentInsightDetailSurfaceContent({
    report,
    surface: activeSurface,
  });
  const toggleOptions = surfaceCards.map((card) => ({
    key: card.key,
    label: card.title,
    href: card.href ?? `/vendor/alignment-insights/${report.key}?surface=${card.key}`,
  }));
  const scoredModules = report.contributingModules
    .filter((module) => typeof module.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const scoredCapabilities = report.contributingCapabilities
    .filter((capability) => typeof capability.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const plainLanguage = buildVendorAlignmentPlainLanguage(report);

  let visualLead = null;
  if (!report.locked && report.averageModuleScore !== null && scoredModules.length > 0) {
    visualLead = (
      <>
        <section className="pat-card p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <ScoreLockup
              label="Firm-side signal"
              score={report.averageModuleScore}
              context={`Average of the firm-aligned module signal behind this view · ${report.submissionCount} module submission${report.submissionCount === 1 ? "" : "s"} · current-state evidence only`}
            />
            <div className="space-y-6">
              <div>
                <div className="pat-label">Firm-side signal by area · strongest to softest</div>
                <div className="mt-3">
                  <RankedBars
                    title="Aggregated firm module signal behind this insight, ranked strongest to softest"
                    items={scoredModules.map((module) => ({
                      key: module.key,
                      label: module.title,
                      value: module.averageScore,
                    }))}
                    colorByBand
                  />
                </div>
              </div>
              {scoredCapabilities.length ? (
                <div>
                  <div className="pat-label">Supporting capability signal</div>
                  <div className="mt-3">
                    <RankedBars
                      title="Aggregated firm capability signal supporting this insight"
                      items={scoredCapabilities.map((capability) => ({
                        key: capability.key,
                        label: capability.title,
                        value: capability.averageScore,
                      }))}
                      colorByBand
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
        {plainLanguage ? (
          <section className="pat-card p-6">
            <div className="pat-label">What this means for your positioning</div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-ink)]">{plainLanguage.summary}</p>
          </section>
        ) : null}
      </>
    );
  }

  const combinedEvidenceText = report.locked
    ? "Current evidence stays grounded in the current firm PAT signal already visible in this route, while the deeper Elite layer remains unavailable."
    : "Current evidence combines the current firm PAT signal, aligned module patterns, and supporting capability evidence behind this vendor alignment view.";

  return (
    <InsightDetailShell
      activeKey={activeSurface}
      eyebrow="Vendor alignment insight"
      title={report.title}
      summary={report.locked ? (content?.lockedState?.summary ?? report.currentStateSummary) : report.currentStateSummary}
      surfaceContent={surfaceContent}
      toggleAriaLabel="Vendor alignment insight views"
      toggleOptions={toggleOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={report.locked ? "Coming soon. Unlock with Elite membership." : undefined}
      muted={report.locked}
      visualLead={visualLead}
    >
      {activeSurface === "elite" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Elite Insights</div>
          {eliteEntitlement.allowed ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Your Elite Insights are live — benchmark comparison, future demand, and an expansion
                simulation, each grounded in current firm-reviewed evidence.
              </p>
              <Link href="/vendor/alignment-insights?mode=elite" className="pat-button-secondary mt-4 inline-flex">
                Open Elite Insights
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Elite Insights unlock benchmark comparison, future demand, and an expansion simulation
                grounded in current firm-reviewed evidence.
              </p>
              <Link href={eliteEntitlement.upgradeHref} className="pat-button-secondary mt-4 inline-flex">
                Unlock with Elite
              </Link>
            </>
          )}
        </section>
      ) : null}
    </InsightDetailShell>
  );
}
