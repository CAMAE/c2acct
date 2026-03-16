import Link from "next/link";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { getSessionUser } from "@/lib/auth/session";
import { getViewerIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";

export const dynamic = "force-dynamic";

export default async function OutputsPage({
  searchParams,
}: {
  searchParams?: Promise<{ productId?: string | string[] | undefined }>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Foutputs");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const productIdParamRaw = resolvedSearchParams.productId;
  const productId = Array.isArray(productIdParamRaw) ? productIdParamRaw[0] ?? null : productIdParamRaw ?? null;

  if (productId?.trim()) {
    redirect(`/products/${encodeURIComponent(productId.trim())}/intelligence`);
  }

  const data = await getViewerIntelligencePageData({
    productId: null,
    searchParams: resolvedSearchParams,
  });

  if (!data) {
    return (
      <section className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-1 text-slate-900">
        <div className="mb-10">
          <EnsureCompanySelected />
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/85 p-4 text-sm text-slate-800 shadow-sm">
          Unable to load the selected intelligence context.
        </div>
      </section>
    );
  }

  const featuredProducts = data.catalog.slice(0, 6);

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_24%),radial-gradient(circle_at_top_left,_rgba(245,158,11,0.08),_transparent_26%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-1 text-slate-900">
      <div className="mb-10">
        <EnsureCompanySelected />
        <div className="rounded-[28px] border border-white/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Insights bridge
              </div>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">Insights</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Thin bridge into the canonical product intelligence routes. Use this page to choose a product context or continue into the product catalog.
              </p>
            </div>
            <div className="grid min-w-[240px] gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <div>
                <div className="font-semibold text-slate-900">Visible products</div>
                <div className="mt-1">{data.catalog.length}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-900">Current company</div>
                <div className="mt-1">{data.currentCompany.name}</div>
              </div>
            </div>
          </div>

          {data.catalog.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <form method="GET" className="flex flex-wrap items-center gap-3">
                <label htmlFor="productId" className="text-sm font-medium text-slate-800">
                  Context
                </label>
                <select
                  id="productId"
                  name="productId"
                  defaultValue=""
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">Company-root insights</option>
                  {data.catalog.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  Apply
                </button>
              </form>
              <div className="mt-3 text-xs text-slate-500">
                <Link
                  href="/products"
                  className="font-medium text-slate-700 underline underline-offset-4"
                >
                  Open canonical product catalog
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company-root summary</div>
          <div className="mt-3 text-3xl font-semibold text-slate-950">
            {typeof data.result.score === "number" ? `${Math.round(data.result.score)}%` : "--"}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Current company-root signal stays available here as a bridge, but product intelligence lives on the canonical `/products` routes.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Browse product intelligence
            </Link>
            <Link
              href="/results"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              Open results
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visible product routes</div>
          {featuredProducts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No visible products are available in the current viewer scope.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${encodeURIComponent(product.id)}/intelligence`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition hover:bg-white"
                >
                  <div className="font-semibold text-slate-900">{product.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {product.accessReason === "OWNED" ? "Owned product" : "Visible product"}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {data.catalog.length > featuredProducts.length ? (
            <div className="mt-4 text-xs text-slate-500">
              <Link href="/products" className="font-medium text-slate-700 underline underline-offset-4">
                View the full catalog
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
