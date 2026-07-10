import Link from "next/link";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getVendorBriefForConsultant } from "@/lib/briefs";
import ActionRoadmap from "./_components/ActionRoadmap";
import EvaluationMethodology from "./_components/EvaluationMethodology";
import PerFirmStrengthsCautions from "./_components/PerFirmStrengthsCautions";
import ProductComparison from "./_components/ProductComparison";
import SelfVsMarketDelta from "./_components/SelfVsMarketDelta";
import VendorBriefExecutiveSummary from "./_components/VendorBriefExecutiveSummary";
import VendorBriefHelpContent from "./_components/VendorBriefHelpContent";
import VendorProductPositioningRadar from "./_components/VendorProductPositioningRadar";

export const dynamic = "force-dynamic";

type SearchParams = { panel?: string };

type VendorBriefPanelKey =
  | "exec"
  | "method"
  | "positioning"
  | "strengths"
  | "product"
  | "roadmap"
  | "pat"
  | "help";

const VENDOR_BRIEF_PANELS: ReadonlyArray<VendorBriefPanelKey> = [
  "exec",
  "method",
  "positioning",
  "strengths",
  "product",
  "roadmap",
  "pat",
  "help",
];

function isVendorBriefPanelKey(value: string | undefined): value is VendorBriefPanelKey {
  return value !== undefined && (VENDOR_BRIEF_PANELS as readonly string[]).includes(value);
}

function getPanelHref(ecosystemId: string, panel: VendorBriefPanelKey): string {
  return panel === "exec"
    ? `/consultants/ecosystems/${ecosystemId}/vendor-brief`
    : `/consultants/ecosystems/${ecosystemId}/vendor-brief?panel=${panel}`;
}

export default async function VendorBriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ ecosystemId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { ecosystemId } = await params;
  const access = await requireConsultantSession(
    `/consultants/ecosystems/${ecosystemId}/vendor-brief`
  );
  if (!access) return null;

  const brief = await getVendorBriefForConsultant(access.consultantProfileId, ecosystemId);
  if (!brief) {
    notFound();
  }

  const searchParamsResolved = searchParams ? await searchParams : undefined;
  const activePanel: VendorBriefPanelKey = isVendorBriefPanelKey(searchParamsResolved?.panel)
    ? searchParamsResolved.panel
    : "exec";

  const panelOptions = [
    { key: "exec", label: "Executive summary", href: getPanelHref(ecosystemId, "exec") },
    { key: "method", label: "Evaluation methodology", href: getPanelHref(ecosystemId, "method") },
    { key: "positioning", label: "Positioning visual", href: getPanelHref(ecosystemId, "positioning") },
    { key: "strengths", label: "Strengths / cautions", href: getPanelHref(ecosystemId, "strengths") },
    { key: "product", label: "Product comparison", href: getPanelHref(ecosystemId, "product") },
    { key: "roadmap", label: "Action roadmap", href: getPanelHref(ecosystemId, "roadmap") },
    { key: "pat", label: "Meet PAT", href: getPanelHref(ecosystemId, "pat") },
    { key: "help", label: "Help", href: getPanelHref(ecosystemId, "help") },
  ] as const;

  return (
    <div
      className="space-y-8"
      data-testid="vendor-brief-page"
      data-brief-id={brief.briefId}
    >
      <section className="pat-card relative p-8" data-testid="vendor-brief-portal-hero">
        <Link
          href={`/consultants/ecosystems/${ecosystemId}`}
          className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)]"
          data-testid="vendor-brief-back-to-ecosystem"
        >
          <span aria-hidden="true">←</span> Ecosystem
        </Link>
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label="Vendor brief · Consultant"
          audienceLabel="Consultant"
        />
        <PatAudienceTitle
          as="h1"
          title={brief.vendorCompanyName}
          audienceTerms={[brief.vendorCompanyName]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {brief.ecosystemName} · {brief.firmCount} firm{brief.firmCount === 1 ? "" : "s"} ·{" "}
          {brief.productCount} product{brief.productCount === 1 ? "" : "s"}.
        </p>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "exec" ? (
        <section data-testid="vendor-brief-exec-panel">
          <VendorBriefExecutiveSummary data={brief} />
        </section>
      ) : null}
      {activePanel === "method" ? (
        <section data-testid="vendor-brief-method-panel">
          <EvaluationMethodology data={brief} />
        </section>
      ) : null}
      {activePanel === "positioning" ? (
        <section data-testid="vendor-brief-positioning-panel" className="space-y-8">
          <VendorProductPositioningRadar data={brief} />
          <SelfVsMarketDelta data={brief} />
        </section>
      ) : null}
      {activePanel === "strengths" ? (
        <section data-testid="vendor-brief-strengths-panel">
          <PerFirmStrengthsCautions data={brief} />
        </section>
      ) : null}
      {activePanel === "product" ? (
        <section data-testid="vendor-brief-product-panel">
          <ProductComparison data={brief} />
        </section>
      ) : null}
      {activePanel === "roadmap" ? (
        <section data-testid="vendor-brief-roadmap-panel">
          <ActionRoadmap data={brief} />
        </section>
      ) : null}
      {activePanel === "pat" ? (
        <section data-testid="vendor-brief-meetpat-panel">
          <MeetPatContent />
        </section>
      ) : null}
      {activePanel === "help" ? (
        <section data-testid="vendor-brief-help-panel">
          <VendorBriefHelpContent />
        </section>
      ) : null}
      <OutputDisclaimer variant="note" />
    </div>
  );
}
