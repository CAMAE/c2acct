import Link from "next/link";
import type { ReactNode } from "react";
import { getAdminAccessState, getAdminNavItems } from "@/lib/adminControlPlane";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { sessionUser, isAdmin } = await getAdminAccessState();
  const navItems = getAdminNavItems();

  if (!sessionUser || !isAdmin) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="pat-card p-8">
          <div className="pat-label">C2Core</div>
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
      <section className="pat-card p-5">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] transition hover:border-[rgba(6,54,116,0.32)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
      {children}
    </div>
  );
}
