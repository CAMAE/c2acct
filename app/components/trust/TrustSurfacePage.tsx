import Link from "next/link";
import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import type { TrustSurface } from "@/lib/trustContent";

type TrustSurfacePageProps = {
  surface: TrustSurface;
  children?: ReactNode;
};

export default function TrustSurfacePage({ surface, children }: TrustSurfacePageProps) {
  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="pat-label mt-6">{surface.eyebrow}</div>
          <span className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-semibold text-[var(--shell-muted)]">
            {surface.statusLabel}
          </span>
        </div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {surface.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {surface.summary}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[var(--shell-muted)]">
          <span>Last updated: {surface.lastUpdated}</span>
          <span aria-hidden="true" className="h-3.5 w-px bg-[var(--shell-border-strong)]" />
          <Link href="/trust" className="font-semibold text-[var(--shell-ink)] hover:text-[var(--shell-accent)]">
            Trust center
          </Link>
        </div>
      </section>

      {children}

      <section className="grid gap-5 lg:grid-cols-2">
        {surface.sections.map((section) => (
          <article key={section.title} className="pat-soft-panel p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {section.body}
            </p>
            {section.bullets ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 px-4 py-3">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
