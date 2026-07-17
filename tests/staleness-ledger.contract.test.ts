import { describe, expect, it } from "vitest";
import {
  decideStalenessSend,
  EMPTY_LEDGER_ENTRY,
  MAX_UNACKED_NUDGES,
  type StalenessLedgerEntry,
} from "@/lib/notifications/staleness/ledger";

/**
 * 16b — the send-ledger governance guards (Mythos rider). Idempotency (no
 * double-notify on re-run), change-triggered singles (only on a state crossing),
 * and the hard-stop after 2 unacknowledged nudges — all enforced here, at
 * generation time.
 */
const NOW = "2026-07-17T12:00:00.000Z";

describe("staleness send-ledger", () => {
  it("fresh evidence never alerts and clears the ledger", () => {
    const d = decideStalenessSend({
      currentState: "fresh",
      entry: { lastSignature: "aging", lastSentIso: NOW, unackedCount: 1 },
      acknowledgedSinceLast: false,
      nowIso: NOW,
    });
    expect(d.send).toBe(false);
    expect(d.reason).toBe("fresh");
    expect(d.nextEntry).toEqual(EMPTY_LEDGER_ENTRY);
  });

  it("fires exactly once on a fresh→aging crossing", () => {
    const d = decideStalenessSend({
      currentState: "aging",
      entry: null,
      acknowledgedSinceLast: false,
      nowIso: NOW,
    });
    expect(d.send).toBe(true);
    if (d.send) {
      expect(d.state).toBe("aging");
      expect(d.nextEntry.unackedCount).toBe(1);
      expect(d.nextEntry.lastSignature).toBe("aging");
    }
  });

  it("is idempotent: a re-run at the same state does not re-notify", () => {
    const entry: StalenessLedgerEntry = { lastSignature: "aging", lastSentIso: NOW, unackedCount: 1 };
    const d = decideStalenessSend({ currentState: "aging", entry, acknowledgedSinceLast: false, nowIso: NOW });
    expect(d.send).toBe(false);
    expect(d.reason).toBe("unchanged");
  });

  it("speaks again on a genuine aging→stale crossing", () => {
    const entry: StalenessLedgerEntry = { lastSignature: "aging", lastSentIso: NOW, unackedCount: 1 };
    const d = decideStalenessSend({ currentState: "stale", entry, acknowledgedSinceLast: false, nowIso: NOW });
    expect(d.send).toBe(true);
    if (d.send) expect(d.nextEntry.unackedCount).toBe(2);
  });

  it("hard-stops after MAX_UNACKED_NUDGES unacknowledged nudges on the same item", () => {
    // unacked already at the ceiling, a new crossing still must NOT fire.
    const entry: StalenessLedgerEntry = { lastSignature: "aging", lastSentIso: NOW, unackedCount: MAX_UNACKED_NUDGES };
    const d = decideStalenessSend({ currentState: "stale", entry, acknowledgedSinceLast: false, nowIso: NOW });
    expect(d.send).toBe(false);
    expect(d.reason).toBe("hard_stop");
  });

  it("an acknowledgement resets the nag counter so a new crossing can speak once", () => {
    const entry: StalenessLedgerEntry = { lastSignature: "aging", lastSentIso: NOW, unackedCount: MAX_UNACKED_NUDGES };
    const d = decideStalenessSend({ currentState: "stale", entry, acknowledgedSinceLast: true, nowIso: NOW });
    expect(d.send).toBe(true);
    if (d.send) expect(d.nextEntry.unackedCount).toBe(1);
  });
});
