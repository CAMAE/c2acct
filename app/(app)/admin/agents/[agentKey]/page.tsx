import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAgentConfig,
  getAgentsOverview,
  getPendingApprovals,
  getRecentAudit,
  getRunHistory,
} from "@/lib/agents/adminConsole";
import { signApproval } from "@/ops/telegram-bot/hmac";
import { StatusBadge, StatusDot, relativeTime, untilTime } from "@/app/components/agents/AgentVisuals";
import LiveActionStream from "@/app/components/agents/LiveActionStream";
import ApprovalActions from "@/app/components/agents/ApprovalActions";
import CommandBar from "@/app/components/agents/CommandBar";
import AgentRunButton from "@/app/components/agents/AgentRunButton";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminAgentDetailPage({ params }: { params: Promise<{ agentKey: string }> }) {
  const { agentKey } = await params;
  const config = await getAgentConfig(agentKey);
  if (!config) {
    notFound();
  }

  const [overviews, runs, audit, allApprovals] = await Promise.all([
    getAgentsOverview(),
    getRunHistory(20, agentKey),
    getRecentAudit(30, agentKey),
    getPendingApprovals(),
  ]);
  const overview = overviews.find((o) => o.key === agentKey);
  const approvals = allApprovals.filter((a) => a.agentKey === agentKey);
  const lastRun = runs[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link className="text-sm text-[var(--shell-muted)] underline" href="/admin">
            ← agents
          </Link>
          {overview ? <StatusDot health={overview.health} /> : null}
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">{agentKey}</h1>
        </div>
        <AgentRunButton agentKey={agentKey} label="Run now" variant="primary" />
      </div>

      {/* Status header */}
      <section className={CARD}>
        <div className="grid gap-3 md:grid-cols-4 text-sm">
          <Stat label="State" value={config.enabled ? overview?.health ?? "enabled" : "disabled"} />
          <Stat label="Last activity" value={relativeTime(overview?.lastRunAt ?? null)} />
          <Stat
            label="Last run"
            value={overview?.lastRunStatus ?? "never"}
          />
          <Stat label="Next" value={overview?.nextScheduled ? untilTime(overview.nextScheduled) : config.schedule.type} />
        </div>
        {lastRun?.errorMessage ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            recent error: {lastRun.errorMessage}
          </div>
        ) : null}
        <div className="mt-3 text-xs text-[var(--shell-muted)]">
          caps — turns ≤ {config.limits.max_turns} · budget ≤ ${config.limits.max_budget_usd} · runtime ≤{" "}
          {config.limits.max_runtime_seconds}s
          {lastRun?.durationMs ? ` · last run ${(lastRun.durationMs / 1000).toFixed(1)}s` : ""}
        </div>
      </section>

      {/* Live action stream */}
      <LiveActionStream agentKey={agentKey} />

      {/* Pending approvals for this agent */}
      {approvals.length > 0 ? (
        <section className={CARD}>
          <div className="mb-3 text-sm font-semibold text-[var(--shell-ink)]">Pending approvals</div>
          <div className="grid gap-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{approval.proposedAction}</div>
                <pre className="mt-2 overflow-auto rounded-lg bg-white/60 p-2 text-xs text-[var(--shell-muted)]">
                  {JSON.stringify(approval.proposedArgs, null, 2)}
                </pre>
                <ApprovalActions id={approval.id} hmac={signApproval(approval.id, new Date(approval.createdAt).getTime())} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Send a message to this agent */}
      <section>
        <div className="mb-2 text-sm font-semibold text-[var(--shell-ink)]">Send a message to this agent</div>
        <CommandBar />
      </section>

      {/* Run history + replay */}
      <section className={CARD}>
        <div className="mb-3 text-sm font-semibold text-[var(--shell-ink)]">Run history</div>
        <div className="grid gap-2">
          {runs.length === 0 ? (
            <div className="text-sm text-[var(--shell-muted)]">No runs yet.</div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--shell-border)]/40 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} />
                  <span className="text-[var(--shell-muted)]">{run.trigger}</span>
                  <span className="text-[var(--shell-muted)]">{relativeTime(run.startedAt)}</span>
                  <span className="text-[var(--shell-ink)]">{run.finalSummary ?? run.errorMessage ?? ""}</span>
                </div>
                <AgentRunButton agentKey={agentKey} label="Replay" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Config (read-only) */}
      <section className={CARD}>
        <div className="mb-2 text-sm font-semibold text-[var(--shell-ink)]">Config (read-only)</div>
        <div className="grid gap-2 text-xs text-[var(--shell-muted)]">
          <div>schedule: {config.schedule.type} {config.schedule.expression ?? ""}</div>
          <div>model: {config.model?.default ?? "—"}</div>
          <div>tools: {config.tools.map((t) => t.server).join(", ") || "—"}</div>
          {config.approval_rules?.always_require_approval ? (
            <div>gated: {config.approval_rules.always_require_approval.join(", ")}</div>
          ) : null}
        </div>
      </section>

      {/* Recent audit snapshot */}
      <section className={CARD}>
        <div className="mb-2 text-sm font-semibold text-[var(--shell-ink)]">Audit (latest {audit.length})</div>
        <div className="font-mono text-xs leading-6">
          {audit.map((row) => (
            <div key={row.id} className="flex gap-3 border-b border-[var(--shell-border)]/40 py-1">
              <span className="text-[var(--shell-muted)]">{new Date(row.createdAt).toLocaleString()}</span>
              <span className="text-[var(--shell-ink)]">{row.hookPhase}</span>
              {row.outcome ? <span className="text-[var(--shell-muted)]">[{row.outcome}]</span> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--shell-muted)]">{label}</div>
      <div className="mt-1 font-semibold text-[var(--shell-ink)]">{value}</div>
    </div>
  );
}
