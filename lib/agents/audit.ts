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
  /**
   * Request-correlation id, when the entry was written during an HTTP request.
   * Null for supervisor-driven agent runs, which have no request scope. Stored
   * inside the payload rather than as a column so this stays additive — it
   * needs no migration and no backfill of historical rows.
   */
  requestId?: string | null;
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
      // requestId rides inside the payload so an audit row can be joined to the
      // structured error lines from the same request.
      payload: toJsonValue(
        entry.requestId ? { ...entry.payload, requestId: entry.requestId } : entry.payload
      ),
      outcome: entry.outcome ?? null,
    },
  });
}
