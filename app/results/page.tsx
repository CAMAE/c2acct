import Link from "next/link";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/request-origin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";


export default async function ResultsPage() {
  const apiBaseUrl = await getRequestOrigin();
  const cookieHeader = (await cookies()).toString();
  const resultsRes = await fetch(`${apiBaseUrl}/api/results`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (resultsRes.status === 401) {
    redirect("/login?callbackUrl=%2Fresults");
  }

  const resultsJson = await resultsRes.json().catch(() => ({}));
  const result = resultsJson?.result as
    | {
      productId?: string | null;
        score?: number | null;
        weightedAvg?: number | null;
        answeredCount?: number | null;
        moduleId?: string | null;
        signalIntegrityScore?: number | null;
      }
    | null;

  const forbidden = resultsRes.status === 403;
  const apiError =
    !resultsRes.ok && !forbidden
      ? String(resultsJson?.error ?? resultsJson?.detail ?? `HTTP ${resultsRes.status}`)
      : null;

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

  return (
    <>
      <EnsureCompanySelected />
      <div className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-center text-5xl font-bold text-slate-900">Results</h1>
          <p className="mt-4 text-center text-slate-700">Session-scoped latest submission</p>

          <div className="mt-10">
            <h2 className="mb-3 font-semibold text-slate-900">Latest submission</h2>

            {forbidden ? (
              <div className="rounded-xl border border-black/10 bg-white p-6 text-slate-800 shadow-sm">
                <div className="text-slate-700">
                  Signed in, but your account is not authorized for company-scoped results.
                </div>
              </div>
            ) : apiError ? (
              <div className="rounded-xl border border-black/10 bg-white p-6 text-slate-800 shadow-sm">
                <div className="text-slate-700">Unable to load results: {apiError}</div>
              </div>
            ) : !result ? (
              <div className="rounded-xl border border-black/10 bg-white p-6 text-slate-800 shadow-sm">
                <div className="text-slate-700">No submissions yet.</div>
              </div>
            ) : (
              <div className="rounded-xl border border-black/10 bg-white p-6 text-slate-900 shadow-sm">
                <div className="text-sm font-medium text-slate-600">Alignment Score</div>
                <div className="mt-1 text-5xl font-bold tracking-tight text-slate-900">
                  {score === null ? "--" : `${score}%`}
                </div>

                <div className="mt-3 text-sm text-slate-700">
                  Raw weighted average: {weightedAvg === null ? "--" : weightedAvg.toFixed(2)}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Signal integrity: {signalIntegrityScore.toFixed(2)}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Integrity-adjusted score: {effectiveScore === null ? "--" : `${effectiveScore}%`}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Integrity-adjusted weighted average: {effectiveWeightedAvg === null ? "--" : effectiveWeightedAvg.toFixed(2)}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Module ID: {result.moduleId ?? "--"} - Answered: {answeredCount}
                </div>

                <div className="mt-2 text-sm text-slate-700">
                  Product ID: {result.productId ?? "--"}
                </div>
              </div>
            )}

            <div className="mt-8">
              <Link className="font-medium text-slate-800 underline decoration-slate-400 underline-offset-4 hover:text-slate-950" href="/survey">
                Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
