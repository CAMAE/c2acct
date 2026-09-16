import Link from "next/link";
import type { PortalSurface } from "@/lib/portalVisibility";

type PortalSurfaceCardProps = {
  surface: PortalSurface;
  /** R28 (box 2b): the card's live number. Rendered after the description in
   *  DOM order (the link's accessible name keeps production's prefix) and
   *  placed top-right visually. Omitted flag-off. */
  stat?: { value: string; unit: string; context?: string | null } | null;
};

export default function PortalSurfaceCard({
  surface,
  stat = null,
}: PortalSurfaceCardProps) {
  const content = (
    <>
      <div className={stat ? "flex items-start justify-between gap-4" : undefined}>
        <div className={stat ? "min-w-0 flex-1" : undefined}>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">
            {surface.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            {surface.description}
          </p>
        </div>
        {stat ? (
          <div className="w-28 shrink-0 text-right" data-testid="card-stat">
            <div className="pat-mono whitespace-nowrap text-2xl font-semibold leading-none text-[var(--shell-ink)]">{stat.value}</div>
            <div className="pat-meta mt-1 text-[var(--shell-muted)]">{stat.unit}</div>
            {stat.context ? <div className="pat-meta mt-0.5 text-[var(--shell-muted)]">{stat.context}</div> : null}
          </div>
        ) : null}
      </div>
      {surface.reason ? (
        <div className="mt-5 text-sm text-[var(--shell-muted)]">
          {surface.reason}
        </div>
      ) : null}
    </>
  );

  // Block 11a: inherit the canonical pat-card treatment (28px radius,
  // --shell-panel bg) — the same "law" the firm-pro insight cards use — instead
  // of the off-law rounded-[24px]/bg-white override, so every portal home card
  // matches the insight cards.
  const className = "pat-card pat-card-interactive group block p-6";

  if (surface.availability === "enabled" && surface.href) {
    return <Link href={surface.href} className={className}>{content}</Link>;
  }

  return <div className={`${className} opacity-95`}>{content}</div>;
}
