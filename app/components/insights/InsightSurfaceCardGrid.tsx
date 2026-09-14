"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import EliteHubFaceView from "@/app/components/insights/EliteHubFaceView";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";
import type { EliteHubFace } from "@/lib/eliteHubFace";

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
   * (battlecard style) instead of navigating; "Open full view" still links to
   * the detail page (href, which defaults to the Pro pane). When absent, the
   * card behaves as a plain navigating Link.
   */
  expandedContent?: InsightCardExpandedContent | null;
  /**
   * Block 12a: the COMPLETE insight body (same server-rendered components the
   * detail route renders — headline, colored evidence bars, charts, what-this-
   * means, ranked action). When present it supersedes expandedContent: clicking
   * expands the full insight inline; "Open full view" still links to the route.
   */
  expandedNode?: ReactNode;
  /**
   * Block 12g: the refined Elite hub face — ONE hero number + a colored chip /
   * micro-visual + a one-line sub. When present it replaces the metric + summary
   * in the card head (entitled Elite hub cards).
   */
  eliteFace?: EliteHubFace;
};

type InsightSurfaceCardGridProps = {
  cards: readonly InsightSurfaceGridCard[];
  columnsClassName?: string;
  /** R30: "drawer" (flag-on) opens the readout beside the grid; "inline" is production's
   *  in-place expansion, byte-identical flag-off. */
  readoutMode?: "inline" | "drawer";
};

export default function InsightSurfaceCardGrid({
  cards,
  columnsClassName = "md:grid-cols-2 xl:grid-cols-3",
  readoutMode = "inline",
}: InsightSurfaceCardGridProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  // R30 (box 2b, 2026-09-14): the readout opens in a right-hand drawer on desktop and a
  // full-height sheet on phone — the grid never moves. The drawer is rendered INSIDE the
  // open card's element (fixed positioning takes it out of flow) so per-card scoping
  // (data-insight-key → button → "Open full view") is unchanged. Escape and the X close
  // it; Previous/Next step between the readouts of this grid.
  const readoutKeys = cards
    .filter((card) => card.interactive && card.href != null && (card.expandedNode || card.expandedContent))
    .map((card) => card.key);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!expandedKey || readoutMode !== "drawer") return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    // Lock the page scroll without shifting the grid: keep the scrollbar's width as padding.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpandedKey(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expandedKey, readoutMode]);

  return (
    // Block 12h: items-start so cards size independently. R30: the open readout is a
    // drawer, so no card grows and no row moves.
    <section className={`grid items-start gap-5 ${columnsClassName}`}>
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
            {card.eliteFace ? (
              // Block 12g: refined Elite hub face (hero + chip/micro + sub); no
              // compound metric, no wordy summary.
              <EliteHubFaceView face={card.eliteFace} />
            ) : (
              <>
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
            )}
          </>
        );

        // Block 12a — inline expansion into the COMPLETE insight body (the same
        // components the detail route renders). Supersedes the Block 11d text-only
        // readout. Falls back to the legacy text readout when no full node exists.
        const inlineBody: ReactNode = card.expandedNode
          ? card.expandedNode
          : card.expandedContent
            ? (
                <>
                  <p className="text-sm leading-6 text-[var(--shell-ink)]">{card.expandedContent.intro}</p>
                  <dl className="mt-4 space-y-3">
                    {card.expandedContent.items.map((item) => (
                      <div key={item.title}>
                        <dt className="text-sm font-semibold text-[var(--shell-ink)]">{item.title}</dt>
                        <dd className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">{item.body}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )
            : null;

        if (card.interactive && inlineBody && card.href != null) {
          return (
            <div
              key={card.key}
              data-insight-key={card.key}
              className={`${className} ${expanded && readoutMode === "inline" ? "xl:col-span-2" : ""}`}
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
              {expanded && readoutMode === "inline" ? (
                <div className="mt-4 border-t border-[var(--shell-border)] pt-4">
                  <div className="space-y-6">{inlineBody}</div>
                  <Link href={card.href} className="pat-button-secondary mt-5 inline-flex">
                    Open full view
                  </Link>
                </div>
              ) : null}
              {expanded && readoutMode === "drawer" ? (
                <>
                  <div
                    className="fixed inset-0 z-[70] bg-[rgba(12,33,66,0.28)]"
                    aria-hidden="true"
                    onClick={() => setExpandedKey(null)}
                  />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`insight-readout-${card.key}-title`}
                    data-testid="insight-readout-drawer"
                    className="fixed inset-0 z-[71] flex flex-col overflow-y-auto bg-white text-left shadow-[0_0_48px_rgba(12,33,66,0.18)] md:inset-y-0 md:left-auto md:right-0 md:w-[min(44rem,100vw)] md:border-l md:border-[var(--shell-border)]"
                  >
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--shell-border)] bg-white/95 px-6 py-4 backdrop-blur-[6px]">
                      <div className="min-w-0">
                        <div className="pat-label">Readout</div>
                        <h2 id={`insight-readout-${card.key}-title`} className="mt-1 text-xl font-semibold text-[var(--shell-ink)]">
                          {card.title}
                        </h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-ink)] disabled:opacity-40"
                          aria-label="Previous insight"
                          title="Previous insight"
                          disabled={readoutKeys.indexOf(card.key) <= 0}
                          onClick={() => setExpandedKey(readoutKeys[readoutKeys.indexOf(card.key) - 1] ?? card.key)}
                        >
                          <span aria-hidden="true">‹</span>
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-ink)] disabled:opacity-40"
                          aria-label="Next insight"
                          title="Next insight"
                          disabled={readoutKeys.indexOf(card.key) >= readoutKeys.length - 1}
                          onClick={() => setExpandedKey(readoutKeys[readoutKeys.indexOf(card.key) + 1] ?? card.key)}
                        >
                          <span aria-hidden="true">›</span>
                        </button>
                        <button
                          ref={closeButtonRef}
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-ink)] hover:border-[rgba(6,54,116,0.32)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
                          aria-label="Close readout"
                          title="Close readout"
                          onClick={() => setExpandedKey(null)}
                        >
                          <span aria-hidden="true">×</span>
                        </button>
                      </div>
                    </div>
                    <div className="px-6 py-5">
                      <div className="space-y-6">{inlineBody}</div>
                      <Link href={card.href} className="pat-button-secondary mt-5 inline-flex">
                        Open full view
                      </Link>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          );
        }

        if (card.interactive && card.href != null) {
          return (
            <Link key={card.key} data-insight-key={card.key} href={card.href} className={className}>
              {head}
            </Link>
          );
        }

        return (
          <article key={card.key} data-insight-key={card.key} className={className}>
            {head}
          </article>
        );
      })}
    </section>
  );
}
