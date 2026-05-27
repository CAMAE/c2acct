import Link from "next/link";
import type { EcosystemDetailData } from "@/lib/ecosystem";

function formatScoreBadge(score: number | null): string {
  return score === null ? "--" : String(score);
}

export default function VendorAtAGlance({ data }: { data: EcosystemDetailData }) {
  const glance = data.vendorAtAGlance;

  return (
    <section
      className="self-start rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5"
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
                className="ml-1 inline-flex items-center rounded-md bg-[var(--brand-c2-blue)] px-2 py-0.5 text-base font-bold tabular-nums text-white"
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
                className="ml-1 inline-flex items-center rounded-md bg-[var(--brand-orange)] px-2 py-0.5 text-base font-bold tabular-nums text-white"
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

      {/* WS2-C (manual-review items 11/12): coverage map gets an inline
          descriptor + a subtle panel-soft sub-card to differentiate from
          the strongest/weakest header above. */}
      <div className="mt-6 rounded-[18px] bg-[var(--shell-panel-soft)]/40 p-4">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
          Coverage map
        </div>
        <p className="mt-1 mb-3 text-sm leading-5 text-[var(--shell-muted)]">
          Vendor&apos;s product catalog coverage across the {data.vendorCoverageMap.length} PAT capability function buckets. Filled tiles indicate the vendor sells a product in that bucket.
        </p>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {data.vendorCoverageMap.map((cell) => (
            <div
              key={cell.bucketKey}
              data-testid="coverage-map-cell"
              data-bucket-key={cell.bucketKey}
              data-bucket-covered={cell.covered ? "1" : "0"}
              className={
                cell.covered
                  ? "rounded-md bg-[var(--brand-c2-blue)] px-2 py-1.5 text-sm font-semibold text-white"
                  : "rounded-md border border-[var(--shell-border)] px-2 py-1.5 text-sm text-[var(--shell-muted)]"
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
          <span className="pat-stat-number">
            {glance.functionBucketsCovered} of {glance.functionBucketsTotal}
          </span>{" "}
          buckets covered
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--shell-border)] pt-4">
        <Link
          href={`/consultants/ecosystems/${data.ecosystemId}/vendor-brief`}
          data-testid="vendor-brief-link"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2.5 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)]"
        >
          View full vendor brief
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
