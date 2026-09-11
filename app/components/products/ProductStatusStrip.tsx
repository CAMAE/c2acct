import Link from "next/link";
import CardChip from "@/app/components/cards/CardChip";

/**
 * Depth box 7 (2026-09-09, flag-on): the per-product status strip on both
 * product lists — declared features · firm reviews on file · last updated ·
 * divergence chip. A table at 1440 (mono numerals), cards at 390. Rows arrive
 * sorted needs-attention first by the caller.
 */
export type ProductStatusRow = {
  id: string;
  name: string;
  vendorName: string;
  /** R5: the product's own site (vendor rows), rendered as the "Product URL" link icon. */
  productUrl: string | null;
  href: string;
  ctaLabel: string;
  statusLabel: string;
  statusTone: "positive" | "amber" | "muted";
  features: number;
  reviewsOnFile: number;
  lastUpdated: Date | null;
  divergence: { label: string; tone: "positive" | "amber" | "muted"; points: number | null };
  needsAttention: boolean;
  attentionReason: string | null;
};

function ProductUrlIcon({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Product URL"
      title="Product URL"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--shell-border)] align-middle text-[var(--shell-muted)] hover:text-[var(--shell-ink)]"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current" fill="none" strokeWidth="1.8">
        <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 5l-8 8" strokeLinecap="round" />
        <path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default function ProductStatusStrip({ rows, caption }: { rows: ProductStatusRow[]; caption: string }) {
  if (rows.length === 0) return null;
  return (
    <section data-testid="product-status-strip">
      {/* 1440: table */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-[var(--shell-border)] bg-white md:block">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="pat-label border-b border-[var(--shell-border)]">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Product</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Declared features</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Firm reviews on file</th>
              <th scope="col" className="px-4 py-3 font-semibold">Last updated</th>
              <th scope="col" className="px-4 py-3 font-semibold">Divergence</th>
              <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--shell-border)] last:border-b-0" data-attention={row.needsAttention ? "1" : "0"}>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-2">
                    <Link href={row.href} className="font-semibold text-[var(--shell-ink)] hover:underline">
                      {row.name}
                    </Link>
                    {row.productUrl ? <ProductUrlIcon href={row.productUrl} /> : null}
                  </span>
                  <div className="pat-meta mt-0.5 text-[var(--shell-muted)]">{row.vendorName}</div>
                  {row.attentionReason ? <div className="pat-meta mt-1 text-[var(--shell-muted)]">{row.attentionReason}</div> : null}
                </td>
                <td className="px-4 py-3 align-top"><CardChip tone={row.statusTone}>{row.statusLabel}</CardChip></td>
                <td className="pat-mono px-4 py-3 text-right align-top text-[var(--shell-ink)]">{row.features}</td>
                <td className="pat-mono px-4 py-3 text-right align-top text-[var(--shell-ink)]">{row.reviewsOnFile}</td>
                <td className="pat-mono px-4 py-3 align-top text-[var(--shell-muted)]">{formatDate(row.lastUpdated)}</td>
                <td className="px-4 py-3 align-top">
                  <CardChip tone={row.divergence.tone}>
                    {row.divergence.points !== null ? `${row.divergence.points} pt · ` : ""}
                    {row.divergence.label}
                  </CardChip>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link href={row.href} className="text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline">
                    {row.ctaLabel} →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 390: cards */}
      <div className="grid gap-4 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="pat-card pat-hover-card block p-5" data-attention={row.needsAttention ? "1" : "0"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-[var(--shell-ink)]">
                  <Link href={row.href} className="hover:underline">{row.name}</Link>
                  {row.productUrl ? <ProductUrlIcon href={row.productUrl} /> : null}
                </div>
                <div className="pat-meta text-[var(--shell-muted)]">{row.vendorName}</div>
              </div>
              <CardChip tone={row.statusTone}>{row.statusLabel}</CardChip>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="pat-meta text-[var(--shell-muted)]">Declared features</dt><dd className="pat-mono text-[var(--shell-ink)]">{row.features}</dd></div>
              <div><dt className="pat-meta text-[var(--shell-muted)]">Firm reviews on file</dt><dd className="pat-mono text-[var(--shell-ink)]">{row.reviewsOnFile}</dd></div>
              <div><dt className="pat-meta text-[var(--shell-muted)]">Last updated</dt><dd className="pat-mono text-[var(--shell-ink)]">{formatDate(row.lastUpdated)}</dd></div>
              <div><dt className="pat-meta text-[var(--shell-muted)]">Divergence</dt><dd><CardChip tone={row.divergence.tone}>{row.divergence.points !== null ? `${row.divergence.points} pt · ` : ""}{row.divergence.label}</CardChip></dd></div>
            </dl>
            {row.attentionReason ? <p className="pat-meta mt-3 text-[var(--shell-muted)]">{row.attentionReason}</p> : null}
            <Link href={row.href} className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">{row.ctaLabel} →</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
