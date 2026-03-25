import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "muted" | "accent";
};

const toneClassName: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-[var(--shell-panel)]",
  muted: "bg-[var(--shell-panel-soft)]",
  accent: "bg-[linear-gradient(140deg,rgba(210,161,91,0.16),rgba(22,33,44,0.03))]",
};

export default function DashboardPanel({ title, description, children, tone = "default" }: Props) {
  return (
    <section className={`rounded-[24px] border border-[var(--shell-border)] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] ${toneClassName[tone]}`}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
