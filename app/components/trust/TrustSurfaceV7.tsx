import type { ReactNode } from "react";
import type { TrustSurface, TrustSurfaceSection } from "@/lib/trustContent";
import PageHead, { monthYear } from "@/app/components/shell/PageHead";

/**
 * Facelift Part 1 (B3) — the re-laid trust surface, rendered ONLY behind
 * PAT_ENABLE_NEW_FRONT_DOOR (each page keeps its flag-off TrustSurfacePage
 * branch untouched). One column at the token container width, optional
 * right-rail table of contents on desktop (a compact list above the content on
 * narrow screens, so 390px never scrolls sideways), numbered sections, a
 * designed disclosure block, an FAQ accordion (native <details>, no JS), and a
 * compact link list. Every string comes from the content model handed in — no
 * wording lives here.
 *
 * Box 3f item A (2026-09-28): the header is the shared PageHead band (eyebrow, one
 * full-width H1, the summary as the subline, one quiet updated line, "Trust center"
 * as the contextual link). The version/date badges are gone; `updated` carries the
 * one line ("Updated April 2026" by default, from the surface's lastUpdated).
 * Box 3f item D: one centred reading column (760px), no right rail (the contents rail
 * stays a help-center pattern), no link strip, no disclosure aside — every section
 * renders the same way. `wide` renders at the container width above the column
 * (the trust cards).
 */

export type TrustSurfaceV7Props = {
  surface: TrustSurface;
  /** Overrides the surface title (used once, for /trust per the ruling). */
  title?: string;
  /** Overrides the surface eyebrow (box 3f item D: /trust reads "Trust"). */
  eyebrow?: string;
  /** The quiet updated line; defaults to "Updated <Month Year>" from the surface. */
  updated?: string;
  /** Rendered first, above the sections (e.g. the support contact block). */
  lead?: ReactNode;
  /** Sections to render; defaults to the surface's own. */
  sections?: readonly TrustSurfaceSection[];
  /** Prefix each section heading with its number. */
  numbered?: boolean;
  /** Section titles whose bullets render in .pat-mono (e.g. Subprocessors). */
  monoBulletTitles?: readonly string[];
  /** Optional question/answer items. The accordion renders only when there are items. */
  faqItems?: readonly { question: string; answer: string }[];
  /** Rendered at the container width between the head and the reading column (the trust cards). */
  wide?: ReactNode;
  /** Extra content after the sections (release table, changelog). */
  children?: ReactNode;
};

function sectionId(index: number) {
  return `s-${index + 1}`;
}

function SectionBody({ section, mono }: { section: TrustSurfaceSection; mono: boolean }) {
  return (
    <>
      <p className="pat-body mt-3 max-w-[44rem] whitespace-pre-line text-[var(--shell-muted)]">{section.body}</p>
      {section.table ? (
        <div className="mt-4 max-w-[44rem] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[var(--shell-muted)]">
                {section.table.columns.map((column) => (
                  <th key={column} className="py-2 pr-4 font-medium">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row) => (
                <tr key={row.join("|")} className="border-t border-[var(--shell-border)]">
                  {row.map((cell, index) => (
                    <td key={`${index}-${cell}`} className="py-2 pr-4 text-[var(--shell-ink)]">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {section.bullets ? (
        <ul className={`mt-4 grid gap-2 ${mono ? "pat-mono" : "pat-body"} text-[var(--shell-muted)]`}>
          {section.bullets.map((bullet) => (
            <li key={bullet} className="rounded-[var(--radius-control)] border border-[var(--shell-border)] bg-white px-4 py-3">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function TrustSurfaceV7({
  surface,
  title,
  eyebrow,
  updated,
  lead,
  sections,
  numbered = false,
  monoBulletTitles = [],
  faqItems = [],
  wide,
  children,
}: TrustSurfaceV7Props) {
  const body = sections ?? surface.sections;

  const contents = (
    <div className="min-w-0">
      {lead}
      {faqItems.length > 0 ? (
        <div className="mt-8 border-t border-[var(--shell-border)]" data-testid="trust-faq">
          {faqItems.map((item) => (
            <details key={item.question} className="group border-b border-[var(--shell-border)] py-4">
              <summary className="pat-h3 flex cursor-pointer list-none items-center justify-between gap-4 text-[var(--shell-ink)] [&::-webkit-details-marker]:hidden">
                {item.question}
                <span aria-hidden="true" className="pat-mono text-[var(--shell-muted)] group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="pat-mono hidden text-[var(--shell-muted)] group-open:inline">
                  −
                </span>
              </summary>
              <p className="pat-body mt-3 max-w-[44rem] whitespace-pre-line text-[var(--shell-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      ) : null}
      <div className={`grid gap-8 ${lead || faqItems.length > 0 ? "mt-8" : ""}`}>
          {body.map((section, index) => (
            <section key={section.title} id={sectionId(index)} className="scroll-mt-24">
              <h2 className="pat-h2 text-[var(--shell-ink)]">
                {numbered ? <span className="pat-mono mr-3 text-[var(--shell-muted)]">{index + 1}.</span> : null}
                {section.title}
              </h2>
              <SectionBody section={section} mono={monoBulletTitles.includes(section.title)} />
            </section>
          ))}
        </div>
      {children}
    </div>
  );

  return (
    <>
      {/* A3 (box 2b, Cam 9/14 "all as recommended"): production's "Trust center" link on
          every trust surface — the page head's one contextual link. */}
      <PageHead
        eyebrow={eyebrow ?? surface.eyebrow}
        title={title ?? surface.title}
        subline={surface.summary}
        updated={updated ?? `Updated ${monthYear(surface.lastUpdated)}`}
        link={{ href: "/trust", label: "Trust center" }}
      />
    {wide ? <div className="pat-container px-6 pt-12">{wide}</div> : null}
    <div className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-12" data-testid="trust-surface-v7" data-surface={surface.key}>
      {contents}
    </div>
    </>
  );
}
