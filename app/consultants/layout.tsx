import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isConsultantAccessEnabled, requireConsultantSession } from "@/lib/consultantAccess";

export const dynamic = "force-dynamic";

export default async function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isConsultantAccessEnabled()) {
    notFound();
  }

  const consultantAccess = await requireConsultantSession("/consultants");

  if (!consultantAccess) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="pat-card p-8">
          <div className="pat-label">Consultant</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Consultant access required
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--shell-muted)]">
            This route is reserved for PAT user accounts with explicit consultant profile and firm-company briefing assignments. If this is a fresh local checkout, apply the latest Prisma migrations first. Otherwise, ask a PAT operator to add consultant access and assign the allowed firm scope.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href="/sign-in?view=consultant">
              Sign in as consultant
            </Link>
            <Link className="pat-button-secondary" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="pat-label">Consultant</div>
            <div className="mt-2 text-lg font-semibold text-[var(--shell-ink)]">
              {consultantAccess.consultantLabel}
            </div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">
              {consultantAccess.assignments.length} assigned firm briefing{consultantAccess.assignments.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/consultants"
              className="rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition hover:border-[rgba(6,54,116,0.32)]"
            >
              Overview
            </Link>
          </div>
        </div>
      </section>

      {children}
    </div>
  );
}
