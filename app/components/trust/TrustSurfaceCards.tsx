import Link from "next/link";
import type { getTrustSurfaceCards } from "@/lib/trustContent";

/**
 * The trust-set cards (eyebrow · title · summary · "Review …") — production's
 * /trust body, one card per surface. Box 2b (Cam 9/14 "all as recommended")
 * lifts the markup out of app/(public)/trust/page.tsx unchanged so the V7
 * trust surface can compose the same cards back in; flag-off output is
 * byte-identical.
 */
export default function TrustSurfaceCards({ cards }: { cards: ReturnType<typeof getTrustSurfaceCards> }) {
  return (
    <section className="grid gap-5 lg:grid-cols-3" aria-label="PAT trust surfaces">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="pat-card pat-card-interactive block px-6 py-7"
        >
          <div className="pat-label">{card.eyebrow}</div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {card.label}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {card.summary}
          </p>
          <span className="mt-5 inline-flex rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)]">
            Review {card.label.toLowerCase()}
          </span>
        </Link>
      ))}
    </section>
  );
}
