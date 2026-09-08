import Link from "next/link";
import type { ReactNode } from "react";
import type { TrustSurface, TrustSurfaceSection } from "@/lib/trustContent";

/**
 * Facelift Part 1 (B3) — the re-laid trust surface, rendered ONLY behind
 * PAT_ENABLE_NEW_FRONT_DOOR (each page keeps its flag-off TrustSurfacePage
 * branch untouched). One column at the token container width, optional
 * right-rail table of contents on desktop (a compact list above the content on
 * narrow screens, so 390px never scrolls sideways), numbered sections, a
 * designed disclosure block, an FAQ accordion (native <details>, no JS), mono
 * chips for versions / dates / release ids, and a compact link list. Every
 * string comes from the content model handed in — no wording lives here.
 */
export type TrustChip = { label: string; mono?: boolean };

export type TrustSurfaceV7Props = {
  surface: TrustSurface;
  /** Overrides the surface title (used once, for /trust per the ruling). */
  title?: string;
  chips?: TrustChip[];
  /** Rendered first, above the sections (e.g. the support contact block). */
  lead?: ReactNode;
  /** Sections to render; defaults to the surface's own. */
  sections?: readonly TrustSurfaceSection[];
  /** Right-rail table of contents on desktop (built from the sections). */
  toc?: boolean;
  /** Prefix each section heading with its number. */
  numbered?: boolean;
  /** Section title rendered as the designed disclosure instead of a section. */
  disclosureTitle?: string;
  /** Section titles whose bullets render in .pat-mono (e.g. Subprocessors). */
  monoBulletTitles?: readonly string[];
  /** Render the remaining sections as an FAQ accordion instead of sections. */
  faq?: boolean;
  /** Compact link list (e.g. the trust set) rendered after the lead. */
  links?: readonly { href: string; label: string }[];
  /** Extra content after the sections (release table, changelog). */
  children?: ReactNode;
};

function sectionId(index: number) {
  return `s-${index + 1}`;
}

function SectionBody({ section, mono }: { section: TrustSurfaceSection; mono: boolean }) {
  return (
    <>
      <p className="pat-body mt-3 text-[var(--shell-muted)]">{section.body}</p>
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
  chips = [],
  lead,
  sections,
  toc = false,
  numbered = false,
  disclosureTitle,
  monoBulletTitles = [],
  faq = false,
  links,
  children,
}: TrustSurfaceV7Props) {
  const all = sections ?? surface.sections;
  const disclosure = disclosureTitle ? all.find((section) => section.title === disclosureTitle) ?? null : null;
  const body = all.filter((section) => section !== disclosure);
  const tocItems = toc ? body.map((section, index) => ({ id: sectionId(index), label: section.title, n: index + 1 })) : [];

  const contents = (
    <div className="min-w-0">
      {lead}
      {links ? (
        <nav aria-label="Trust surfaces" className="mt-8">
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="pat-body flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--shell-border)] bg-white px-4 py-3 font-semibold text-[var(--shell-ink)] hover:border-[var(--shell-ink)]"
                >
                  {link.label}
                  <span aria-hidden="true" className="text-[var(--shell-muted)]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {disclosure ? (
        <aside
          role="note"
          aria-label={disclosure.title}
          className="mt-8 rounded-[var(--radius-card)] border border-[var(--shell-ink)] bg-white px-5 py-4"
          data-testid="trust-disclosure"
        >
          <div className="pat-label">{disclosure.title}</div>
          <p className="pat-body mt-2 text-[var(--shell-ink)]">{disclosure.body}</p>
        </aside>
      ) : null}
      {faq ? (
        <div className="mt-8 border-t border-[var(--shell-border)]" data-testid="trust-faq">
          {body.map((section) => (
            <details key={section.title} className="group border-b border-[var(--shell-border)] py-4">
              <summary className="pat-h3 flex cursor-pointer list-none items-center justify-between gap-4 text-[var(--shell-ink)] [&::-webkit-details-marker]:hidden">
                {section.title}
                <span aria-hidden="true" className="pat-mono text-[var(--shell-muted)] group-open:hidden">
                  +
                </span>
                <span aria-hidden="true" className="pat-mono hidden text-[var(--shell-muted)] group-open:inline">
                  −
                </span>
              </summary>
              <SectionBody section={section} mono={false} />
            </details>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
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
      )}
      {children}
    </div>
  );

  return (
    <div className="pat-container px-6 pb-20 pt-12" data-testid="trust-surface-v7" data-surface={surface.key}>
      <header className="max-w-[44rem]">
        <div className="pat-label">{surface.eyebrow}</div>
        <h1 className="pat-h1 mt-3 text-[var(--shell-ink)]">{title ?? surface.title}</h1>
        <p className="pat-body mt-4 text-[var(--shell-muted)]">{surface.summary}</p>
        {chips.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2" data-testid="trust-chips">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center rounded-[var(--radius-control)] border border-[var(--shell-border)] bg-white px-2.5 py-1 text-[var(--shell-ink)] ${chip.mono ? "pat-mono" : "pat-meta font-semibold"}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      {toc && tocItems.length > 0 ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          {contents}
          <nav aria-label="On this page" className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start" data-testid="trust-toc">
            <div className="pat-label">On this page</div>
            <ol className="pat-meta mt-3 grid gap-1.5">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="flex gap-2 text-[var(--shell-muted)] hover:text-[var(--shell-ink)]">
                    <span className="pat-mono w-6 shrink-0">{item.n}.</span>
                    <span className="min-w-0">{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      ) : (
        <div className="mt-10 max-w-[44rem]">{contents}</div>
      )}
    </div>
  );
}
