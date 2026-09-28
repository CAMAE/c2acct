import Link from "next/link";
import type { ReactNode } from "react";
import { PatBrandMark } from "@/app/components/brand/BrandMarks";
import { guideWord } from "@/lib/roleWords";

/**
 * Box 3f item A (R52, 2026-09-28): the one page-head pattern every public page and
 * every portal page uses. Top to bottom: eyebrow (public: the surface's own; portals:
 * the portal name), one full-width H1, one subline, an optional quiet updated line
 * (plain text, no badge) and an optional single contextual link on the right.
 *
 * On the public pages the wordmark row with the descriptor "Performance Alignment
 * Technology" under the PAT logo lives in the shell header (V7PublicShell); portal
 * pages render it at the top of the head (`wordmark`), where the old hero card put
 * the lockup. Three variants: "hero" (Home: centred, no band), "band" (public
 * reading pages: tinted band, left aligned) and "portal" (signed-in pages: the same
 * band, smaller type). Flag-on only: every caller is inside a PAT_ENABLE_NEW_FRONT_DOOR
 * branch. No copy of its own.
 */
export type PageHeadLink = { href: string; label: string };

export type PageHeadProps = {
  variant?: "hero" | "band" | "portal";
  eyebrow?: string;
  title: ReactNode;
  subline?: ReactNode;
  /** Quiet meta line, e.g. "Methodology v1.3, updated July 2026" or "Updated April 2026". */
  updated?: string;
  /** One contextual link, rendered on the right of the head. */
  link?: PageHeadLink | null;
  /** Portal pages: the PAT mark with the descriptor directly under it, above the eyebrow. */
  wordmark?: boolean;
  /** Portal pages: the hero chips (Workspace / tier / Upgrade), positioned top-right. */
  aside?: ReactNode;
  /** Portal pages: the one contextual text link row under the subline (item F). */
  actions?: ReactNode;
  className?: string;
};

/** Item A (F7): the eyebrow above a portal H1 is the portal name, never the H1 again. */
export function portalEyebrow(audience: "firm" | "vendor" | "consultant" | "individual"): string {
  if (audience === "consultant") return `${guideWord()} portal`;
  if (audience === "vendor") return "Vendor portal";
  if (audience === "individual") return "Individual portal";
  return "Firm portal";
}

/** "April 28, 2026" -> "April 2026" (the quiet updated line names the month only). */
export function monthYear(date: string): string {
  const match = date.match(/^([A-Za-z]+)\s+\d{1,2},\s*(\d{4})$/);
  return match ? `${match[1]} ${match[2]}` : date;
}

export default function PageHead({
  variant = "band",
  eyebrow,
  title,
  subline,
  updated,
  link,
  wordmark = false,
  aside,
  actions,
  className = "",
}: PageHeadProps) {
  const hero = variant === "hero";
  const portal = variant === "portal";
  const outer = hero
    ? "px-6 pb-12 pt-16 text-center sm:px-9 sm:pb-14 sm:pt-20"
    : portal
      ? "relative rounded-[var(--radius-card)] border border-[var(--shell-border)] bg-[#eef3f9] px-6 pb-7 pt-7 sm:px-8"
      : "border-b border-[var(--shell-border)] bg-[#eef3f9] px-6 pb-9 pt-10 sm:px-9";
  const inner = hero ? "mx-auto max-w-[1120px]" : "mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-x-8 gap-y-4";
  return (
    <header className={`${outer} ${className}`.trim()} data-page-head={variant} data-testid="page-head">
      {aside}
      <div className={inner}>
        <div className={hero ? "" : "min-w-0 max-w-[52rem]"}>
          {wordmark ? (
            <div className="mb-5 flex flex-col items-start gap-1" data-testid="page-head-wordmark">
              <PatBrandMark mode="hero" />
              <span className="brand-pat-submark leading-none" data-testid="wordmark-descriptor">Performance Alignment Technology</span>
            </div>
          ) : null}
          {eyebrow ? <div className="pat-label">{eyebrow}</div> : null}
          <h1 className={`pat-page-head-title text-[var(--shell-ink)] ${eyebrow ? "mt-3" : ""} ${hero ? "mx-auto max-w-[18em]" : ""}`.trim()}>
            {title}
          </h1>
          {subline ? <p className={`pat-page-head-sub mt-4 text-[var(--shell-muted)] ${hero ? "mx-auto max-w-[40em]" : ""}`.trim()}>{subline}</p> : null}
          {updated ? (
            <p className="pat-meta mt-4 text-[var(--shell-muted)]" data-testid="page-head-updated">
              {updated}
            </p>
          ) : null}
          {actions ? (
            <div className="pat-meta mt-5 flex flex-wrap items-center gap-5 font-semibold" data-testid="page-head-actions">
              {actions}
            </div>
          ) : null}
        </div>
        {link ? (
          <Link href={link.href} className="pat-meta shrink-0 font-semibold text-[var(--shell-ink)] hover:text-[var(--shell-accent)]" data-testid="page-head-link">
            {link.label}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
