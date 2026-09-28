import Link from "next/link";
import { sandboxLabel } from "@/lib/sandboxLabel";
import type { WorkspaceCardStats } from "@/lib/workspaceCardStats";

/**
 * Box 3f item I (W2 to W5, 2026-09-28, flag-on): the firm workspace's five cards in one
 * fixed format — title, one or two live stat lines, one sentence, one action link — and
 * no vertical stat stack. The three-cell status strip above them is gone. Copy is Cam's,
 * verbatim; the live values come from the dashboard and lib/workspaceCardStats.ts.
 */
type FirmWorkspaceCardsProps = {
  stats: WorkspaceCardStats;
  completedModules: number;
  totalModules: number;
  alignmentIndex: number | null;
  sandboxEnabled: boolean;
  benchmarkEnabled: boolean;
};

type Card = { key: string; title: string; lines: string[]; sentence?: string; href: string; action: string };

export default function FirmWorkspaceCards({
  stats,
  completedModules,
  totalModules,
  alignmentIndex,
  sandboxEnabled,
  benchmarkEnabled,
}: FirmWorkspaceCardsProps) {
  const sandbox = stats["firm-alignment-sandbox"];
  const products = stats["firm-product-assessments"];
  const benchmark = stats["firm-benchmark"];
  const cards: Card[] = [
    ...(sandboxEnabled
      ? [
          {
            key: "firm-alignment-sandbox",
            title: sandboxLabel(),
            lines: [`Your score: ${sandbox ? sandbox.value : "not scored yet"}`],
            sentence: "Move your products around like puzzle pieces, swap in firm-reviewed alternatives, and watch your alignment recompute live.",
            href: "/firm/alignment-board",
            action: "Open the sandbox",
          },
        ]
      : []),
    {
      key: "firm-alignment-assessment",
      title: "Alignment Assessment",
      lines: [`Modules complete: ${completedModules} of ${totalModules}`],
      sentence: "Open a module to review or update your answers.",
      href: "/firm/alignment-assessment",
      action: "Open the assessment",
    },
    {
      key: "firm-product-assessments",
      title: "Product Assessment",
      lines: [`Products to review: ${products ? products.value : "0"}`],
      sentence: "Review a vendor product through the feature-aligned assessment that feeds product insight.",
      href: "/firm/product-assessments",
      action: "Review a product",
    },
    {
      key: "firm-insights",
      title: "Alignment Insights",
      lines: [`Alignment index: ${alignmentIndex === null ? "not scored yet" : alignmentIndex}`],
      sentence: "Open the Pro and Elite insights built from your current firm and product evidence.",
      href: "/firm/insights",
      action: "Open insights",
    },
    ...(benchmarkEnabled
      ? [
          {
            key: "firm-benchmark",
            title: "Quarterly benchmark",
            lines: [
              `Your position against peer firms this quarter: ${benchmark && benchmark.value !== "—" ? `${benchmark.value} percentile` : "not ranked yet"}`,
              ...(benchmark && typeof benchmark.days === "number"
                ? [`Next cutoff in ${benchmark.days} day${benchmark.days === 1 ? "" : "s"}`]
                : []),
            ],
            href: "/firm/benchmark",
            action: "Open the benchmark",
          },
        ]
      : []),
  ];

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-testid="firm-workspace-cards">
      {cards.map((card) => (
        <article key={card.key} className="pat-card flex flex-col p-6" data-testid={`workspace-card-${card.key}`}>
          <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
          {card.lines.map((line) => (
            <div key={line} className="pat-body mt-2 font-semibold text-[var(--shell-ink)]">
              {line}
            </div>
          ))}
          {card.sentence ? <p className="pat-meta mt-3 text-[var(--shell-muted)]">{card.sentence}</p> : null}
          <Link href={card.href} className="pat-meta mt-4 inline-flex font-semibold text-[var(--brand-c2-blue)] hover:underline">
            {card.action}
          </Link>
        </article>
      ))}
    </section>
  );
}
