import Link from "next/link";
import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface, getTrustSurfaceCards } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Trust Center | C2Acct",
  description: "Launch-readiness, policy, support, billing, and release transparency for PAT.",
};

export default function TrustPage() {
  const surface = getTrustSurface("trust");
  const cards = getTrustSurfaceCards();

  return (
    <TrustSurfacePage surface={surface}>
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
    </TrustSurfacePage>
  );
}
