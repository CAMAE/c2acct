import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { isConsultantAccessEnabled, requireConsultantSession } from "@/lib/consultantAccess";
import { getEcosystemMetadataForConsultant } from "@/lib/ecosystem";

export const dynamic = "force-dynamic";

// WS2-A (manual-review items 4/16/17): when the consultant is inside an
// ecosystem route, swap the top-card subtext from the static "N active
// ecosystems" line to a contextual "{Ecosystem} · {N} firms · {M} products"
// line. On /consultants directly, the original count text stays.
function extractEcosystemIdFromPath(path: string | null): string | null {
  if (!path) return null;
  const match = path.match(/^\/consultants\/ecosystems\/([^/]+)(?:\/|$)/);
  return match?.[1] ?? null;
}

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

  const requestHeaders = await headers();
  const requestPath =
    requestHeaders.get("x-pathname") ??
    requestHeaders.get("x-invoke-path") ??
    requestHeaders.get("next-url") ??
    null;
  const activeEcosystemId = extractEcosystemIdFromPath(requestPath);
  const ecosystemMetadata = activeEcosystemId
    ? await getEcosystemMetadataForConsultant(
        consultantAccess.consultantProfileId,
        activeEcosystemId
      )
    : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <PatLogoLockup mode="header" tone="light" />
            <div className="pat-label mt-4">Consultant</div>
            <div className="mt-2 text-lg font-semibold text-[var(--shell-ink)]">
              {consultantAccess.consultantLabel}
            </div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">
              {ecosystemMetadata
                ? `${ecosystemMetadata.ecosystemName} · ${ecosystemMetadata.firmCount} firm${ecosystemMetadata.firmCount === 1 ? "" : "s"} · ${ecosystemMetadata.productCount} product${ecosystemMetadata.productCount === 1 ? "" : "s"}`
                : `${consultantAccess.ecosystems.length} active ecosystem${consultantAccess.ecosystems.length === 1 ? "" : "s"}`}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/consultants"
              className="rounded-full border border-transparent px-4 py-2.5 text-sm font-medium leading-none text-[var(--shell-muted)] transition-colors hover:border-[rgba(6,54,116,0.18)] hover:bg-white hover:text-[var(--shell-ink)]"
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
