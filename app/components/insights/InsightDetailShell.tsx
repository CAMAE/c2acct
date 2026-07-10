import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatModeToggle, { type PatModeToggleOption } from "@/app/components/pat/PatModeToggle";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import type { InsightSurfaceContent } from "@/lib/insightSurface";

type InsightDetailShellProps = {
  activeKey: string;
  eyebrow: string;
  title: ReactNode;
  summary: ReactNode;
  surfaceContent: InsightSurfaceContent;
  toggleAriaLabel: string;
  toggleOptions: readonly PatModeToggleOption[];
  combinedEvidenceText: ReactNode;
  children?: ReactNode;
  combinedEvidenceLabel?: string;
  combinedEvidenceNote?: ReactNode;
  muted?: boolean;
  subtitle?: ReactNode;
  /** Chart-led summary rendered between the hero and the prose surface. */
  visualLead?: ReactNode;
  /** Collapse the prose surface behind a disclosure (used when a visual lead carries the page). */
  surfaceCollapsed?: boolean;
};

export default function InsightDetailShell({
  activeKey,
  eyebrow,
  title,
  summary,
  surfaceContent,
  toggleAriaLabel,
  toggleOptions,
  combinedEvidenceText,
  children,
  combinedEvidenceLabel = "Combined evidence",
  combinedEvidenceNote,
  muted = false,
  subtitle,
  visualLead,
  surfaceCollapsed = false,
}: InsightDetailShellProps) {
  // Elite-stacking guard: on the locked Elite boundary surface (?surface=elite),
  // the Pro visual lead ("Current readout" + real module scores) must NOT render
  // — it would stack real Pro data behind the locked Elite teaser and leak the
  // paywalled readout. The elite surface carries key "elite" across every insight
  // surface (firm, vendor alignment, vendor product), so gating here fixes all of
  // them at the shared component. Keyboard/other surfaces are unaffected.
  const isEliteBoundarySurface = activeKey === "elite" || surfaceContent.key === "elite";
  const visibleVisualLead = isEliteBoundarySurface ? null : visualLead;

  const surfaceBody = (
    <>
      <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{surfaceContent.intro}</p>
      <div className="mt-4 grid gap-3">
        {surfaceContent.items.map((item) => (
          <article
            key={`${surfaceContent.key}-${item.title}`}
            className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4"
          >
            <div className="font-semibold text-[var(--shell-ink)]">{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{item.body}</p>
          </article>
        ))}
      </div>
    </>
  );

  return (
    <div className="space-y-8">
      <section className={`${muted ? "pat-card pat-card-muted" : "pat-card"} p-8`}>
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm font-medium text-[var(--shell-muted)]">{subtitle}</p> : null}
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{summary}</p>
        <div className="mt-6 pat-soft-panel p-5">
          <div className="pat-label">{combinedEvidenceLabel}</div>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{combinedEvidenceText}</p>
          {combinedEvidenceNote ? (
            <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{combinedEvidenceNote}</div>
          ) : null}
        </div>
        <div className="mt-6">
          <PatModeToggle
            activeKey={activeKey}
            ariaLabel={toggleAriaLabel}
            options={toggleOptions}
          />
        </div>
      </section>

      {visibleVisualLead}

      {surfaceCollapsed ? (
        <details className="group pat-card p-6">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span className="pat-label">{surfaceContent.title} · evidence detail</span>
            <span className="pat-button-secondary gap-2">
              Full prose readout
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              >
                <path
                  d="M3.5 6 8 10.5 12.5 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>
          {surfaceBody}
        </details>
      ) : (
        <section className="pat-card p-6">
          <div className="pat-label">{surfaceContent.title}</div>
          {surfaceBody}
        </section>
      )}

      {children}
      <OutputDisclaimer variant="note" />
    </div>
  );
}
