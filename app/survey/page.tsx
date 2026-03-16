import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { getSurveyEntryPageData } from "@/lib/loaders/getSurveyEntryPageData";
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
  const data = await getSurveyEntryPageData({ searchParams: resolvedSearchParams });

  if (data.context.kind === "unauthorized") {
    redirect("/login?callbackUrl=%2Fsurvey");
  }

  const enableProductSelection = data.context.kind === "ok" && data.context.enableProductSelection === true;
  const firmModules = data.firmModules;
  const productModules = data.productModules;
  const baselineFirmModule = data.baselineFirmModule;
  const productModule = data.productModule;

  if (!enableProductSelection && firmModules.length === 1 && baselineFirmModule) {
    redirect(`/survey/${baselineFirmModule.key}`);
  }

  const products =
    data.context.kind === "ok"
      ? data.context.products.map((product) => ({ id: product.id, name: product.name }))
      : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.16),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-16 text-slate-900">
      <EnsureCompanySelected />
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Demo Entry
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Choose Your Assessment Path</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                The baseline firm module stays as the default reporting path. Additional modules shown here are available only when they have been explicitly activated for controlled rollout in the Assessment experience.
              </p>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">Available now</div>
                <div className="mt-2">Firm modules: {firmModules.length}</div>
                <div className="mt-1">Product modules: {productModules.length}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Firm Context</div>
                  <div className="mt-1 text-sm text-slate-600">Company-root Assessment modules that are currently enabled for runtime use.</div>
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                  Default path preserved
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {firmModules.map((module) => {
                  const isBeta = module.activationState === "BETA";

                  return (
                    <div
                      key={module.key}
                      className={`group rounded-2xl border p-5 transition ${
                        isBeta
                          ? "border-amber-200 bg-amber-50/80 shadow-[0_12px_30px_rgba(245,158,11,0.08)]"
                          : "border-slate-200 bg-white shadow-sm"
                      }`}
                      title={
                        isBeta
                          ? "This Assessment module is live for controlled demo access. Opening it takes you into a module-specific path, but it does not replace the default baseline report."
                          : "This is the canonical baseline Assessment module for the current demo path. Opening it keeps you on the standard company-root flow."
                      }
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-slate-950">{module.title}</div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                                isBeta
                                  ? "border border-amber-300 bg-white text-amber-700"
                                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {isBeta ? "Beta" : "Baseline"}
                            </span>
                          </div>
                          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {module.key}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {isBeta
                              ? "Use for controlled module-specific assessment. Default results remain pinned to the baseline report unless you explicitly request this module."
                              : "Use for the canonical company demo flow: survey, submit, results, and outputs."}
                          </p>
                        </div>
                        <a
                          href={`/survey/${module.key}`}
                          title={
                            isBeta
                              ? "Open this beta Assessment module and answer the currently active questions for this controlled rollout. Results remain baseline by default unless a module-specific context is requested later."
                              : "Open the baseline Assessment module and continue through the protected company demo path. This is the main route into results and insights for the default flow."
                          }
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          Open assessment
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Product Context</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Product-scoped Assessment remains on the current live module. External review continues to support the product intelligence lane separately.
              </p>

              {enableProductSelection && productModule ? (
                <form
                  method="GET"
                  action={`/survey/${productModule.key}`}
                  className="mt-5 grid gap-3"
                >
                  <label htmlFor="productScopeId" className="text-sm font-medium text-slate-800">
                    Select product
                  </label>
                  <select
                    id="productScopeId"
                    name="productId"
                    defaultValue={productIdFilter ?? ""}
                    required
                    title="Choose the product context for the current Assessment. Using this selector routes the next page load to the product-specific module for that product."
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800"
                  >
                    <option value="" disabled>
                      Choose product context
                    </option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    title="Open the product Assessment module for the selected product. This starts the product-scoped path that leads to product results and insights."
                    className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Open product assessment
                  </button>
                </form>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  Product selection is only available for vendor companies with product records.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
