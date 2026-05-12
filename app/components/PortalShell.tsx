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
  const enabledSurfaces = experience.surfaces.filter((surface) => surface.availability === "enabled");

  return (
    <div className="space-y-8">
      <section className="pat-card p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
              PAT Workspace
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--shell-ink)]">
              {experience.audienceLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
              {experience.audienceDescription}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-[var(--shell-border)] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-muted)]">
                Actor
              </div>
              <div className="mt-3 text-sm text-[var(--shell-ink)]">
                <div className="font-medium">{experience.actor.email ?? "Anonymous preview"}</div>
                <div className="mt-1 text-[var(--shell-muted)]">
                  Role: {experience.actor.role ?? "GUEST"}
                </div>
                <div className="mt-1 text-[var(--shell-muted)]">
                  Org: {experience.organizationName ?? "No organization bound"}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--shell-border)] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--shell-muted)]">
                Active Pages
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {enabledSurfaces.map((surface) =>
                  surface.href ? (
                    <span
                      key={surface.id}
                      className="rounded-full border border-[var(--shell-border)] px-3 py-1.5 text-sm font-medium text-[var(--shell-ink)]"
                    >
                      {surface.title}
                    </span>
                  ) : null
                )}
              </div>
              <div className="mt-3 text-sm text-[var(--shell-muted)]">
                Access: {experience.accessMode}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-8">{children}</div>
    </div>
  );
}
