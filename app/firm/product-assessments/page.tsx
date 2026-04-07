import Link from "next/link";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

type SearchParams = {
  blockedProductId?: string;
};

export default async function FirmProductAssessmentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const products = await getFirmProductCatalog();
  const reviewableProducts = products.filter((product) => product.reviewAvailable);
  const unavailableProducts = products.filter((product) => !product.reviewAvailable);
  const blockedProduct =
    params?.blockedProductId ? products.find((product) => product.id === params.blockedProductId) : null;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm product assessments</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Review vendor products through utility-aligned firm questions
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The firm product review loop only opens after the vendor completes the full product assessment for a product. Once that vendor submission is complete, the firm review stays inside the validated utility scope and feeds the vendor product insight page directly.
        </p>
      </section>

      {blockedProduct && !blockedProduct.reviewAvailable ? (
        <div className="pat-banner pat-banner-warning">
          {blockedProduct.name} is not reviewable yet. Firm product review opens only after the vendor completes the
          full product assessment.
        </div>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Ready for firm review</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
            These products have a completed vendor product assessment, so the firm-side review can open inside the validated utility scope.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {reviewableProducts.length === 0 ? (
            <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
              No products are reviewable yet. Firm review opens only after the vendor completes the full product assessment.
            </div>
          ) : (
            reviewableProducts.map((product) => (
              <Link
                key={product.id}
                href={`/firm/product-assessments/${product.id}`}
                className="pat-card pat-card-interactive block rounded-[24px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                    <div className="mt-2 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                  </div>
                  <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    {product.questionCount} q
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                  {product.summary ?? "No summary added yet."}
                </p>
                <div className="mt-4 text-sm font-semibold text-[var(--shell-accent)]">{product.reviewStatusLabel}</div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {product.utilityKeys.map((utilityKey) => (
                    <span
                      key={utilityKey}
                      className="rounded-full border border-[var(--shell-border)] px-3 py-1.5 text-xs font-medium text-[var(--shell-ink)]"
                    >
                      {utilityKey.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {unavailableProducts.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Awaiting completed vendor assessment</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
              These products stay visible so inventory does not disappear from the firm view, but they are not enterable until the vendor finishes the full product assessment.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {unavailableProducts.map((product) => (
              <div
                key={product.id}
                className="pat-card rounded-[24px] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                    <div className="mt-2 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                  </div>
                  <span className="rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    {product.reviewStatusLabel}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                  {product.summary ?? "No summary added yet."}
                </p>
                <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{product.reviewStatusReason}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
