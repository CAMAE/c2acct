import Link from "next/link";
import { redirect } from "next/navigation";
import { getVisibleProductCatalogForViewer } from "@/lib/intelligence/getVisibleProductCatalogForViewer";

export const dynamic = "force-dynamic";

function normalizeQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = normalizeQueryValue(resolvedSearchParams.q).toLowerCase();
  const catalogPayload = await getVisibleProductCatalogForViewer();

  if (!catalogPayload) {
    redirect("/login?callbackUrl=%2Fproducts");
  }

  const { currentCompany, products } = catalogPayload;
  const filteredProducts = query
    ? products.filter((product) => product.name.toLowerCase().includes(query))
    : products;

  if (products.length === 1) {
    redirect(`/products/${encodeURIComponent(products[0].id)}/intelligence`);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.16),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-[28px] border border-white/80 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Product Catalog
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Product Intelligence Catalog</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Canonical route-based navigation for product intelligence. This surface is optimized for larger product catalogs while `/outputs` remains available as a bridge.
            </p>
            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Tier 1 live | Tier 2 coming soon</div>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">{currentCompany?.name ?? "No company"}</div>
            <div className="mt-2">Visible products: {products.length}</div>
          </div>
        </div>

        {products.length > 8 ? (
          <form method="GET" className="mt-6">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search product intelligence catalog"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
            />
          </form>
        ) : null}

        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            No visible products are available in the current company context.
          </div>
        ) : (
          <div className={`mt-8 grid gap-4 ${products.length <= 4 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${encodeURIComponent(product.id)}/intelligence`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="text-lg font-semibold text-slate-950">{product.name}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {product.accessReason === "OWNED" ? "Owned product" : "Visible product"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
