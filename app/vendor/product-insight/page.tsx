import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorProductInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Insight | C2Acct",
  description: "Product insight catalog for vendor products.",
};

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function VendorProductInsightPage() {
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  const cards: VendorProductInsightSnapshot[] = sessionUser?.companyId
    ? await getVendorProductInsightCatalog(sessionUser.companyId)
    : [];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Product insight</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {messages.insights.vendorProduct.heroTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.insights.vendorProduct.heroBody}
        </p>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {messages.insights.vendorProduct.heroNote}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/vendor">
            {messages.insights.vendorProduct.backToVendorHome}
          </Link>
          <Link className="pat-button-primary" href="/vendor/product-assessment">
            {messages.insights.vendorProduct.openProductAssessment}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {cards.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.noProducts}
          </div>
        ) : (
          cards.map((snapshot) => {
            const fitContent = getVendorProductInsightContent("current-product-fit");
            return (
              <Link
                key={snapshot.product.id}
                href={`/vendor/product-insight/${snapshot.product.id}`}
                className="pat-card pat-card-interactive block p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">
                      {snapshot.product.name}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                      {snapshot.product.summary ?? fitContent?.summary ?? "No summary added yet."}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    {snapshot.confidenceLabel}
                  </span>
                </div>
                <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
                  <div>
                    {messages.insights.vendorProduct.vendorSelfReportedSignal}:{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {formatScore(snapshot.vendorSelfReported.latestScore)}
                    </span>
                  </div>
                  <div>
                    {messages.insights.vendorProduct.firmReviewedSignal}:{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {formatScore(snapshot.firmReviewed.averageScore)}
                    </span>{" "}
                    across{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {snapshot.firmReviewed.assessmentCount}
                    </span>{" "}
                    assessments
                  </div>
                  <div>
                    {messages.insights.shared.confidence}:{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {snapshot.confidenceSummary}
                    </span>
                  </div>
                  <div>
                    {messages.insights.shared.freshness}:{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {formatFreshness(snapshot.latestUpdatedAt)}
                    </span>
                  </div>
                  <div>
                    {messages.insights.vendorProduct.combinedPatReadout}:{" "}
                    <span className="font-semibold text-[var(--shell-ink)]">
                      {snapshot.combinedCurrentPatReadout}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
