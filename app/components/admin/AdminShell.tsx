import Link from "next/link";
import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";

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
      <PatLogoLockup mode="hero" tone="light" />
      <div className="pat-label mt-6">{eyebrow}</div>
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
    <section className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5">
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
    <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">{label}</div>
      <div className="mt-2 text-[2rem] font-semibold tracking-tight text-[var(--shell-ink)] md:text-[2.15rem]">{value}</div>
      <div className="mt-2.5 text-sm leading-6 text-[var(--shell-muted)]">{detail}</div>
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
      className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-4 transition hover:border-[rgba(6,54,116,0.32)]"
    >
      <div className="text-lg font-semibold text-[var(--shell-ink)]">{title}</div>
      <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{body}</div>
    </Link>
  );
}
