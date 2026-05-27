import Link from "next/link";
import { getAgentsOverview, getHealthBanner, getPendingApprovals } from "@/lib/agents/adminConsole";
import { signApproval } from "@/ops/telegram-bot/hmac";
import { Sparkline, StatusBadge, StatusDot, relativeTime, untilTime } from "@/app/components/agents/AgentVisuals";
import CommandBar from "@/app/components/agents/CommandBar";
import ApprovalActions from "@/app/components/agents/ApprovalActions";
import LiveActionStream from "@/app/components/agents/LiveActionStream";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminAgentDashboard() {
  const [banner, agents, approvals] = await Promise.all([
    getHealthBanner(),
    getAgentsOverview(),
    getPendingApprovals(),
  ]);
  const topApprovals = approvals.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Global status banner */}
      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">Agent ops</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--shell-muted)]">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              {banner.healthy}/{banner.enabled} enabled healthy
            </span>
            <span>{banner.pendingApprovals} approvals pending</span>
            <span>
              last event: {banner.lastEventSummary ?? "—"} ({relativeTime(banner.lastEventAt)})
            </span>
          </div>
        </div>
      </section>

      {/* Command bar */}
      <CommandBar />

      {/* Pending approvals */}
      <section className={CARD}>
        <div className="mb-3 text-sm font-semibold text-[var(--shell-ink)]">
          Pending approvals ({approvals.length})
        </div>
        {topApprovals.length === 0 ? (
          <div className="text-sm text-[var(--shell-muted)]">No approvals pending.</div>
        ) : (
          <div className="grid gap-3">
            {topApprovals.map((approval) => (
              <div
                key={approval.id}
                className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-[var(--shell-ink)]">
                    {approval.agentKey} — {approval.proposedAction}
                  </div>
                  <div className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                    {approval.blastRadius ?? "?"} · {relativeTime(approval.createdAt)}
                  </div>
                </div>
                <pre className="mt-2 overflow-auto rounded-lg bg-white/60 p-2 text-xs text-[var(--shell-muted)]">
                  {JSON.stringify(approval.proposedArgs, null, 2)}
                </pre>
                <ApprovalActions
                  id={approval.id}
                  hmac={signApproval(approval.id, new Date(approval.createdAt).getTime())}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Link className="text-sm text-[var(--shell-ink)] underline" href="/admin/approvals">
            View all approvals →
          </Link>
        </div>
      </section>

      {/* Agent grid */}
      <section>
        <div className="mb-3 text-sm font-semibold text-[var(--shell-ink)]">Agents</div>
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
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-sm text-[var(--shell-muted)]">
                  {agent.runs24h} runs / 24h
                  {agent.pendingApprovals > 0 ? ` · ${agent.pendingApprovals} pending` : ""}
                </div>
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
      </section>

      {/* Recent activity (live) */}
      <section>
        <div className="mb-3 text-sm font-semibold text-[var(--shell-ink)]">Recent activity</div>
        <LiveActionStream agentKey="_all" />
      </section>
    </div>
  );
}
