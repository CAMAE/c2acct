import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

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
  const requiredKey = "firm_alignment_v1";

  // GATING via DB (server-side, no extra fetch)
  const requiredModule = await prisma.surveyModule.findUnique({
    where: { key: requiredKey },
    select: { id: true, key: true, title: true },
  });

  const requiredDone = requiredModule
    ? (await prisma.surveySubmission.count({
        where: { companyId, moduleId: requiredModule.id },
      })) > 0
    : false;

  if (!requiredDone) {
    const mods = await prisma.surveyModule.findMany({
      where: { active: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, title: true },
    });

    const submissions = await prisma.surveySubmission.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: { moduleId: true, createdAt: true },
    });

    const latestByModule: Record<string, string> = {};
    for (const s of submissions) {
      if (!latestByModule[s.moduleId]) latestByModule[s.moduleId] = s.createdAt.toISOString();
    }

    const modules = mods.map((m) => ({
      key: m.key,
      title: m.title,
      submitted: !!latestByModule[m.id],
      lastSubmittedAt: latestByModule[m.id] ?? null,
    }));

    return (
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <div>
          <div className="text-2xl font-semibold">Outputs</div>
          <div className="text-sm opacity-70 mt-1">companyId: {companyId}</div>
        </div>

        <div className="rounded-2xl border p-5 space-y-3">
          <div className="text-lg font-medium">Unlock Tier 1 Insights</div>
          <div className="text-sm opacity-80">
            Complete the required assessment to unlock your first insights.
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Link
              href={`/survey/${requiredKey}?companyId=${encodeURIComponent(companyId)}`}
              className="inline-flex items-center rounded-xl bg-black text-white px-4 py-2 text-sm"
            >
              Start: {requiredModule?.title ?? "Required Assessment"}
            </Link>

            <Link
              href={`/survey?companyId=${encodeURIComponent(companyId)}`}
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm"
            >
              View all assessments
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm font-medium mb-3">Assessment progress</div>
          <ul className="text-sm space-y-2">
            {modules.map((m) => (
              <li key={m.key} className="flex justify-between gap-3">
                <span>{m.title}</span>
                <span className={m.submitted ? "text-green-700" : "opacity-70"}>
                  {m.submitted ? "Completed" : "Not started"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  // Insights fetch using host/proto (works in prod + local, no env needed)
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
