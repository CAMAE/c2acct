import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PatModeToggle from "@/app/components/pat/PatModeToggle";
import { getAdminAccessState, getAdminNavItems } from "@/lib/adminControlPlane";
import { enforceAudience } from "@/lib/audienceGuard";

export const dynamic = "force-dynamic";

function resolveActiveAdminKey(
  navItems: ReadonlyArray<{ href: string; label: string }>,
  pathname: string | null
): string {
  if (!pathname) return navItems[0]?.href ?? "/admin";
  const best = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return best?.href ?? navItems[0]?.href ?? "/admin";
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // 13a: strict role wall — a company-bound account (incl. firm/vendor OWNER/ADMIN)
  // is redirected to its own portal; only a company-less operator reaches /admin.
  await enforceAudience("admin");
  const { sessionUser, isAdmin } = await getAdminAccessState();
  const navItems = getAdminNavItems();
  const requestHeaders = await headers();
  const requestPath =
    requestHeaders.get("x-pathname") ??
    requestHeaders.get("x-invoke-path") ??
    requestHeaders.get("next-url") ??
    null;
  const activeAdminKey = resolveActiveAdminKey(navItems, requestPath);

  if (!sessionUser || !isAdmin) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="pat-card p-8">
          <PatLogoLockup mode="hero" tone="light" />
          <div className="pat-label mt-6">PAT admin</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Operator access required
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--shell-muted)]">
            This surface is reserved for PAT operators managing organizations, taxonomy, runtime configuration, and launch controls.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href="/">
              Back to home
            </Link>
            <Link className="pat-button-secondary" href="/sign-in?view=admin">
              Sign in as admin
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-5 print:hidden">
        <PatModeToggle
          ariaLabel="Admin control plane navigation"
          activeKey={activeAdminKey}
          options={navItems.map((item) => ({
            key: item.href,
            label: item.label,
            href: item.href,
          }))}
        />
      </section>
      {children}
    </div>
  );
}
