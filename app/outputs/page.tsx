import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function OutputsPage() {
  const companyId = "demo_company"; // TODO: replace with auth/session company
  const requiredKey = "firm_alignment_v1";

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

  const requiredTier1Complete = modules.some((m) => m.key === requiredKey && m.submitted);

  if (!requiredTier1Complete) {
    const required = modules.find((m) => m.key === requiredKey);
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Outputs</h1>

        <div className="rounded-2xl border p-5 space-y-3">
          <div className="text-lg font-medium">Unlock Tier 1 Insights</div>
          <div className="text-sm text-muted-foreground">
            Complete the required assessment to unlock your first insights.
          </div>

          <div className="flex gap-3 items-center">
            <Link
              href={`/survey/${requiredKey}`}
              className="inline-flex items-center rounded-xl bg-black text-white px-4 py-2 text-sm"
            >
              Start: {required?.title ?? "Required Assessment"}
            </Link>

            <Link
              href="/survey"
              className="inline-flex items-center rounded-xl border px-4 py-2 text-sm"
            >
              View all assessments
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border p-5">
          <div className="text-sm font-medium mb-2">Assessment progress</div>
          <ul className="text-sm space-y-1">
            {modules.map((m) => (
              <li key={m.key} className="flex justify-between gap-3">
                <span>{m.title}</span>
                <span className={m.submitted ? "text-green-700" : "text-muted-foreground"}>
                  {m.submitted ? "Completed" : "Not started"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  // If gate passed, keep existing behavior (fetch unlocked insights via internal API)
  const unlockedRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001"}/api/insights/unlocked?companyId=${companyId}`,
    { cache: "no-store" }
  );
  const unlockedJson = await unlockedRes.json();

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Outputs</h1>

      <div className="rounded-2xl border p-5">
        <div className="text-sm font-medium mb-2">Tier 1 Insights</div>
        <pre className="text-xs overflow-auto">{JSON.stringify(unlockedJson, null, 2)}</pre>
      </div>
    </main>
  );
}
