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
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

export type InsightsModeKey = "pro" | "elite" | "help";

type InsightInfoCard = {
  title: string;
  body: string;
  actions?: ReactNode;
  badgeLabel?: string;
  badgeTone?: "active" | "muted" | "locked";
  tone?: "default" | "muted";
};

type InsightsModePanel = {
  title: string;
  intro: string;
  cards?: readonly InsightSurfaceGridCard[];
  infoCards?: readonly InsightInfoCard[];
  // B9c: honest locked-Elite previews (v2 name + blurred chart) — one component
  // for the index cards, matching the detail surfaces. Takes precedence over
  // `cards` when present (Pro user on the Elite tab).
  lockedPreviews?: readonly LockedElitePreviewProps[];
  columnsClassName?: string;
};

type InsightsModeShellProps = {
  /** R34: the card key whose readout opens on load (?readout=<key>). */
  initialReadoutKey?: string | null;
  activeMode: InsightsModeKey;
  /** 14a — portal the hero chips point their "← Workspace" back link at. Omitted
      on flag-dark surfaces (individual insights) → no chips. */
  audience?: HeroAudience;
  eyebrow: string;
  heroBody: ReactNode;
  proPanel: InsightsModePanel;
  // B8-8: optional — surfaces with no Elite layer omit it (and render no Elite toggle).
  elitePanel?: InsightsModePanel;
  helpPanel: InsightsModePanel;
  title: string;
  toggleAriaLabel: string;
  toggleOptions: ReadonlyArray<{
    key: InsightsModeKey;
    label: string;
    href: string;
  }>;
  audienceTerms?: string[];
  currentStateSummary?: ReactNode;
  heroSupplement?: ReactNode;
};

export default function InsightsModeShell({
  initialReadoutKey,
  activeMode,
  audience,
  eyebrow,
  heroBody,
  proPanel,
  elitePanel,
  helpPanel,
  title,
  toggleAriaLabel,
  toggleOptions,
  audienceTerms,
  currentStateSummary,
  heroSupplement,
}: InsightsModeShellProps) {
  const activePanel =
    activeMode === "pro"
      ? proPanel
      : activeMode === "elite" && elitePanel
        ? elitePanel
        : helpPanel;

  const panelSection = (
    <section className="space-y-4" key={activeMode}>
      <div>
        <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{activePanel.title}</h2>
        <p className="mt-1 text-sm text-[var(--shell-muted)]">{activePanel.intro}</p>
      </div>
      {activePanel.lockedPreviews && activePanel.lockedPreviews.length > 0 ? (
        <section className={`grid gap-5 ${activePanel.columnsClassName ?? "md:grid-cols-2 xl:grid-cols-3"}`}>
          {activePanel.lockedPreviews.map((preview) => (
            <LockedElitePreview key={preview.title} {...preview} />
          ))}
        </section>
      ) : activePanel.cards ? (
        <InsightSurfaceCardGrid
          readoutMode={isNewFrontDoorEnabled() ? "drawer" : "inline"}
          initialReadoutKey={isNewFrontDoorEnabled() ? initialReadoutKey ?? null : null}
          cards={activePanel.cards}
          columnsClassName={activePanel.columnsClassName}
        />
      ) : activePanel.infoCards ? (
        <section className={`grid gap-5 ${activePanel.columnsClassName ?? "xl:grid-cols-3"}`}>
          {activePanel.infoCards.map((card) => (
            <article
              key={card.title}
              className={`${card.tone === "muted" ? "pat-card pat-card-muted" : "pat-card"} p-6`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                {card.badgeLabel ? (
                  <InsightStatusBadge label={card.badgeLabel} tone={card.badgeTone} />
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{card.body}</p>
              {card.actions ? <div className="mt-5 flex flex-wrap gap-3">{card.actions}</div> : null}
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );

  if (isNewFrontDoorEnabled()) {
    // Box 3f items A and F (2026-09-28): the shared page head (portal name as the eyebrow,
    // one H1, the hero body as the subline, the hero chips top-right); the pills collapse
    // to one contextual text link ("Elite insights" on a Pro account, "Pro insights" when
    // another mode is open, nothing on Elite); Help sits in the page footer beside the
    // disclaimer; the grey callout renders only for the zero state the pages pass.
    const proOption = toggleOptions.find((option) => option.key === "pro");
    const eliteOption = toggleOptions.find((option) => option.key === "elite");
    const helpOption = toggleOptions.find((option) => option.key === "help");
    const proAccount = !!(elitePanel?.lockedPreviews && elitePanel.lockedPreviews.length > 0);
    const contextual =
      activeMode !== "pro" && proOption
        ? { href: proOption.href, label: "Pro insights" }
        : proAccount && eliteOption
          ? { href: eliteOption.href, label: "Elite insights" }
          : null;
    return (
      <div className="space-y-8">
        <PageHead
          variant="portal"
          wordmark
          eyebrow={audience ? portalEyebrow(audience) : eyebrow}
          title={<PatAudienceTitle as="span" title={title} audienceTerms={audienceTerms ?? []} />}
          subline={heroBody}
          aside={audience ? <HeroChips audience={audience} /> : null}
          actions={
            contextual ? (
              <Link href={contextual.href} className="text-[var(--brand-c2-blue)] hover:underline" data-testid="insights-contextual-link">
                {contextual.label}
              </Link>
            ) : null
          }
        />
        {currentStateSummary ? (
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]" data-testid="insights-zero-state">
            {currentStateSummary}
          </div>
        ) : null}
        {heroSupplement}
        {panelSection}
        <div className="flex flex-wrap items-center justify-between gap-4" data-testid="insights-page-footer">
          <OutputDisclaimer variant="note" />
          {helpOption ? (
            <Link href={helpOption.href} className="pat-meta font-semibold text-[var(--shell-muted)] hover:text-[var(--shell-ink)]">
              Help
            </Link>
          ) : null}
        </div>
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
        <div className="mt-6">
          <PatModeToggle
            activeKey={activeMode}
            ariaLabel={toggleAriaLabel}
            options={toggleOptions}
          />
        </div>
      </section>
      {heroSupplement}

      {panelSection}
      <OutputDisclaimer variant="note" />
    </div>
  );
}
