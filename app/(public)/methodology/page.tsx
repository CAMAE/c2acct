import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";
import {
  METHODOLOGY_VERSION,
  METHODOLOGY_CHANGELOG,
  METHODOLOGY_SECTIONS,
} from "@/lib/methodology";

export const metadata = {
  title: "Methodology | Patalign",
  description:
    "Patalign's stated, versioned aggregation methodology: equal-weight averaging, sample floors, confidence bands, benchmark suppression, and integrity walls.",
};

export default function MethodologyPage() {
  return (
    <TrustSurfacePage surface={getTrustSurface("methodology")}>
      <section className="pat-soft-panel px-6 py-6" aria-label="Methodology version">
        <div className="flex flex-wrap items-center gap-3">
          <span className="pat-label">Version {METHODOLOGY_VERSION}</span>
          <span aria-hidden="true" className="h-3.5 w-px bg-[var(--shell-border-strong)]" />
          <span className="text-sm text-[var(--shell-muted)]">
            Public, versioned methodology. Material changes are announced with the changelog below.
          </span>
        </div>
      </section>

      <section className="space-y-5" aria-label="Methodology detail">
        {METHODOLOGY_SECTIONS.map((section) => (
          <article key={section.key} className="pat-card px-6 py-6">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className="mt-3 text-sm leading-6 text-[var(--shell-muted)]"
              >
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 px-4 py-3"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <section className="pat-soft-panel px-6 py-6" aria-label="Methodology changelog">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">Changelog</h2>
        <ul className="mt-4 space-y-3">
          {METHODOLOGY_CHANGELOG.map((entry) => (
            <li
              key={entry.version}
              className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-[var(--shell-ink)]">
                  v{entry.version}
                </span>
                <span className="text-xs text-[var(--shell-muted)]">{entry.date}</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{entry.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </TrustSurfacePage>
  );
}
