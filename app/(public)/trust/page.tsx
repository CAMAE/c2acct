import Link from "next/link";
import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface, getTrustSurfaceCards, TRUST_FOOTER_LINKS } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "PAT Trust Center | Patalign",
  description: "Launch-readiness, policy, support, billing, and release transparency for PAT.",
};

export default function TrustPage() {
  const surface = getTrustSurface("trust");
  const cards = getTrustSurfaceCards();

  // B3 (flag-on): one column, H1 per the ruling, the trust set as a compact link
  // list instead of eight cards, "No unsupported claims" as a designed disclosure,
  // the remaining statements as an FAQ accordion. Copy is the surface's own.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        title="How PAT earns trust"
        chips={[{ label: `Last updated ${surface.lastUpdated}`, mono: true }]}
        links={TRUST_FOOTER_LINKS.filter((link) => link.href !== "/trust")}
        disclosureTitle="No unsupported claims"
      />
    );
  }

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
