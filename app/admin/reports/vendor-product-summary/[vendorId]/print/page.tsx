import { notFound } from "next/navigation";
import DivergenceBar from "@/app/components/charts/DivergenceBar";
import RankedBars from "@/app/components/charts/RankedBars";
import ExecutiveNarrative from "@/app/components/admin/reports/ExecutiveNarrative";
import ReportPrintHeader from "@/app/components/admin/reports/ReportPrintHeader";
import prisma from "@/lib/prisma";
import { buildReportNarrative } from "@/lib/reportNarrative";
import {
  buildVendorProductGapCallout,
  getVendorProductInsightCatalog,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Summary Report | C2Acct",
};

export default async function VendorProductSummaryPrintPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const { vendorId } = await params;
  const vendor = await prisma.company.findUnique({
    where: { id: vendorId },
    select: { id: true, name: true, type: true },
  });
  if (!vendor || vendor.type !== "VENDOR") {
    notFound();
  }

  const snapshots = await getVendorProductInsightCatalog(vendor.id);
  // Exactly the computed evidence rendered below (names, scores, gaps,
  // section evidence) — never credentials, emails, or env.
  const narrative = await buildReportNarrative({
    reportKey: `vendor-product-summary:${vendor.id}`,
    reportTitle: `Vendor product summary · ${vendor.name}`,
    payload: {
      vendorName: vendor.name,
      products: snapshots.map((snapshot) => ({
        name: snapshot.product.name,
        vendorSelfReported: snapshot.vendorSelfReported.latestScore,
        firmReviewedAverage: snapshot.firmReviewed.averageScore,
        firmReviewCount: snapshot.firmReviewed.assessmentCount,
        gapCallout: buildVendorProductGapCallout(snapshot),
        sectionEvidence: snapshot.vendorSelfReported.sectionEvidence
          .filter((section) => section.averageScore !== null)
          .map((section) => ({ title: section.title, averageScore: section.averageScore })),
      })),
    },
  });

  return (
    <div className="space-y-8">
      <ReportPrintHeader
        title={`Vendor product summary · ${vendor.name}`}
        description="Per-product divergence picture: vendor self-reported signal vs firm-reviewed signal from final assessments, with the section evidence behind each self-report. Current-state evidence only — no benchmarks or forecasts."
        backHref="/admin/reports"
        backLabel="Back to report catalog"
      />

      <ExecutiveNarrative narrative={narrative} />

      {snapshots.length === 0 ? (
        <section className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
          {vendor.name} has no product with a completed final vendor assessment yet, so there is
          no divergence picture to report.
        </section>
      ) : (
        snapshots.map((snapshot) => {
          const vendorScore = snapshot.vendorSelfReported.latestScore;
          const firmScore = snapshot.firmReviewed.averageScore;
          const gapCallout = buildVendorProductGapCallout(snapshot);
          const sections = snapshot.vendorSelfReported.sectionEvidence.filter(
            (section) => section.averageScore !== null
          );
          return (
            <section key={snapshot.product.id} className="pat-card p-6 print:break-inside-avoid">
              <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
                {snapshot.product.name}
              </h2>
              <p className="mt-1 text-xs leading-5 text-[var(--shell-muted)]">
                {[
                  snapshot.product.category,
                  snapshot.product.utilityScopeLabel,
                  `${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-5 grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="pat-label">Vendor story vs firm review</div>
                  <div className="mt-3">
                    {vendorScore !== null && firmScore !== null ? (
                      <DivergenceBar
                        title={`${snapshot.product.name}: vendor self-reported vs firm-reviewed signal`}
                        a={{ label: "Vendor self-reported", value: vendorScore }}
                        b={{ label: "Firm-reviewed", value: firmScore }}
                        gapLabel={gapCallout.label}
                      />
                    ) : (
                      <p className="text-sm leading-6 text-[var(--shell-muted)]">
                        {vendorScore !== null
                          ? `Self-reported at ${Math.round(vendorScore)}% — no firm-reviewed signal yet.`
                          : "No scored signal for this product yet."}
                      </p>
                    )}
                  </div>
                </div>
                {sections.length ? (
                  <div>
                    <div className="pat-label">Self-reported section signal</div>
                    <div className="mt-3">
                      <RankedBars
                        title={`${snapshot.product.name} self-reported section scores, ranked strongest to softest`}
                        items={[...sections]
                          .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
                          .map((section) => ({
                            key: section.key,
                            label: section.title,
                            value: section.averageScore,
                          }))}
                        colorByBand
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
