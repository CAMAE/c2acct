"use client";

import { useState } from "react";
import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";

/** The Pro readout an interactive card expands into in place (Block 11d). */
export type InsightCardExpandedContent = {
  intro: string;
  items: ReadonlyArray<{ title: string; body: string }>;
};

export type InsightSurfaceGridCard = {
  key: string;
  title: string;
  summary: string;
  href?: string | null;
  interactive: boolean;
  statusLabel?: string;
  supportingText?: string | null;
  tone?: "active" | "muted" | "locked";
  metric?: { value: string; caption: string };
  /**
   * Block 11d: when present, clicking the card expands the Pro readout in place
   * (sales-card style) instead of navigating; "Open full view" still links to
   * the detail page (href, which defaults to the Pro pane). When absent, the
   * card behaves as a plain navigating Link.
   */
  expandedContent?: InsightCardExpandedContent | null;
};

type InsightSurfaceCardGridProps = {
  cards: readonly InsightSurfaceGridCard[];
  columnsClassName?: string;
};

export default function InsightSurfaceCardGrid({
  cards,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-3",
}: InsightSurfaceCardGridProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
        const expanded = expandedKey === card.key;

        const head = (
          <>
            <div className={hasStatusLabel ? "flex items-start justify-between gap-4" : ""}>
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
              {hasStatusLabel ? <InsightStatusBadge label={card.statusLabel!} tone={tone} /> : null}
            </div>
            {card.metric ? (
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-[var(--shell-ink)]">
                  {card.metric.value}
                </span>
                <span className="text-xs text-[var(--shell-muted)]">{card.metric.caption}</span>
              </div>
            ) : null}
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {compactInsightSummary(card.summary)}
            </p>
          </>
        );

        // Block 11d — sales-card-style inline expansion of the Pro readout.
        if (card.interactive && card.expandedContent && card.href != null) {
          return (
            <div
              key={card.key}
              className={`${className} ${expanded ? "xl:col-span-2" : ""}`}
              data-expanded={expanded ? "1" : "0"}
            >
              <button
                type="button"
                className="block w-full text-left"
                aria-expanded={expanded}
                onClick={() => setExpandedKey(expanded ? null : card.key)}
              >
                {head}
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-c2-blue)]">
                  {expanded ? "Hide readout" : "Open readout"}
                  <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                </span>
              </button>
              {expanded ? (
                <div className="mt-4 border-t border-[var(--shell-border)] pt-4">
                  <p className="text-sm leading-6 text-[var(--shell-ink)]">{card.expandedContent.intro}</p>
                  <dl className="mt-4 space-y-3">
                    {card.expandedContent.items.map((item) => (
                      <div key={item.title}>
                        <dt className="text-sm font-semibold text-[var(--shell-ink)]">{item.title}</dt>
                        <dd className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{item.body}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link href={card.href} className="pat-button-secondary mt-5 inline-flex">
                    Open full view
                  </Link>
                </div>
              ) : null}
            </div>
          );
        }

        if (card.interactive && card.href != null) {
          return (
            <Link key={card.key} href={card.href} className={className}>
              {head}
            </Link>
          );
        }

        return (
          <article key={card.key} className={className}>
            {head}
          </article>
        );
      })}
    </section>
  );
}
