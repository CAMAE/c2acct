import Link from "next/link";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import type { VendorWorkspaceDashboard as Data } from "@/lib/vendorWorkspaceDashboard";

/**
 * Depth box 1 (2026-09-09, flag-on): the vendor's dashboard on /vendor —
 * products declared, firm reviews on file, largest divergence, next briefing
 * date, the latest product readout with "Open readout", and "since your last
 * visit". A vendor with no product sees the first steps, never a blank.
 */
export default function VendorWorkspaceDashboard({ view }: { view: Data }) {
  const empty = view.productsDeclared === 0;
  return (
    <div className="space-y-8" data-testid="vendor-workspace-dashboard">
      <section className="pat-card p-8">
        <div className="pat-label">Current evidence picture</div>
        {empty ? (
          <div className="mt-5">
            <p className="text-base leading-7 text-[var(--shell-muted)]">
              No product is declared yet. Firm reviews, divergence and the product readout appear once a product has a final vendor
              assessment — declare the first product below.
            </p>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Declare a product", body: "Name it and pick the features it supports.", href: "/vendor/product-assessment?mode=add-new" },
                { title: "Complete the assessment", body: "Score the paced questions for that product.", href: "/vendor/product-assessment" },
                { title: "Invite firms to review", body: "Firm reviews open once the assessment is final.", href: "/vendor/product-insight" },
              ].map((step, index) => (
                <li key={step.title}>
                  <Link href={step.href} className="pat-subpanel pat-hover-card block p-4">
                    <div className="pat-label">Step {index + 1}</div>
                    <div className="mt-1 text-base font-semibold text-[var(--shell-ink)]">{step.title}</div>
                    <div className="pat-meta mt-1 text-[var(--shell-muted)]">{step.body}</div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="mt-5 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreLockup label="Products declared" score={null} displayValue={`${view.productsDeclared}`} context={`${view.productsFinal} with a final vendor assessment`} />
            <ScoreLockup label="Firm reviews on file" score={null} displayValue={`${view.firmReviewsOnFile}`} context="Final firm product reviews across your products" />
            <ScoreLockup
              label="Largest divergence"
              score={null}
              displayValue={view.largestDivergence ? `${view.largestDivergence.points} pt` : "—"}
              context={view.largestDivergence ? `${view.largestDivergence.productName} · ${view.largestDivergence.label}` : "No divergence above the sample floor yet"}
            />
            <ScoreLockup
              label="Next briefing"
              score={null}
              displayValue={view.nextBriefing.dateLabel}
              context={`Quarterly benchmark cut · ${view.nextBriefing.firmsReviewing} firm${view.nextBriefing.firmsReviewing === 1 ? "" : "s"} reviewing`}
            />
          </div>
        )}
      </section>

      {!empty ? (
        <section className="grid gap-5 md:grid-cols-2">
          {view.latestReadout ? (
            <Link href={view.latestReadout.href} className="pat-card pat-hover-card block p-6" data-testid="latest-insight">
              <div className="pat-label">Latest product readout</div>
              <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">{view.latestReadout.productName}</div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-[var(--shell-muted)]">
                <span>
                  self-reported <span className="pat-mono text-[var(--shell-ink)]">{view.latestReadout.selfReported ?? "—"}</span>
                </span>
                <span>
                  firm-reviewed <span className="pat-mono text-[var(--shell-ink)]">{view.latestReadout.firmReviewed === null ? "—" : Math.round(view.latestReadout.firmReviewed)}</span>
                </span>
                <span>
                  <span className="pat-mono text-[var(--shell-ink)]">{view.latestReadout.firmReviews}</span> firm review{view.latestReadout.firmReviews === 1 ? "" : "s"}
                </span>
              </div>
              <span className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">Open readout →</span>
            </Link>
          ) : null}
          <div className="pat-card p-6">
            <div className="pat-label">Products</div>
            <ul className="mt-3 grid gap-2 text-sm">
              {view.products.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/vendor/product-insight/${product.id}`} className="font-semibold text-[var(--shell-ink)] hover:underline">
                    {product.name}
                  </Link>
                  <span className="pat-meta text-[var(--shell-muted)]">
                    {product.final ? "final" : "in progress"} · <span className="pat-mono">{product.firmReviews}</span> review{product.firmReviews === 1 ? "" : "s"} · {product.divergenceLabel}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/vendor/product-assessment" className="mt-4 inline-flex text-sm font-semibold text-[var(--brand-c2-blue)]">
              Manage products →
            </Link>
          </div>
        </section>
      ) : null}

      <section className="pat-soft-panel flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm text-[var(--shell-muted)]" data-testid="since-last-visit">
        <span className="pat-label">Since your last visit</span>
        {view.sinceLastVisit.sinceLabel ? (
          <>
            <span>
              <span className="pat-mono text-[var(--shell-ink)]">{view.sinceLastVisit.firmReviewsReceived}</span> firm review
              {view.sinceLastVisit.firmReviewsReceived === 1 ? "" : "s"} received
            </span>
            <span>
              <span className="pat-mono text-[var(--shell-ink)]">{view.sinceLastVisit.readoutsRefreshed}</span> readout
              {view.sinceLastVisit.readoutsRefreshed === 1 ? "" : "s"} refreshed
            </span>
            <span className="pat-meta">since {view.sinceLastVisit.sinceLabel}</span>
          </>
        ) : (
          <span>This is your first visit on record.</span>
        )}
      </section>
    </div>
  );
}
