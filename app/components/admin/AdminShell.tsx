import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageIntro({
  eyebrow = "C2Core",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">{eyebrow}</div>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{description}</p>
    </section>
  );
}

export function AdminPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AdminUtilitySelector({
  activeKey,
  options,
}: {
  activeKey: string;
  options: ReadonlyArray<{ key: string; label: string; href: string }>;
}) {
  return (
    <section className="pat-card p-4">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Link
            key={option.key}
            href={option.href}
            className={option.key === activeKey ? "pat-button-primary" : "pat-button-secondary"}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdminMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{value}</div>
      <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{detail}</div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--shell-border)] bg-white/70 p-5">
      <div className="text-lg font-semibold text-[var(--shell-ink)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{body}</div>
    </div>
  );
}

export function AdminActionLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 transition hover:border-[rgba(6,54,116,0.32)]"
    >
      <div className="text-lg font-semibold text-[var(--shell-ink)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{body}</div>
    </Link>
  );
}
