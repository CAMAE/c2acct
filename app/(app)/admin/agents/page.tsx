import Link from "next/link";
import { getAgentsOverview } from "@/lib/agents/adminConsole";
import { Sparkline, StatusBadge, StatusDot, relativeTime, untilTime } from "@/app/components/agents/AgentVisuals";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminAgentsListPage() {
  const agents = await getAgentsOverview();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">Agents</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <Link key={agent.key} href={`/admin/agents/${agent.key}`} className={`${CARD} block hover:bg-white/70`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusDot health={agent.health} />
                <span className="font-semibold text-[var(--shell-ink)]">{agent.key}</span>
              </div>
              <span className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                {agent.enabled ? agent.health : "disabled"}
              </span>
            </div>
            <div className="mt-1 text-sm text-[var(--shell-muted)]">{agent.name}</div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--shell-muted)]">{agent.runs24h} runs / 24h</span>
              <Sparkline data={agent.sparkline} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[var(--shell-muted)]">
              <span>
                last: {agent.lastRunStatus ? <StatusBadge status={agent.lastRunStatus} /> : "never"}{" "}
                {agent.lastRunAt ? `· ${relativeTime(agent.lastRunAt)}` : ""}
              </span>
              <span>next: {agent.nextScheduled ? untilTime(agent.nextScheduled) : agent.scheduleLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
