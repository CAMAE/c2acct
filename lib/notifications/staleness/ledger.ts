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

/**
 * State-independent ledger item key: one entry per (namespace, source, recipient).
 * Pure (no I/O) so the planners can compute it without pulling the store. The
 * namespace segments the generators (e.g. "staleness:firm", "review:vendor",
 * "cohort:firm") so their ledgers never collide.
 */
export function ledgerKey(namespace: string, sourceId: string, recipientUserId: string): string {
  return `ledger:${namespace}:${sourceId}:${recipientUserId}`;
}

export type StalenessLedgerEntry = {
  /**
   * The "signature" of what we last notified this recipient about, for this
   * item. For the freshness generator it is the state ("aging"/"stale"); for the
   * others it is a generator-specific change signature (a batch id, a quarter +
   * count, a submission id). A send fires only when the signature changes.
   */
  lastSignature: string | null;
  /** ISO timestamp of the last nudge we sent for this item. */
  lastSentIso: string | null;
  /** Consecutive unacknowledged nudges for this item (reset on acknowledgement). */
  unackedCount: number;
};

export const EMPTY_LEDGER_ENTRY: StalenessLedgerEntry = {
  lastSignature: null,
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
  if (entry.lastSignature === input.currentState) {
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
      lastSignature: input.currentState,
      lastSentIso: input.nowIso,
      unackedCount: effectiveUnacked + 1,
    },
  };
}

/**
 * Generic signature-based send decision, for generators whose trigger is not a
 * freshness state (review-expiry batch, cohort movement, score change). A send
 * fires only when the signature CHANGES from what we last notified — so a re-run
 * over identical data is silent — and the same nag hard-stop applies. A null
 * signature means "nothing to say" and clears the ledger.
 */
export type SignatureDecision =
  | { send: false; reason: "none" | "unchanged" | "hard_stop"; nextEntry: StalenessLedgerEntry }
  | { send: true; reason: "changed"; nextEntry: StalenessLedgerEntry };

export function decideSignatureSend(input: {
  signature: string | null;
  entry: StalenessLedgerEntry | null;
  acknowledgedSinceLast: boolean;
  nowIso: string;
}): SignatureDecision {
  const entry = input.entry ?? EMPTY_LEDGER_ENTRY;

  if (input.signature == null) {
    return { send: false, reason: "none", nextEntry: { ...EMPTY_LEDGER_ENTRY } };
  }

  const effectiveUnacked = input.acknowledgedSinceLast ? 0 : entry.unackedCount;

  if (entry.lastSignature === input.signature) {
    return { send: false, reason: "unchanged", nextEntry: { ...entry, unackedCount: effectiveUnacked } };
  }

  if (effectiveUnacked >= MAX_UNACKED_NUDGES) {
    return { send: false, reason: "hard_stop", nextEntry: { ...entry, unackedCount: effectiveUnacked } };
  }

  return {
    send: true,
    reason: "changed",
    nextEntry: {
      lastSignature: input.signature,
      lastSentIso: input.nowIso,
      unackedCount: effectiveUnacked + 1,
    },
  };
}
