import { getAgentState, setAgentState } from "@/lib/agents/state";
import { ledgerKey, type StalenessLedgerEntry } from "@/lib/notifications/staleness/ledger";

/**
 * 16b — persistence for the send-ledger, on the existing AgentState K/V (no new
 * table this slice). One entry per (recipient, item), so the idempotency + nag
 * hard-stop survive across scheduled runs. The key builder itself is pure and
 * lives in ledger.ts; this module is only the I/O.
 */
export const STALENESS_AGENT_KEY = "staleness-sweep";

export { ledgerKey };

export function readLedgerEntry(key: string): Promise<StalenessLedgerEntry | null> {
  return getAgentState<StalenessLedgerEntry>(STALENESS_AGENT_KEY, key);
}

export function writeLedgerEntry(key: string, entry: StalenessLedgerEntry): Promise<void> {
  return setAgentState(STALENESS_AGENT_KEY, key, entry);
}
