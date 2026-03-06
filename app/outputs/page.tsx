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

  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    process.env.VERCEL_URL;

  if (!envUrl) {
    return `${proto}://localhost:3000`;
  }

  return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
}

type ResultPayload = {
  score?: number | null;
  weightedAvg?: number | null;
  answeredCount?: number | null;
  moduleId?: string | null;
} | null;

type InsightPayload = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
};

type BadgePayload = {
  id: string;
  badgeId: string;
  moduleId: string;
  awardedAt: string;
  name: string;
};

export default async function OutputsPage() {
  const apiBaseUrl = await getApiBaseUrl();
  const cookieHeader = (await cookies()).toString();
  const authHeaders = cookieHeader ? { cookie: cookieHeader } : undefined;
  const loginRedirect = "/login?callbackUrl=%2Foutputs";

  const [resultsRes, insightsRes, badgesRes] = await Promise.all([
    fetch(`${apiBaseUrl}/api/results`, {
      cache: "no-store",
      headers: authHeaders,
    }),
    fetch(`${apiBaseUrl}/api/insights/unlocked`, {
      cache: "no-store",
      headers: authHeaders,
    }),
    fetch(`${apiBaseUrl}/api/badges/earned`, {
      cache: "no-store",
      headers: authHeaders,
    }),
  ]);

  if (
    resultsRes.status === 401 ||
    insightsRes.status === 401 ||
    badgesRes.status === 401
  ) {
    redirect(loginRedirect);
  }

  const [resultsJson, insightsJson, badgesJson] = await Promise.all([
    resultsRes.json().catch(() => ({})),
    insightsRes.json().catch(() => ({})),
    badgesRes.json().catch(() => ({})),
  ]);

  const forbidden =
    resultsRes.status === 403 ||
    insightsRes.status === 403 ||
    badgesRes.status === 403;

  const apiError = !forbidden
    ? [resultsRes, insightsRes, badgesRes]
        .map((res, i) => {
          if (res.ok) return null;
          const body = [resultsJson, insightsJson, badgesJson][i] as any;
          return String(body?.error ?? body?.detail ?? `HTTP ${res.status}`);
        })
        .find(Boolean) ?? null
    : null;

  const result = (resultsJson as any)?.result as ResultPayload;
  const unlocked = Array.isArray((insightsJson as any)?.unlocked)
    ? ((insightsJson as any).unlocked as InsightPayload[])
    : [];
  const earned = Array.isArray((badgesJson as any)?.earned)
    ? ((badgesJson as any).earned as BadgePayload[])
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

  const outputCards = [
    { title: "Institutional Profile", desc: "Capability scoring + operational alignment snapshot." },
    { title: "Alignment Baseline", desc: "Where the firm is now — quantified." },
    { title: "Operating System Map", desc: "How work actually moves through the firm." },
    { title: "Automation Readiness", desc: "What can be delegated, what must stay human." },
    { title: "Risk & Control Posture", desc: "Controls, exposure, and governance maturity." },
    { title: "Implementation Roadmap", desc: "Sequenced steps to reach high alignment." },
    { title: "Executive Brief", desc: "Board-ready summary and next actions." },
  ];

  return (
    <>
      <EnsureCompanySelected />
      <section>
        <div className="mb-10">
          <h1 className="text-5xl font-semibold tracking-tight">Top Seven Outputs</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            The seven institutional deliverables that define high-alignment firms.
          </p>
        </div>

        {forbidden ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-white/70">
              Signed in, but your account is not authorized for company-scoped outputs.
            </p>
          </div>
        ) : apiError ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm text-white/70">Unable to load outputs: {apiError}</p>
          </div>
        ) : (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="text-sm text-white/60">Alignment score</div>
              <div className="mt-2 text-3xl font-semibold">
                {score === null ? "--" : `${score}%`}
              </div>
              <div className="mt-2 text-sm text-white/60">
                Weighted avg: {weightedAvg === null ? "--" : weightedAvg.toFixed(2)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="text-sm text-white/60">Unlocked insights</div>
              <div className="mt-2 text-3xl font-semibold">{unlocked.length}</div>
              <div className="mt-2 text-sm text-white/60">
                Answered count: {answeredCount}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="text-sm text-white/60">Earned badges</div>
              <div className="mt-2 text-3xl font-semibold">{earned.length}</div>
              <div className="mt-2 text-sm text-white/60">
                Module ID: {result?.moduleId ?? "--"}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {outputCards.map((x) => {
            const unlockedState = unlocked.length > 0;

            return (
              <div
                key={x.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-medium">{x.title}</div>
                  <div className="text-xs text-white/50">
                    {unlockedState ? "Available" : "Locked"}
                  </div>
                </div>
                <div className="mt-2 text-sm text-white/70">{x.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-white/70">
            {unlocked.length > 0
              ? "Protected outputs loaded with current session-scoped data."
              : "No unlocked output payloads yet for this company session."}
          </p>
        </div>
      </section>
    </>
  );
}
