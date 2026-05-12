import Link from "next/link";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import type { PortalSurface } from "@/lib/portalVisibility";

type PortalSurfaceCardProps = {
  surface: PortalSurface;
};

export default async function PortalSurfaceCard({
  surface,
}: PortalSurfaceCardProps) {
  const messages = await getRequestLocaleMessages();

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
            ? messages.common.live
            : surface.availability === "restricted"
              ? messages.common.scoped
              : messages.common.queued}
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
    "pat-card pat-card-interactive group block rounded-[24px] bg-white p-6";

  if (surface.availability === "enabled" && surface.href) {
    return <Link href={surface.href} className={className}>{content}</Link>;
  }

  return <div className={`${className} opacity-95`}>{content}</div>;
}
