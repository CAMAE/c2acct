import Link from "next/link";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { getViewerResultsPageData } from "@/lib/loaders/getViewerResultsPageData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";


export default async function ResultsPage({
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
  const data = await getViewerResultsPageData({ searchParams: resolvedSearchParams });

  if (data.kind === "unauthorized") {
    redirect("/login?callbackUrl=%2Fresults");
  }

  const result = data.kind === "ok" ? data.result : null;
  const forbidden = data.kind === "forbidden";
  const apiError = data.kind === "error" ? data.error : null;
  const enableProductSelection = data.kind === "ok" ? data.context.enableProductSelection : false;
  const products =
    data.kind === "ok"
      ? data.context.products.map((product) => ({ id: product.id, name: product.name }))
      : [];

  const score =
    typeof result?.score === "number" && Number.isFinite(result.score)
      ? Math.round(result.score)
      : null;

  const weightedAvg =
    typeof result?.weightedAvg === "number" && Number.isFinite(result.weightedAvg)
      ? result.weightedAvg
      : null;

  const answeredCount =
    typeof result?.answeredCount === "number" && Number.isFinite(result.answeredCount)
      ? result.answeredCount
      : 0;

  const integrityRaw = Number(result?.signalIntegrityScore);
  const signalIntegrityScore =
    Number.isFinite(integrityRaw) && integrityRaw > 0 ? integrityRaw : 1;

  const effectiveScore = score === null ? null : Math.round(score * signalIntegrityScore);
  const effectiveWeightedAvg =
    weightedAvg === null ? null : Math.round(weightedAvg * signalIntegrityScore * 100) / 100;
  const contextLabel = productIdFilter ? "Product context" : "Company baseline";
  const readinessTone =
    effectiveScore === null ? "Awaiting submission" : effectiveScore >= 70 ? "Strong signal" : effectiveScore >= 45 ? "Emerging signal" : "Needs evidence";

  return (
    <>
      <EnsureCompanySelected />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Results Snapshot
                </div>
                <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-950">Current Assessment Signal</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Default reporting stays pinned to the canonical baseline profile unless you explicitly request a module-specific context.
                </p>
              </div>
              <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                <div className="font-semibold text-slate-900">{contextLabel}</div>
                <div className="mt-2 text-slate-600">Readiness: {readinessTone}</div>
                <div className="mt-1 text-slate-600">Questions answered: {answeredCount}</div>
              </div>
            </div>

            {enableProductSelection ? (
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <form method="GET" className="flex flex-wrap items-center gap-3">
                  <label htmlFor="productId" className="text-sm font-medium text-slate-800">
                    Context
                  </label>
                  <select
                    id="productId"
                    name="productId"
                    defaultValue={productIdFilter ?? ""}
                    title="Choose the Results context you want to review. Changing this selector reloads the page with the latest snapshot for that company-root or product-specific context."
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                  >
                  <option value="">Company baseline</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    title="Apply the selected Results context and reload the current summary. This changes which stored submission snapshot you are reviewing, but it does not modify any data."
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
                  >
                    Apply
                  </button>
                </form>
              </div>
            ) : null}

            <div className="mt-10">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Latest submission</h2>

              {forbidden ? (
                <div className="rounded-2xl border border-black/10 bg-white p-6 text-slate-800 shadow-sm">
                  <div className="text-slate-700">
                    Signed in, but your account is not authorized for company-scoped results.
                  </div>
                </div>
              ) : apiError ? (
                <div className="rounded-2xl border border-black/10 bg-white p-6 text-slate-800 shadow-sm">
                  <div className="text-slate-700">Unable to load results: {apiError}</div>
                </div>
              ) : !result ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-800 shadow-sm">
                  <div className="font-semibold text-slate-900">No submission yet</div>
                  <div className="mt-2 text-slate-700">Complete an Assessment to generate your first report snapshot.</div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Reported score</div>
                      <div className="mt-3 text-6xl font-bold tracking-tight">
                        {score === null ? "--" : `${score}%`}
                      </div>
                      <div className="mt-4 text-sm text-slate-300">
                        Weighted average: {weightedAvg === null ? "--" : weightedAvg.toFixed(2)}
                      </div>
                      <div className="mt-2 text-sm text-slate-300">
                        View mode: {productIdFilter ? `Product-filtered` : "Company baseline"}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        title="Signal integrity shows the confidence level attached to the current Assessment snapshot. This value helps explain how much trust to place in the presented summary without changing the underlying submission."
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Signal integrity</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">{signalIntegrityScore.toFixed(2)}</div>
                      </div>
                      <div
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        title="This is the current integrity-adjusted Results view used for presentation. It helps explain the current signal quality while keeping the underlying engine behavior unchanged."
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Integrity-adjusted</div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950">
                          {effectiveScore === null ? "--" : `${effectiveScore}%`}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          Weighted average: {effectiveWeightedAvg === null ? "--" : effectiveWeightedAvg.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Module</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">{result.moduleId ?? "--"}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Answered</div>
                      <div className="mt-2 text-sm font-medium text-slate-900">{answeredCount}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Product ID</div>
                      <div className="mt-2 truncate text-sm font-medium text-slate-900" title={result.productId ?? "--"}>
                        {result.productId ?? "--"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <div className="flex flex-wrap items-center gap-5">
                  <Link
                    className="font-medium text-slate-800 underline decoration-slate-400 underline-offset-4 hover:text-slate-950"
                    href="/survey"
                    title="Return to Assessment and choose the next module or context. This takes you back to the current entry screen without changing the saved results."
                  >
                    Back to Assessment
                  </Link>
                  <Link
                    className="font-medium text-slate-800 underline decoration-slate-400 underline-offset-4 hover:text-slate-950"
                    href={productIdFilter ? `/outputs?productId=${encodeURIComponent(productIdFilter)}` : "/outputs"}
                    title="Open Insights and move from the current summary into the unlocked intelligence view. This is the primary destination after Results in the current demo flow."
                  >
                    Continue to Insights
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
