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
                  <Link href={row.href} className="font-semibold text-[var(--shell-ink)] hover:underline">
                    {row.name}
                  </Link>
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
          <Link key={row.id} href={row.href} className="pat-card pat-hover-card block p-5" data-attention={row.needsAttention ? "1" : "0"}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{row.name}</div>
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
            <span className="mt-3 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">{row.ctaLabel} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
