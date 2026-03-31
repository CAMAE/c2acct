import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { updateInsightAction, upsertInsightCapabilityRuleAction, upsertInsightUnlockRuleAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminInsightsPage() {
  const [insights, capabilityNodes, badges] = await Promise.all([
    prisma.insight.findMany({
      orderBy: { key: "asc" },
      include: {
        InsightCapabilityRule: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
        },
        InsightUnlockRule: {
          include: {
            Badge: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.badge.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Insights"
        description="Manage live insight inventory, capability thresholds, unlock rules, and visibility state."
      />

      <AdminPanel title="Insight rule management">
        <div className="grid gap-5">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
              <form action={updateInsightAction} className="grid gap-3">
                <input type="hidden" name="insightId" value={insight.id} />
                <input type="hidden" name="returnTo" value="/admin/insights" />
                <input name="title" defaultValue={insight.title} className="pat-input" />
                <textarea name="body" defaultValue={insight.body} rows={3} className="pat-textarea" />
                <div className="grid gap-3 md:grid-cols-[0.5fr_0.5fr_auto]">
                  <input name="tier" type="number" min={1} max={2} defaultValue={insight.tier} className="pat-input" />
                  <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                    <input type="checkbox" name="active" defaultChecked={insight.active} />
                    Active
                  </label>
                  <button type="submit" className="pat-button-secondary">
                    Save insight
                  </button>
                </div>
              </form>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">Capability rules</div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--shell-muted)]">
                    {insight.InsightCapabilityRule.map((rule) => (
                      <div key={rule.id}>
                        {rule.CapabilityNode.title} · min {rule.minScore}% · {rule.required ? "required" : "optional"}
                      </div>
                    ))}
                  </div>
                  <form action={upsertInsightCapabilityRuleAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="insightId" value={insight.id} />
                    <input type="hidden" name="returnTo" value="/admin/insights" />
                    <select name="nodeId" defaultValue="" className="pat-select">
                      <option value="" disabled>
                        Add capability rule
                      </option>
                      {capabilityNodes.map((node) => (
                        <option key={node.id} value={node.id}>
                          {node.title}
                        </option>
                      ))}
                    </select>
                    <input name="minScore" type="number" min={0} max={100} defaultValue="60" className="pat-input" />
                    <label className="flex items-center gap-2 text-sm text-[var(--shell-muted)]">
                      <input type="checkbox" name="required" defaultChecked />
                      Required rule
                    </label>
                    <button type="submit" className="pat-button-primary">
                      Save capability rule
                    </button>
                  </form>
                </div>

                <div className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">Unlock rules</div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--shell-muted)]">
                    {insight.InsightUnlockRule.map((rule) => (
                      <div key={rule.id}>
                        {rule.Badge.name} · {rule.required ? "required" : "optional"}
                      </div>
                    ))}
                  </div>
                  <form action={upsertInsightUnlockRuleAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="insightId" value={insight.id} />
                    <input type="hidden" name="returnTo" value="/admin/insights" />
                    <select name="badgeId" defaultValue="" className="pat-select">
                      <option value="" disabled>
                        Add unlock rule
                      </option>
                      {badges.map((badge) => (
                        <option key={badge.id} value={badge.id}>
                          {badge.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-[var(--shell-muted)]">
                      <input type="checkbox" name="required" defaultChecked />
                      Required rule
                    </label>
                    <button type="submit" className="pat-button-primary">
                      Save unlock rule
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
