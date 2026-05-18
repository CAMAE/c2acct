import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
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
    { key: "roadmap", label: "Six-quarter roadmap", href: getPanelHref(ecosystemId, firmCompanyId, "roadmap") },
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
      <section className="pat-card p-8" data-testid="firm-brief-portal-hero">
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
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "operating" ? (
        <section data-testid="firm-brief-operating-panel">
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
    </div>
  );
}
