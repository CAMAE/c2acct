# Agent Approval Architecture

## Phase 1 (current): blocking approval

When an agent hits an approval-gated tool, `lib/agents/approvals.ts:requestApproval()`
inserts an `AgentApproval` row, marks the `AgentRun` `awaiting_approval`, sends the
Telegram card, then **blocks the agent process**, polling the row until the operator
decides (recorded by the Telegram bot via the shared DB) or it times out.

### Known tension: blocking wait vs `max_runtime_seconds`

The blocking wait counts against the agent's `max_runtime_seconds` cap. If the
operator doesn't decide within that window, `sdk.runAgent`'s `withTimeout` fires and
the run ends `timeout` — the human latency, not the agent, "fails" the run. Pilot
Ops mitigates this with a generous cap (`max_runtime_seconds: 1800`, 30 min) since it
runs once daily and never competes for a slot. This is a stopgap, not the fix.

Stale cards (from a timed-out run) remain in Telegram but their `AgentApproval` rows
are set to `cancelled`/`expired`; tapping one is rejected by the **status guard**
(`status != pending`), not by HMAC — the HMAC stays valid because it signs
`id:createdAt`, independent of run liveness. No decision is recorded either way.

## Real fix (TODO — DO NOT implement yet): async resume

Decouple human response latency from agent process runtime:

1. Agent hits an approval gate → `requestApproval()` writes the `AgentApproval` row,
   marks `AgentRun.status = 'awaiting_approval'`, and returns a **sentinel** telling
   the agent loop to terminate cleanly (no blocking wait).
2. The Telegram decision handler (`ops/telegram-bot/approvals.ts:recordApprovalDecision`),
   when recording a decision whose `runId` references a run still in
   `awaiting_approval`: mark that run done and **enqueue a new run** on the same agent
   with `trigger = 'approval-resume'`, carrying the decision context (approvalId,
   outcome, editedArgs) in metadata.
3. The resume run reads the decision from its trigger context and continues from where
   the original left off.

### Why this is the right shape

- An agent process never sits blocked for minutes/hours waiting on a human.
- `max_runtime_seconds` governs actual work, not idle waiting.
- Survives process/host restarts: the pending approval + run state live in Neon.

### The schema already supports it (designed in Phase 0)

- `AgentRunStatus.awaiting_approval` enum value
- `AgentRun.trigger` accepts `"approval-resume"`
- `AgentApproval.runId` FK ties a decision back to its run

### Phase target

Implement when introducing the **second** approval-requiring agent, OR before any
multi-tenant deployment — whichever comes first. (Pilot Ops is the first; the blocking
model + 1800s cap is acceptable for a single daily agent.)
