import { getPendingApprovals } from "@/lib/agents/adminConsole";
import { signApproval } from "@/ops/telegram-bot/hmac";
import { relativeTime } from "@/app/components/agents/AgentVisuals";
import ApprovalActions from "@/app/components/agents/ApprovalActions";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-[var(--shell-border)] bg-white/50 p-4";

export default async function AdminApprovalsPage() {
  const approvals = await getPendingApprovals();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
        Approval queue ({approvals.length})
      </h1>
      {approvals.length === 0 ? (
        <div className={`${CARD} text-sm text-[var(--shell-muted)]`}>No approvals pending across any agent.</div>
      ) : (
        <div className="grid gap-3">
          {approvals.map((approval) => (
            <div key={approval.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-[var(--shell-ink)]">
                  {approval.agentKey} — {approval.proposedAction}
                </div>
                <div className="text-xs uppercase tracking-[0.14em] text-[var(--shell-muted)]">
                  {approval.blastRadius ?? "?"} · {relativeTime(approval.createdAt)} · ref {approval.id}
                </div>
              </div>
              {approval.rationale ? (
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{approval.rationale}</div>
              ) : null}
              <pre className="mt-2 overflow-auto rounded-lg bg-white/60 p-2 text-xs text-[var(--shell-muted)]">
                {JSON.stringify(approval.proposedArgs, null, 2)}
              </pre>
              <ApprovalActions id={approval.id} hmac={signApproval(approval.id, new Date(approval.createdAt).getTime())} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
