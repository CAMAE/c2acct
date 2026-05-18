import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getVendorBriefForConsultant } from "@/lib/briefs";
// WS10-A Block G: ActionRoadmap (Section 6) is muted for demo. The current
// library renders PAT-meta actions ("Get more individual PAT submissions")
// instead of vendor-actionable next steps. AUDIT-WS11-001 queues the rebuild.
// import ActionRoadmap from "./_components/ActionRoadmap";
import CapabilityComparison from "./_components/CapabilityComparison";
import EvaluationMethodology from "./_components/EvaluationMethodology";
import PerFirmStrengthsCautions from "./_components/PerFirmStrengthsCautions";
import SelfVsMarketDelta from "./_components/SelfVsMarketDelta";
import VendorBriefExecutiveSummary from "./_components/VendorBriefExecutiveSummary";
import VendorBriefHelpContent from "./_components/VendorBriefHelpContent";

export const dynamic = "force-dynamic";

type SearchParams = { panel?: string };

type VendorBriefPanelKey =
  | "exec"
  | "method"
  | "positioning"
  | "strengths"
  | "capability"
  | "pat"
  | "help";

const VENDOR_BRIEF_PANELS: ReadonlyArray<VendorBriefPanelKey> = [
  "exec",
  "method",
  "positioning",
  "strengths",
  "capability",
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
    { key: "capability", label: "Capability comparison", href: getPanelHref(ecosystemId, "capability") },
    { key: "pat", label: "Meet PAT", href: getPanelHref(ecosystemId, "pat") },
    { key: "help", label: "Help", href: getPanelHref(ecosystemId, "help") },
  ] as const;

  return (
    <div
      className="space-y-8"
      data-testid="vendor-brief-page"
      data-brief-id={brief.briefId}
    >
      <section className="pat-card p-8" data-testid="vendor-brief-portal-hero">
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
        <section data-testid="vendor-brief-positioning-panel">
          <SelfVsMarketDelta data={brief} />
        </section>
      ) : null}
      {activePanel === "strengths" ? (
        <section data-testid="vendor-brief-strengths-panel">
          <PerFirmStrengthsCautions data={brief} />
        </section>
      ) : null}
      {activePanel === "capability" ? (
        <section data-testid="vendor-brief-capability-panel">
          <CapabilityComparison data={brief} />
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
    </div>
  );
}
