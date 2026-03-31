import Link from "next/link";
import { getFirmProductCatalog } from "@/lib/firmPat";

export const dynamic = "force-dynamic";

export default async function FirmProductAssessmentsPage() {
  const products = await getFirmProductCatalog();

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Firm product assessments</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Review vendor products through utility-aligned firm questions
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          The firm product review loop only asks questions inside the vendor-declared utility scope for each product. These submissions feed the vendor product insight page directly.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {products.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            No products are available for firm review yet. Vendor product registration and utility declaration must exist first.
          </div>
        ) : (
          products.map((product) => (
            <Link
              key={product.id}
              href={`/firm/product-assessments/${product.id}`}
              className="block rounded-[24px] border border-[var(--shell-border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--shell-accent)]/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-semibold text-[var(--shell-ink)]">{product.name}</div>
                  <div className="mt-2 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                </div>
                <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                  {product.utilityKeys.length * 20} q
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                {product.summary ?? "No summary added yet."}
              </p>
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
      </section>
    </div>
  );
}
