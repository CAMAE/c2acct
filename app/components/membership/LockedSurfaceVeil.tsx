import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Depth box 3 (2026-09-09): a locked Pro-tier page shows the REAL surface,
 * rendered from the visitor's own (or demo) values, behind a soft veil — blur +
 * 60% white — with the lock notice as a small card over it: what unlocks, the
 * Elite price from the pricing memo, and the upgrade action. Elite tier is
 * untouched (it never sees this). The veiled surface is inert (no pointer
 * events, hidden from assistive tech) so the card is the only interaction.
 */
export default function LockedSurfaceVeil({
  children,
  surfaceLabel,
  unlocks,
  price,
  upgradeHref,
  membershipHref,
}: {
  children: ReactNode;
  surfaceLabel: string;
  unlocks: readonly string[];
  price: string;
  upgradeHref: string;
  membershipHref: string;
}) {
  return (
    <div className="relative" data-testid="locked-surface-veil">
      <div className="pointer-events-none select-none blur-[3px]" aria-hidden="true" data-testid="locked-surface-preview">
        {children}
      </div>
      <div className="absolute inset-0 bg-white/60" aria-hidden="true" />
      <div className="absolute inset-x-0 top-24 flex justify-center px-6">
        <section className="pat-card w-full max-w-md p-6" style={{ boxShadow: "var(--shadow-card)" }} role="note" data-testid="locked-surface-card">
          <div className="pat-label">{surfaceLabel} · Elite</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">What Elite unlocks here</h2>
          <ul className="mt-3 grid gap-1.5 text-sm leading-6 text-[var(--shell-muted)]">
            {unlocks.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="text-[var(--brand-c2-blue)]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="pat-stat-number text-3xl text-[var(--shell-ink)]">{price}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={upgradeHref} className="pat-button-primary">
              Upgrade to Elite
            </Link>
            <Link href={membershipHref} className="pat-button-secondary">
              Compare plans
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
