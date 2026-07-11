import Link from "next/link";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import RadarChart from "@/app/components/charts/RadarChart";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import NudgeButtonMount from "@/app/components/notifications/NudgeButtonMount";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getFirmBriefForConsultant } from "@/lib/firmBriefs";
import FirmAlignmentHeader from "./_components/FirmAlignmentHeader";
import FirmBriefHelpContent from "./_components/FirmBriefHelpContent";
import FirmBriefMethodology from "./_components/FirmBriefMethodology";
import FiveModuleRadar from "./_components/FiveModuleRadar";
import SixQuarterRoadmap from "./_components/SixQuarterRoadmap";
import StackFitAnalysis from "./_components/StackFitAnalysis";

export const dynamic = "force-dynamic";

type SearchParams = { panel?: string };

type FirmBriefPanelKey =
  | "operating"
  | "radar"
  | "stack-fit"
  | "roadmap"
  | "method"
  | "pat"
  | "help";

const FIRM_BRIEF_PANELS: ReadonlyArray<FirmBriefPanelKey> = [
  "operating",
  "radar",
  "stack-fit",
  "roadmap",
  "method",
  "pat",
  "help",
];

function isFirmBriefPanelKey(value: string | undefined): value is FirmBriefPanelKey {
  return value !== undefined && (FIRM_BRIEF_PANELS as readonly string[]).includes(value);
}

function getPanelHref(
  ecosystemId: string,
  firmCompanyId: string,
  panel: FirmBriefPanelKey
): string {
  const base = `/consultants/ecosystems/${ecosystemId}/firm/${firmCompanyId}`;
  return panel === "operating" ? base : `${base}?panel=${panel}`;
}

export default async function FirmBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ ecosystemId: string; firmCompanyId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { ecosystemId, firmCompanyId } = await params;
  const access = await requireConsultantSession(
    `/consultants/ecosystems/${ecosystemId}/firm/${firmCompanyId}`
  );
  if (!access) return null;

  const brief = await getFirmBriefForConsultant(
    access.consultantProfileId,
    ecosystemId,
    firmCompanyId
  );
  if (!brief) {
    notFound();
  }

  const searchParamsResolved = searchParams ? await searchParams : undefined;
  const activePanel: FirmBriefPanelKey = isFirmBriefPanelKey(searchParamsResolved?.panel)
    ? searchParamsResolved.panel
    : "operating";

  const panelOptions = [
    { key: "operating", label: "Operating alignment", href: getPanelHref(ecosystemId, firmCompanyId, "operating") },
    { key: "radar", label: "Five-module radar", href: getPanelHref(ecosystemId, firmCompanyId, "radar") },
    { key: "stack-fit", label: "Stack fit", href: getPanelHref(ecosystemId, firmCompanyId, "stack-fit") },
    { key: "roadmap", label: "6-quarter roadmap", href: getPanelHref(ecosystemId, firmCompanyId, "roadmap") },
    { key: "method", label: "Methodology", href: getPanelHref(ecosystemId, firmCompanyId, "method") },
    { key: "pat", label: "Meet PAT", href: getPanelHref(ecosystemId, firmCompanyId, "pat") },
    { key: "help", label: "Help", href: getPanelHref(ecosystemId, firmCompanyId, "help") },
  ] as const;

  return (
    <div
      className="space-y-8"
      data-testid="firm-brief-page"
      data-brief-id={brief.briefId}
    >
      <section className="pat-card relative p-8" data-testid="firm-brief-portal-hero">
        <Link
          href={`/consultants/ecosystems/${ecosystemId}`}
          className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)]"
          data-testid="firm-brief-back-to-ecosystem"
        >
          <span aria-hidden="true">←</span> Ecosystem
        </Link>
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label="Firm brief · Consultant"
          audienceLabel="Consultant"
        />
        <PatAudienceTitle
          as="h1"
          title={brief.firmCompanyName}
          audienceTerms={[brief.firmCompanyName]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {brief.ecosystemName} · {brief.vendorCompanyName}
        </p>
        <div className="mt-6">
          <NudgeButtonMount companyId={firmCompanyId} audience="firm" />
        </div>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "operating" ? (
        <section data-testid="firm-brief-operating-panel" className="space-y-8">
          {(() => {
            const scoredAxes = brief.fiveModuleRadar.filter(
              (axis) => typeof axis.firmScore === "number"
            );
            if (!scoredAxes.length) return null;
            const alignmentIndex = Math.round(
              scoredAxes.reduce((sum, axis) => sum + (axis.firmScore ?? 0), 0) / scoredAxes.length
            );
            return (
              <section className="pat-card p-6" data-testid="firm-brief-visual-band">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center">
                  <div>
                    <ScoreLockup
                      label="Alignment index"
                      score={alignmentIndex}
                      context={`Average of ${scoredAxes.length} of ${brief.fiveModuleRadar.length} scored modules for ${brief.firmCompanyName} · use the softest module below as the engagement opening`}
                    />
                    <div className="mt-6">
                      <div className="pat-label">Module signal · strongest to softest</div>
                      <div className="mt-3">
                        <RankedBars
                          title={`${brief.firmCompanyName} module scores, ranked strongest to softest`}
                          items={[...scoredAxes]
                            .sort((left, right) => (right.firmScore ?? 0) - (left.firmScore ?? 0))
                            .map((axis) => ({
                              key: axis.moduleKey,
                              label: axis.moduleTitle,
                              value: axis.firmScore,
                            }))}
                          colorByBand
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <RadarChart
                      title={`${brief.firmCompanyName} five-module maturity profile vs peer average (${brief.methodology.sampleSizes.peerFirmCount} firm${brief.methodology.sampleSizes.peerFirmCount === 1 ? "" : "s"}, excludes this firm)`}
                      axes={brief.fiveModuleRadar.map((axis) => ({
                        key: axis.moduleKey,
                        label: axis.moduleTitle,
                        value: axis.firmScore,
                        benchmark: axis.ecosystemAverage,
                      }))}
                      benchmarkLabel={`peer average (${brief.methodology.sampleSizes.peerFirmCount}, excl. this firm)`}
                    />
                    <p className="mt-2 text-center text-xs leading-5 text-[var(--shell-muted)]">
                      Where the firm shape sits inside the dashed peer-average outline is where this firm trails its peers in your book.
                    </p>
                  </div>
                </div>
              </section>
            );
          })()}
          <FirmAlignmentHeader data={brief} />
        </section>
      ) : null}
      {activePanel === "radar" ? (
        <section data-testid="firm-brief-radar-panel">
          <FiveModuleRadar data={brief} />
        </section>
      ) : null}
      {activePanel === "stack-fit" ? (
        <section data-testid="firm-brief-stack-fit-panel">
          <StackFitAnalysis data={brief} />
        </section>
      ) : null}
      {activePanel === "roadmap" ? (
        <section data-testid="firm-brief-roadmap-panel">
          <SixQuarterRoadmap data={brief} />
        </section>
      ) : null}
      {activePanel === "method" ? (
        <section data-testid="firm-brief-method-panel">
          <FirmBriefMethodology data={brief} />
        </section>
      ) : null}
      {activePanel === "pat" ? (
        <section data-testid="firm-brief-meetpat-panel">
          <MeetPatContent />
        </section>
      ) : null}
      {activePanel === "help" ? (
        <section data-testid="firm-brief-help-panel">
          <FirmBriefHelpContent />
        </section>
      ) : null}
      <OutputDisclaimer variant="note" />
    </div>
  );
}
