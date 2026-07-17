import { getAgentState, setAgentState } from "@/lib/agents/state";
import type { StalenessLedgerEntry } from "@/lib/notifications/staleness/ledger";

/**
 * 16b — persistence for the send-ledger, on the existing AgentState K/V (no new
 * table this slice). One entry per (recipient, item), so the idempotency + nag
 * hard-stop survive across scheduled runs.
 */
export const STALENESS_AGENT_KEY = "staleness-sweep";

export function ledgerKey(kind: string, sourceId: string, recipientUserId: string): string {
  return `ledger:${kind}:${sourceId}:${recipientUserId}`;
}

export function readLedgerEntry(key: string): Promise<StalenessLedgerEntry | null> {
  return getAgentState<StalenessLedgerEntry>(STALENESS_AGENT_KEY, key);
}

export function writeLedgerEntry(key: string, entry: StalenessLedgerEntry): Promise<void> {
  return setAgentState(STALENESS_AGENT_KEY, key, entry);
}
