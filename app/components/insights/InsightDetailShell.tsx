import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PageHead, { portalEyebrow } from "@/app/components/shell/PageHead";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";
import type { InsightSurfaceContent } from "@/lib/insightSurface";

type InsightDetailShellProps = {
  eyebrow: string;
  /** Box 3f item A (F7): flag-on the eyebrow is the portal name, never the surface's own. */
  audience?: "firm" | "vendor" | "consultant" | "individual";
  title: ReactNode;
  summary: ReactNode;
  surfaceContent: InsightSurfaceContent;
  combinedEvidenceText: ReactNode;
  children?: ReactNode;
  combinedEvidenceLabel?: string;
  combinedEvidenceNote?: ReactNode;
  muted?: boolean;
  subtitle?: ReactNode;
  /** Chart-led summary rendered between the hero and the prose surface. */
  visualLead?: ReactNode;
};

export default function InsightDetailShell({
  eyebrow,
  audience,
  title,
  summary,
  surfaceContent,
  combinedEvidenceText,
  children,
  combinedEvidenceLabel = "Combined evidence",
  combinedEvidenceNote,
  muted = false,
  subtitle,
  visualLead,
}: InsightDetailShellProps) {
  // Elite-stacking guard: on the locked Elite boundary surface (?surface=elite),
  // the Pro visual lead ("Current readout" + real module scores) must NOT render
  // — it would stack real Pro data behind the locked Elite teaser and leak the
  // paywalled readout. The elite surface carries key "elite" across every insight
  // surface (firm, vendor alignment, vendor product), so gating here fixes all of
  // them at the shared component. Keyboard/other surfaces are unaffected.
  const isEliteBoundarySurface = surfaceContent.key === "elite";
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
            {/* Box 3f item C: the item title inherits 11.5px from the root; flag-on it sits on the body token. */}
            <div className={isNewFrontDoorEnabled() ? "pat-body font-semibold text-[var(--shell-ink)]" : "font-semibold text-[var(--shell-ink)]"}>{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{item.body}</p>
          </article>
        ))}
      </div>
    </>
  );

  return (
    <div className="space-y-8">
      {isNewFrontDoorEnabled() ? (
        // Box 3f items A and H (2026-09-28, flag-on): the shared page head (eyebrow, one H1,
        // the summary as the subline); the evidence note is gone. Box 3h (R58, Cam 10/01):
        // no Pro / Elite / Help pill on any full view.
        <section className="space-y-4">
          <PageHead
            variant="portal"
            wordmark
            eyebrow={audience ? portalEyebrow(audience) : eyebrow}
            title={title}
            subline={
              subtitle ? (
                <>
                  {summary} <span className="pat-meta block pt-1 font-medium">{subtitle}</span>
                </>
              ) : (
                summary
              )
            }
          />
        </section>
      ) : (
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
      </section>
      )}

      {visibleVisualLead}

      {/* Current limits and Evidence provenance render inline at the end of every full view.
          The "Full prose readout" collapse the firm view carried is ruled out (Cam 10/02,
          membership-enterprise box rider; ops/qa/link-removals.json). */}
      <section className="pat-card p-6">
        <div className="pat-label">{surfaceContent.title}</div>
        {surfaceBody}
      </section>

      {children}
      <OutputDisclaimer variant="note" />
    </div>
  );
}
