import Link from "next/link";
import type { PortalSurface } from "@/lib/portalVisibility";

type PortalSurfaceCardProps = {
  surface: PortalSurface;
};

export default function PortalSurfaceCard({
  surface,
}: PortalSurfaceCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">
            {surface.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {surface.description}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
            surface.availability === "enabled"
              ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
              : surface.availability === "restricted"
                ? "bg-amber-500/10 text-amber-700"
                : "bg-slate-900/5 text-[var(--shell-muted)]"
          }`}
        >
          {surface.availability === "enabled"
            ? "Live"
            : surface.availability === "restricted"
              ? "Scoped"
              : "Queued"}
        </span>
      </div>
      {surface.reason ? (
        <div className="mt-5 text-sm text-[var(--shell-muted)]">
          {surface.reason}
        </div>
      ) : null}
    </>
  );

  const className =
    "group block rounded-[24px] border border-[var(--shell-border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] transition";

  if (surface.availability === "enabled" && surface.href) {
    return (
      <Link href={surface.href} className={`${className} hover:-translate-y-0.5 hover:border-[var(--shell-accent)]/30`}>
        {content}
      </Link>
    );
  }

  return <div className={`${className} opacity-95`}>{content}</div>;
}
