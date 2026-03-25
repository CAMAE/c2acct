import Link from "next/link";
import type { ReactNode } from "react";
import type { PortalExperience } from "@/lib/portalVisibility";

type PortalShellProps = {
  experience: PortalExperience;
  children: ReactNode;
};

export default function PortalShell({
  experience,
  children,
}: PortalShellProps) {
  const enabledSurfaces = experience.surfaces.filter(
    (surface) => surface.availability === "enabled" && surface.href
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
              PAT Platform
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">
              {experience.audienceLabel}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              {experience.audienceDescription}
            </p>
          </div>

          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-muted)]">
              Actor Context
            </div>
            <div className="mt-3 text-sm text-[var(--shell-ink)]">
              <div className="font-medium">
                {experience.actor.email ?? "Anonymous preview"}
              </div>
              <div className="mt-1 text-[var(--shell-muted)]">
                Role: {experience.actor.role ?? "GUEST"}
              </div>
              <div className="mt-1 text-[var(--shell-muted)]">
                Org: {experience.organizationName ?? "No organization bound"}
              </div>
              <div className="mt-1 text-[var(--shell-muted)]">
                Access: {experience.accessMode}
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-muted)]">
              Enabled Surface
            </div>
            {enabledSurfaces.map((surface) => (
              <Link
                key={surface.id}
                href={surface.href!}
                className="flex items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[var(--shell-ink)] transition hover:border-[var(--shell-border)] hover:bg-white"
              >
                <span>{surface.title}</span>
                <span className="text-[var(--shell-muted)]">Open</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="space-y-8">{children}</div>
    </div>
  );
}
