import Link from "next/link";
import { getRunHistory } from "@/lib/agents/adminConsole";
import { StatusBadge, relativeTime } from "@/app/components/agents/AgentVisuals";
import AgentRunButton from "@/app/components/agents/AgentRunButton";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminRunsPage() {
  const runs = await getRunHistory(50);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">Run history</h1>
      <section className={CARD}>
        {runs.length === 0 ? (
          <div className="text-sm text-[var(--shell-muted)]">No runs recorded yet.</div>
        ) : (
          <div className="grid gap-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--shell-border)]/40 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={run.status} />
                  <Link className="font-semibold text-[var(--shell-ink)] underline" href={`/admin/agents/${run.agentKey}`}>
                    {run.agentKey}
                  </Link>
                  <span className="text-[var(--shell-muted)]">
                    {run.trigger}
                    {run.triggerSource ? ` · ${run.triggerSource}` : ""}
                  </span>
                  <span className="text-[var(--shell-muted)]">{relativeTime(run.startedAt)}</span>
                  <span className="text-[var(--shell-ink)]">{run.finalSummary ?? run.errorMessage ?? ""}</span>
                </div>
                <AgentRunButton agentKey={run.agentKey} label="Replay" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
