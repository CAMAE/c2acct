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
      <div className="pat-card mb-10 overflow-hidden p-8">
        <div className="pat-label">{eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{description}</p>
      </div>

      <div className="grid gap-6">{children}</div>
    </section>
  );
}
