import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  searchParams,
}: {
  searchParams?: Promise<{ productId?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const productIdParamRaw = resolvedSearchParams.productId;
  const productIdParam = Array.isArray(productIdParamRaw)
    ? productIdParamRaw[0]
    : productIdParamRaw;
  const requestedProductId = typeof productIdParam === "string" ? productIdParam.trim() : "";
  const productIdFilter = requestedProductId.length > 0 ? requestedProductId : null;

  const apiBaseUrl = await getRequestOrigin();
  const cookieHeader = (await cookies()).toString();
  const requestHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;

  const contextRes = await fetch(`${apiBaseUrl}/api/products/context`, {
    cache: "no-store",
    headers: requestHeaders,
  });

  if (contextRes.status === 401) {
    redirect("/login?callbackUrl=%2Fsurvey");
  }

  const contextJson = await contextRes.json().catch(() => ({}));
  const contextForbidden = contextRes.status === 403;
  const contextError = !contextRes.ok && !contextForbidden;
  const enableProductSelection = !contextError && contextJson?.enableProductSelection === true;

  if (!enableProductSelection) {
    redirect("/survey/firm_alignment_v1");
  }

  const products: Array<{ id: string; name: string }> = Array.isArray(contextJson?.products)
    ? contextJson.products
    : [];

  return (
    <div className="min-h-screen px-6 py-16 text-slate-900">
      <EnsureCompanySelected />
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Survey Context</h1>
        <p className="mt-3 text-slate-700">Choose company-root or a product context before opening the survey.</p>

        <div className="mt-6 rounded-xl border border-black/10 bg-white p-4 shadow-sm">
          <form method="GET" action="/survey/firm_alignment_v1" className="flex flex-wrap items-center gap-3">
            <label htmlFor="productId" className="text-sm font-medium text-slate-800">
              Context
            </label>
            <select
              id="productId"
              name="productId"
              defaultValue={productIdFilter ?? ""}
              className="rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="">Company-root survey</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md border border-black/15 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Open Survey
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}