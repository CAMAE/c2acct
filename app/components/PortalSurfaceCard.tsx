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
      <div>
        <div className="text-lg font-semibold text-[var(--shell-ink)]">
          {surface.title}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          {surface.description}
        </p>
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
