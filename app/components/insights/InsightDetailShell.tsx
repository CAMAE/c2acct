import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatModeToggle, { type PatModeToggleOption } from "@/app/components/pat/PatModeToggle";
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
}: InsightDetailShellProps) {
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
            navigationMode="replace"
          />
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{surfaceContent.title}</div>
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
      </section>

      {children}
    </div>
  );
}
