import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import OutputDisclaimer from "@/app/components/trust/OutputDisclaimer";

/**
 * Shared chrome for an Elite Insights v2 decision product: hero (eyebrow/title/
 * summary) → the chart-led card body → the standing directional disclaimer.
 */
export default function EliteCardShell({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section className="pat-card px-7 py-8">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{eyebrow}</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">{summary}</p>
      </section>
      {children}
      <OutputDisclaimer variant="note" />
    </div>
  );
}

/** Truthful-scope empty state for a surface whose evidence is too thin. */
export function EliteEmptyState({ message }: { message: string }) {
  return (
    <section className="pat-card p-6">
      <div className="pat-label">Not enough evidence yet</div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{message}</p>
    </section>
  );
}
