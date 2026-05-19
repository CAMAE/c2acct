import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";

export type InsightSurfaceGridCard = {
  key: string;
  title: string;
  summary: string;
  href?: string | null;
  interactive: boolean;
  statusLabel?: string;
  supportingText?: string | null;
  tone?: "active" | "muted" | "locked";
};

type InsightSurfaceCardGridProps = {
  cards: readonly InsightSurfaceGridCard[];
  columnsClassName?: string;
};

export default function InsightSurfaceCardGrid({
  cards,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-3",
}: InsightSurfaceCardGridProps) {
  return (
    <section className={`grid gap-5 ${columnsClassName}`}>
      {cards.map((card) => {
        const tone = card.tone ?? "active";
        const hasStatusLabel = Boolean(card.statusLabel);
        const cardClassName =
          tone === "muted"
            ? card.interactive
              ? "pat-card pat-card-muted pat-card-muted-interactive"
              : "pat-card pat-card-muted"
            : tone === "locked"
              ? "pat-card pat-card-muted"
              : card.interactive
                ? "pat-card pat-card-interactive"
                : "pat-card";
        const className = `${cardClassName} block p-6`;

        const content = (
          <>
            <div className={hasStatusLabel ? "flex items-start justify-between gap-4" : ""}>
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
              {hasStatusLabel ? <InsightStatusBadge label={card.statusLabel!} tone={tone} /> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {compactInsightSummary(card.summary)}
            </p>
            {/* WS11-D Block H.4: supportingText pill removed per Cam's review.
                The pill rendered overflow text ("Strongest current sections:
                Document capture, document management, e-signature") that did
                not fit cleanly. The supportingText field stays on the type
                for backwards compatibility but no longer renders. */}
          </>
        );

        if (card.interactive && card.href != null) {
          return (
            <Link key={card.key} href={card.href} className={className}>
              {content}
            </Link>
          );
        }

        return (
          <article key={card.key} className={className}>
            {content}
          </article>
        );
      })}
    </section>
  );
}
