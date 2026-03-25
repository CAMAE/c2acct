import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function PatDashboardShell({ eyebrow, title, description, children }: Props) {
  return (
    <section className="text-[var(--shell-ink)]">
      <div className="mb-10 rounded-[28px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
          {eyebrow}
        </div>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{description}</p>
      </div>

      <div className="grid gap-6">{children}</div>
    </section>
  );
}
