import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";

export type HookPhase =
  | "pre_tool_use"
  | "post_tool_use"
  | "can_use_tool"
  | "user_message"
  | "agent_message"
  | "approval_decision";

export type AuditOutcome =
  | "allowed"
  | "blocked"
  | "approved"
  | "denied"
  | "edited"
  | "error"
  | null;

export interface AuditEntry {
  runId?: string | null;
  agentKey?: string | null;
  hookPhase: HookPhase;
  payload: Record<string, unknown>;
  outcome?: AuditOutcome;
}

/**
 * Append one row to the immutable agent audit trail. Every hook event flows
 * through here — it is the substrate the /admin audit views and replay read
 * from. Writes are append-only; nothing updates or deletes audit rows.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  await prisma.agentAuditLogEntry.create({
    data: {
      runId: entry.runId ?? null,
      agentKey: entry.agentKey ?? null,
      hookPhase: entry.hookPhase,
      payload: toJsonValue(entry.payload),
      outcome: entry.outcome ?? null,
    },
  });
}
