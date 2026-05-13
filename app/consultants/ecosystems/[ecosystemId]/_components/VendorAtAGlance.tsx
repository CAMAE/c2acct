import Link from "next/link";
import type { EcosystemDetailData } from "@/lib/ecosystem";

function formatScoreBadge(score: number | null): string {
  return score === null ? "--" : String(score);
}

export default function VendorAtAGlance({ data }: { data: EcosystemDetailData }) {
  const glance = data.vendorAtAGlance;

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
      data-testid="ecosystem-detail-vendor-glance"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Vendor at a glance
        </h2>
        <div className="text-sm text-[var(--shell-muted)]">
          {glance.productCount} product{glance.productCount === 1 ? "" : "s"}
        </div>
      </div>

      <dl className="space-y-2">
        {glance.strongestProduct ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-[var(--shell-muted)]">Strongest product</dt>
            <dd className="text-sm font-semibold text-[var(--shell-ink)]">
              {glance.strongestProduct.name}{" "}
              <span
                className="ml-1 inline-flex items-center rounded-md bg-[var(--brand-c2-blue)] px-2 py-0.5 text-xs font-semibold text-white"
                aria-label={`firm-review average ${formatScoreBadge(glance.strongestProduct.score)}`}
              >
                {formatScoreBadge(glance.strongestProduct.score)}
              </span>
            </dd>
          </div>
        ) : null}
        {glance.weakestProduct && glance.weakestProduct.id !== glance.strongestProduct?.id ? (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-[var(--shell-muted)]">Weakest product</dt>
            <dd className="text-sm font-semibold text-[var(--shell-ink)]">
              {glance.weakestProduct.name}{" "}
              <span
                className="ml-1 inline-flex items-center rounded-md border border-[var(--shell-border)] px-2 py-0.5 text-xs font-semibold text-[var(--shell-ink)]"
                aria-label={`firm-review average ${formatScoreBadge(glance.weakestProduct.score)}`}
              >
                {formatScoreBadge(glance.weakestProduct.score)}
              </span>
            </dd>
          </div>
        ) : null}
        {glance.strongestProduct === null ? (
          <div className="text-sm text-[var(--shell-muted)]">
            No firm-reviewed product scores yet.
          </div>
        ) : null}
      </dl>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
          Coverage map
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {data.vendorCoverageMap.map((cell) => (
            <div
              key={cell.bucketKey}
              data-testid="coverage-map-cell"
              data-bucket-key={cell.bucketKey}
              data-bucket-covered={cell.covered ? "1" : "0"}
              className={
                cell.covered
                  ? "rounded-md bg-[var(--brand-c2-blue)] px-2 py-1.5 text-xs font-semibold text-white"
                  : "rounded-md border border-[var(--shell-border)] px-2 py-1.5 text-xs text-[var(--shell-muted)]"
              }
              title={
                cell.covered
                  ? `${cell.productCount} product${cell.productCount === 1 ? "" : "s"}`
                  : "Not in vendor's catalog"
              }
            >
              {cell.bucketLabel}
            </div>
          ))}
        </div>
        <div className="mt-3 text-sm text-[var(--shell-muted)]">
          {glance.functionBucketsCovered} of {glance.functionBucketsTotal} buckets covered
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--shell-border)] pt-4">
        <Link
          href={`/consultants/ecosystems/${data.ecosystemId}/vendor-brief`}
          data-testid="vendor-brief-link"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-c2-blue)] hover:underline"
        >
          View full vendor brief
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </section>
  );
}
