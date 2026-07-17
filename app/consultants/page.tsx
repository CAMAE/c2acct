import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import HeroChips from "@/app/components/pat/HeroChips";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import PortalPanelSelector from "@/app/components/pat/PortalPanelSelector";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import ConsultantHelpContent from "@/app/components/consultants/ConsultantHelpContent";
import EcosystemListCard from "./_components/EcosystemListCard";
import FreshnessBoard from "./_components/FreshnessBoard";
import {
  isConsultantAccessEnabled,
  requireConsultantSession,
} from "@/lib/consultantAccess";
import {
  getEcosystemListForConsultant,
  type EcosystemListCardData,
} from "@/lib/ecosystem";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import {
  getConsultantFreshnessBoard,
  type ConsultantFreshnessBoard,
} from "@/lib/consultantFreshness";

export const dynamic = "force-dynamic";

type SearchParams = {
  panel?: string;
};

type ConsultantPanelKey = "ecosystems" | "freshness" | "pat" | "help";

function getPanelHref(panel: ConsultantPanelKey): string {
  return panel === "ecosystems" ? "/consultants" : `/consultants?panel=${panel}`;
}

export default async function ConsultantOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  if (!isConsultantAccessEnabled()) {
    notFound();
  }
  const consultantAccess = await requireConsultantSession("/consultants");
  if (!consultantAccess) {
    return null;
  }

  // The freshness board is part of the engagement system — dark until pings ship.
  const freshnessEnabled = isPingsEnabled();

  const params = searchParams ? await searchParams : undefined;
  const requestedPanel = params?.panel;
  const activePanel: ConsultantPanelKey =
    requestedPanel === "freshness" && freshnessEnabled
      ? "freshness"
      : requestedPanel === "pat" || requestedPanel === "help"
        ? requestedPanel
        : "ecosystems";

  const panelOptions = [
    { key: "ecosystems", label: "Ecosystems", href: getPanelHref("ecosystems") },
    ...(freshnessEnabled
      ? [{ key: "freshness", label: "Freshness", href: getPanelHref("freshness") }]
      : []),
    { key: "pat", label: "Meet PAT", href: getPanelHref("pat") },
    { key: "help", label: "Help", href: getPanelHref("help") },
  ] as const;

  // Only fetch the ecosystem list when the Ecosystems panel is active.
  let cards: EcosystemListCardData[] = [];
  let aggregationError: string | null = null;
  if (activePanel === "ecosystems") {
    try {
      cards = await getEcosystemListForConsultant(consultantAccess.consultantProfileId);
    } catch (error) {
      aggregationError = error instanceof Error ? error.message : "Unknown aggregation error.";
    }
  }

  // Fetch the freshness board only when its panel is active.
  let freshnessBoard: ConsultantFreshnessBoard | null = null;
  if (activePanel === "freshness") {
    freshnessBoard = await getConsultantFreshnessBoard(consultantAccess);
  }

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8" data-testid="consultant-portal-hero">
        <HeroChips audience="consultant" />
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label="Consultant portal"
          audienceLabel="Consultant"
        />
        <PatAudienceTitle
          as="h1"
          title="Your assigned ecosystems"
          audienceTerms={["ecosystems"]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[var(--shell-muted)]">
          An ecosystem is a software vendor and the firms invited to assess its products.
        </p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Review the ecosystems you have been assigned to, drill into vendor and firm
          briefings, and use Meet PAT for context on what each surface is doing under
          the hood.
        </p>
        <div className="mt-6">
          <PortalPanelSelector activeKey={activePanel} options={panelOptions} />
        </div>
      </section>

      {activePanel === "ecosystems" ? (
        <section
          data-testid="consultant-ecosystems-panel"
          className="space-y-4"
        >
          {aggregationError ? (
            <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
              Could not load your ecosystems. {aggregationError}. Contact support if this persists.
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
              You don&apos;t have any ecosystems assigned yet. Ask your admin to assign you to an ecosystem before signing back in.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {cards.map((card) => (
                <EcosystemListCard key={card.ecosystemId} data={card} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activePanel === "freshness" && freshnessBoard ? (
        <section data-testid="consultant-freshness-panel" className="space-y-4">
          <FreshnessBoard board={freshnessBoard} />
        </section>
      ) : null}

      {activePanel === "pat" ? (
        <section data-testid="consultant-meetpat-panel">
          <MeetPatContent />
        </section>
      ) : null}

      {activePanel === "help" ? (
        <section data-testid="consultant-help-panel">
          <ConsultantHelpContent />
        </section>
      ) : null}
    </div>
  );
}
