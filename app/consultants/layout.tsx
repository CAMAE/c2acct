import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { isConsultantAccessEnabled, requireConsultantSession } from "@/lib/consultantAccess";
import { enforceAudience } from "@/lib/audienceGuard";
import PortalHeroChips from "@/app/components/pat/PortalHeroChips";

export const dynamic = "force-dynamic";

export default async function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isConsultantAccessEnabled()) {
    notFound();
  }

  // 13a: strict role wall — firm/vendor/individual/admin accounts are redirected
  // to their own portal before the consultant-scope checks run.
  await enforceAudience("consultant");

  const consultantAccess = await requireConsultantSession("/consultants");

  if (!consultantAccess) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="pat-card p-8">
          <PatLogoLockup mode="hero" tone="light" />
          <div className="pat-label mt-6">Consultant</div>
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
      {/* 14a — consultants have no membership tier, so only the workspace back chip. */}
      <PortalHeroChips audience="consultant" />
      {children}
    </div>
  );
}
