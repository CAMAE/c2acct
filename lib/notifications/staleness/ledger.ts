import type { FreshnessState } from "@/lib/freshness";

/**
 * 16b send-ledger (Mythos rider). The idempotency + batching brain, kept PURE so
 * it is exhaustively unit-tested and never touches the DB itself. The generation
 * loop persists one LedgerEntry per (recipient, item) via AgentState and asks
 * this function whether to emit — so a re-run over identical data never
 * double-notifies, and the same-item nag hard-stop is enforced at GENERATION
 * time, not at display time.
 *
 * Rules (change-triggered singles):
 *  - Only Aging/Stale states alert; Fresh never does (and clears the ledger).
 *  - Idempotent: a state we already notified for does not fire again — an alert
 *    fires only on a state CROSSING (fresh→aging, aging→stale).
 *  - Hard-stop: after MAX_UNACKED_NUDGES unacknowledged nudges on the same item,
 *    stop. An acknowledgement (the recipient read the prior nudge) resets the
 *    unacked counter so a genuinely new crossing can still speak once.
 */
export const MAX_UNACKED_NUDGES = 2;

export type StalenessLedgerEntry = {
  /** The freshness state we last notified this recipient about, for this item. */
  lastState: FreshnessState | null;
  /** ISO timestamp of the last nudge we sent for this item. */
  lastSentIso: string | null;
  /** Consecutive unacknowledged nudges for this item (reset on acknowledgement). */
  unackedCount: number;
};

export const EMPTY_LEDGER_ENTRY: StalenessLedgerEntry = {
  lastState: null,
  lastSentIso: null,
  unackedCount: 0,
};

export type StaleNudgeState = Exclude<FreshnessState, "fresh">;

export type StalenessDecision =
  | { send: false; reason: "fresh" | "unchanged" | "hard_stop"; nextEntry: StalenessLedgerEntry }
  | { send: true; reason: "crossing"; state: StaleNudgeState; nextEntry: StalenessLedgerEntry };

export function decideStalenessSend(input: {
  currentState: FreshnessState;
  entry: StalenessLedgerEntry | null;
  /** Did the recipient acknowledge (read) the prior nudge for this item? */
  acknowledgedSinceLast: boolean;
  nowIso: string;
}): StalenessDecision {
  const entry = input.entry ?? EMPTY_LEDGER_ENTRY;

  // Fresh evidence clears the ledger — a firm that re-assessed starts clean, so a
  // later slide back into Aging speaks again (and never counts old nags).
  if (input.currentState === "fresh") {
    return { send: false, reason: "fresh", nextEntry: { ...EMPTY_LEDGER_ENTRY } };
  }

  // An acknowledgement resets the nag counter (the recipient saw us; a genuinely
  // new crossing earns one fresh nudge).
  const effectiveUnacked = input.acknowledgedSinceLast ? 0 : entry.unackedCount;

  // Idempotent: we already spoke for this exact state — a re-run must be silent.
  if (entry.lastState === input.currentState) {
    return {
      send: false,
      reason: "unchanged",
      nextEntry: { ...entry, unackedCount: effectiveUnacked },
    };
  }

  // Hard-stop: do not nag past the ceiling on the same item.
  if (effectiveUnacked >= MAX_UNACKED_NUDGES) {
    return {
      send: false,
      reason: "hard_stop",
      nextEntry: { ...entry, unackedCount: effectiveUnacked },
    };
  }

  // A real crossing (fresh→aging, aging→stale) — emit exactly one nudge.
  return {
    send: true,
    reason: "crossing",
    state: input.currentState,
    nextEntry: {
      lastState: input.currentState,
      lastSentIso: input.nowIso,
      unackedCount: effectiveUnacked + 1,
    },
  };
}
