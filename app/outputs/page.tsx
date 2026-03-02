import { headers } from "next/headers";

type RuleStatus = {
  nodeId: string;
  nodeKey: string | null;
  nodeTitle: string | null;
  minScore: number;
  score: number;
  pass: boolean;
};

type InsightDto = {
  id: string;
  key: string;
  title: string;
  body: string;
  tier: number;
  unlocked: boolean;
  lockedReason: string | null;
  ruleStatus?: RuleStatus[] | null;
};

type UnlockedJson = { ok: boolean; companyId: string; insights: InsightDto[] };

export default async function OutputsPage({
  searchParams,
}: {
  searchParams?: { companyId?: string } | Promise<{ companyId?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const companyId = sp.companyId ?? "demo_company";

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";

  const url = `${proto}://${host}/api/insights/unlocked?companyId=${encodeURIComponent(companyId)}`;
  const res = await fetch(url, { cache: "no-store" });

  let insights: InsightDto[] = [];
  if (res.ok) {
    const json = (await res.json()) as UnlockedJson;
    insights = Array.isArray(json.insights) ? json.insights : [];
  }

  const tier1 = insights.filter((i) => i.tier === 1);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="text-xl font-semibold">Tier 1 Outputs</div>
      <div className="text-sm opacity-70 mt-1">companyId: {companyId}</div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {tier1.map((insight) => {
          const locked = !insight.unlocked;
          const tip = locked ? insight.lockedReason ?? "Complete more assessments to unlock" : "";

          return (
            <div
              key={insight.id}
              title={tip}
              className={[
                "rounded-2xl border p-4 shadow-sm transition",
                locked ? "opacity-50 grayscale cursor-not-allowed" : "hover:shadow-md",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{insight.title}</div>
                <span className="text-xs font-medium px-2 py-1 rounded-full border">
                  {locked ? "Locked" : "Unlocked"}
                </span>
              </div>

              <div className="mt-2 text-sm whitespace-pre-wrap">{insight.body}</div>

              {Array.isArray(insight.ruleStatus) && insight.ruleStatus.length > 0 ? (
                <div className="mt-3 text-xs opacity-80 space-y-1">
                  {insight.ruleStatus.map((r) => (
                    <div key={r.nodeId} className="flex justify-between gap-3">
                      <span>{r.nodeTitle ?? r.nodeKey ?? r.nodeId}</span>
                      <span>
                        {r.score.toFixed(2)} / {r.minScore.toFixed(2)} {r.pass ? "✓" : "✗"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
