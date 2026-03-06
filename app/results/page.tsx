import Link from "next/link";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getApiBaseUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? process.env.VERCEL_URL;
  if (!envUrl) {
    return `${proto}://localhost:3000`;
  }

  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

export default async function ResultsPage() {
  const apiBaseUrl = await getApiBaseUrl();
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
        score?: number | null;
        weightedAvg?: number | null;
        answeredCount?: number | null;
        moduleId?: string | null;
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

  return (
    <>
      <EnsureCompanySelected />
      <div className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold text-center">Results</h1>
          <p className="text-center mt-4 opacity-70">Session-scoped latest submission</p>

          <div className="mt-10">
            <h2 className="font-semibold mb-3">Latest submission</h2>

            {forbidden ? (
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <div className="opacity-70">
                  Signed in, but your account is not authorized for company-scoped results.
                </div>
              </div>
            ) : apiError ? (
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <div className="opacity-70">Unable to load results: {apiError}</div>
              </div>
            ) : !result ? (
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <div className="opacity-70">No submissions yet.</div>
              </div>
            ) : (
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <div className="opacity-60 text-sm">Alignment Score</div>
                <div className="text-5xl font-bold mt-1">
                  {score === null ? "--" : `${score}%`}
                </div>

                <div className="opacity-60 text-sm mt-2">
                  Weighted average: {weightedAvg === null ? "--" : weightedAvg.toFixed(2)}
                </div>

                <div className="opacity-60 text-sm mt-2">
                  Module ID: {result.moduleId ?? "--"} - Answered: {answeredCount}
                </div>
              </div>
            )}

            <div className="mt-8">
              <Link className="underline" href="/survey">
                Back to Survey
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
