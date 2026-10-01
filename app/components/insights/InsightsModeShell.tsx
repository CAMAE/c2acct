import Link from "next/link";
import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PageHead, { portalEyebrow } from "@/app/components/shell/PageHead";
import HeroChips from "@/app/components/pat/HeroChips";
import type { HeroAudience } from "@/app/components/pat/HeroChipsView";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import InsightSurfaceCardGrid, { type InsightSurfaceGridCard } from "@/app/components/insights/InsightSurfaceCardGrid";
import LockedElitePreview, { type LockedElitePreviewProps } from "@/app/components/insights/LockedElitePreview";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/**
 * Box 3h (R58, Cam 10/01): the insight hub has no modes. One page: the head, the
 * zero-state callout, the operating brief (firm), then the ELITE section above the
 * Pro section. An Elite account sees its live Elite cards; a Pro account sees the
 * locked previews and one "Elite insights" text link in the head that jumps to
 * them. Help sits in the page footer beside the disclaimer. The ?mode param and the
 * Pro / Elite / Help pills are gone (the hubs redirect ?mode to themselves).
 */
type InsightInfoCard = {
  title: string;
  body: string;
  actions?: ReactNode;
  badgeLabel?: string;
  badgeTone?: "active" | "muted" | "locked";
  tone?: "default" | "muted";
};

export type InsightsModePanel = {
  title: string;
  intro: string;
  cards?: readonly InsightSurfaceGridCard[];
  infoCards?: readonly InsightInfoCard[];
  // B9c: honest locked-Elite previews (v2 name + blurred chart) — one component
  // for the index cards, matching the detail surfaces. Takes precedence over
  // `cards` when present (a Pro account's Elite section).
  lockedPreviews?: readonly LockedElitePreviewProps[];
  columnsClassName?: string;
};

type InsightsModeShellProps = {
  /** R34: the card key whose readout opens on load (?readout=<key>). */
  initialReadoutKey?: string | null;
  /** 14a — portal the hero chips point their "← Workspace" back link at. Omitted
      on flag-dark surfaces (individual insights) → no chips. */
  audience?: HeroAudience;
  eyebrow: string;
  heroBody: ReactNode;
  proPanel: InsightsModePanel;
  /** The Elite section, rendered ABOVE the Pro section. Surfaces with no Elite layer omit it. */
  elitePanel?: InsightsModePanel;
  /** The page-footer Help link (the portal's help panel). */
  helpHref: string;
  title: string;
  audienceTerms?: string[];
  currentStateSummary?: ReactNode;
  heroSupplement?: ReactNode;
};

const ELITE_SECTION_ID = "elite-insights";

function PanelSection({
  panel,
  id,
  initialReadoutKey,
  testId,
}: {
  panel: InsightsModePanel;
  id?: string;
  initialReadoutKey: string | null;
  testId: string;
}) {
  return (
    <section className="space-y-4 scroll-mt-24" id={id} data-testid={testId}>
      <div>
        <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{panel.title}</h2>
        <p className="mt-1 text-sm text-[var(--shell-muted)]">{panel.intro}</p>
      </div>
      {panel.lockedPreviews && panel.lockedPreviews.length > 0 ? (
        <section className={`grid gap-5 ${panel.columnsClassName ?? "md:grid-cols-2 xl:grid-cols-3"}`}>
          {panel.lockedPreviews.map((preview) => (
            <LockedElitePreview key={preview.title} {...preview} />
          ))}
        </section>
      ) : panel.cards ? (
        <InsightSurfaceCardGrid
          readoutMode={isNewFrontDoorEnabled() ? "drawer" : "inline"}
          initialReadoutKey={isNewFrontDoorEnabled() ? initialReadoutKey : null}
          cards={panel.cards}
          columnsClassName={panel.columnsClassName}
        />
      ) : panel.infoCards ? (
        <section className={`grid gap-5 ${panel.columnsClassName ?? "xl:grid-cols-3"}`}>
          {panel.infoCards.map((card) => (
            <article key={card.title} className={`${card.tone === "muted" ? "pat-card pat-card-muted" : "pat-card"} p-6`}>
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                {card.badgeLabel ? <InsightStatusBadge label={card.badgeLabel} tone={card.badgeTone} /> : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{card.body}</p>
              {card.actions ? <div className="mt-5 flex flex-wrap gap-3">{card.actions}</div> : null}
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}

export default function InsightsModeShell({
  initialReadoutKey,
  audience,
  eyebrow,
  heroBody,
  proPanel,
  elitePanel,
  helpHref,
  title,
  audienceTerms,
  currentStateSummary,
  heroSupplement,
}: InsightsModeShellProps) {
  const readoutKey = initialReadoutKey ?? null;
  const proAccount = !!(elitePanel?.lockedPreviews && elitePanel.lockedPreviews.length > 0);
  const eliteLink = proAccount ? (
    <Link href={`#${ELITE_SECTION_ID}`} className="text-[var(--brand-c2-blue)] hover:underline" data-testid="insights-contextual-link">
      Elite insights
    </Link>
  ) : null;
  const sections = (
    <>
      {elitePanel ? <PanelSection panel={elitePanel} id={ELITE_SECTION_ID} initialReadoutKey={readoutKey} testId="insights-elite-section" /> : null}
      <PanelSection panel={proPanel} initialReadoutKey={readoutKey} testId="insights-pro-section" />
      <div className="flex flex-wrap items-center justify-between gap-4" data-testid="insights-page-footer">
        <OutputDisclaimer variant="note" />
        <Link href={helpHref} className="pat-meta font-semibold text-[var(--shell-muted)] hover:text-[var(--shell-ink)]">
          Help
        </Link>
      </div>
    </>
  );

  if (isNewFrontDoorEnabled()) {
    return (
      <div className="space-y-8">
        <PageHead
          variant="portal"
          wordmark
          eyebrow={audience ? portalEyebrow(audience) : eyebrow}
          title={<PatAudienceTitle as="span" title={title} audienceTerms={audienceTerms ?? []} />}
          subline={heroBody}
          aside={audience ? <HeroChips audience={audience} /> : null}
          actions={eliteLink}
        />
        {currentStateSummary ? (
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]" data-testid="insights-zero-state">
            {currentStateSummary}
          </div>
        ) : null}
        {heroSupplement}
        {sections}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="pat-card relative p-8">
        {audience ? <HeroChips audience={audience} /> : null}
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{eyebrow}</div>
        <PatAudienceTitle
          as="h1"
          title={title}
          audienceTerms={audienceTerms ?? []}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{heroBody}</p>
        {currentStateSummary ? (
          <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {currentStateSummary}
          </div>
        ) : null}
        {eliteLink ? <div className="pat-meta mt-6 font-semibold">{eliteLink}</div> : null}
      </section>
      {heroSupplement}
      {sections}
    </div>
  );
}
