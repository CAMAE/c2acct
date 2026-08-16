import Link from "next/link";
import { getAgentsOverview, getRecentAudit } from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ agent?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const agentFilter = resolved?.agent;
  const [agents, audit] = await Promise.all([
    getAgentsOverview(),
    getRecentAudit(100, agentFilter),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">Audit log</h1>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/audit"
          className={`rounded-full border px-3 py-1 ${!agentFilter ? "border-[var(--shell-ink)] text-[var(--shell-ink)]" : "border-[var(--shell-border)] text-[var(--shell-muted)]"}`}
        >
          all
        </Link>
        {agents.map((agent) => (
          <Link
            key={agent.key}
            href={`/admin/audit?agent=${agent.key}`}
            className={`rounded-full border px-3 py-1 ${agentFilter === agent.key ? "border-[var(--shell-ink)] text-[var(--shell-ink)]" : "border-[var(--shell-border)] text-[var(--shell-muted)]"}`}
          >
            {agent.key}
          </Link>
        ))}
      </div>

      <section className={CARD}>
        <div className="font-mono text-xs leading-6">
          {audit.length === 0 ? (
            <div className="text-[var(--shell-muted)]">No audit entries{agentFilter ? ` for ${agentFilter}` : ""}.</div>
          ) : (
            audit.map((row) => (
              <div key={row.id} className="flex flex-wrap gap-3 border-b border-[var(--shell-border)]/40 py-1">
                <span className="text-[var(--shell-muted)]">{new Date(row.createdAt).toLocaleString()}</span>
                <span className="text-[var(--shell-ink)]">{row.agentKey ?? "-"}</span>
                <span className="text-[var(--shell-ink)]">{row.hookPhase}</span>
                {row.outcome ? <span className="text-[var(--shell-muted)]">[{row.outcome}]</span> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
