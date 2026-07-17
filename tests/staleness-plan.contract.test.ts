import { describe, expect, it } from "vitest";
import {
  planStaleness,
  stalenessKind,
  STALENESS_KINDS,
  type StalenessTarget,
} from "@/lib/notifications/staleness/plan";

/**
 * 16b — the staleness planner contract. E3 (AI disclosure) goes ACTIVE here:
 * every generated draft is aiGenerated, so the inbox renders the Pat disclosure.
 * Also pins the governance copy rails (no guilt, states the benchmark
 * consequence) and the ledger-driven idempotency at the planner boundary.
 */
const NOW = Date.parse("2026-07-17T12:00:00.000Z");
const AGING_SUBMISSION = Date.parse("2026-01-01T12:00:00.000Z"); // ~197d → aging
const STALE_SUBMISSION = Date.parse("2024-01-01T12:00:00.000Z"); // >365d → stale
const FRESH_SUBMISSION = Date.parse("2026-07-01T12:00:00.000Z"); // ~16d → fresh

function target(over: Partial<StalenessTarget>): StalenessTarget {
  return {
    recipientUserId: "u1",
    companyId: "c1",
    companyName: "Acme Firm",
    audience: "firm",
    newestSubmissionMs: AGING_SUBMISSION,
    acknowledgedSinceLast: false,
    ledger: null,
    ...over,
  };
}

const GUILT_WORDS = /\b(should have|failed|neglect|overdue|behind|lazy|forgot|why haven't)\b/i;

describe("staleness planner (16b)", () => {
  it("fires one aging nudge on a fresh→aging crossing", () => {
    const plan = planStaleness([target({})], NOW);
    expect(plan.fired).toBe(1);
    const draft = plan.drafts[0];
    expect(draft.kind).toBe(stalenessKind("firm", "aging"));
    expect(STALENESS_KINDS).toContain(draft.kind);
  });

  it("E3: every generated draft is aiGenerated (drives the inbox disclosure)", () => {
    const plan = planStaleness(
      [target({}), target({ recipientUserId: "u2", newestSubmissionMs: STALE_SUBMISSION })],
      NOW
    );
    expect(plan.drafts.length).toBeGreaterThan(0);
    for (const d of plan.drafts) expect(d.aiGenerated).toBe(true);
  });

  it("never-assessed is skipped — absence is not staleness", () => {
    const plan = planStaleness([target({ newestSubmissionMs: null })], NOW);
    expect(plan.fired).toBe(0);
    expect(plan.suppressed).toBe(1);
  });

  it("fresh evidence never fires", () => {
    const plan = planStaleness([target({ newestSubmissionMs: FRESH_SUBMISSION })], NOW);
    expect(plan.fired).toBe(0);
  });

  it("is idempotent: a target already at its notified state does not re-fire", () => {
    const plan = planStaleness(
      [target({ ledger: { lastState: "aging", lastSentIso: "x", unackedCount: 1 } })],
      NOW
    );
    expect(plan.fired).toBe(0);
    expect(plan.suppressed).toBe(1);
  });

  it("stale crossing uses the stale kind", () => {
    const plan = planStaleness([target({ newestSubmissionMs: STALE_SUBMISSION })], NOW);
    expect(plan.drafts[0].kind).toBe(stalenessKind("firm", "stale"));
  });

  it("copy carries no guilt and states the benchmark consequence", () => {
    const plan = planStaleness(
      [target({}), target({ recipientUserId: "u2", newestSubmissionMs: STALE_SUBMISSION })],
      NOW
    );
    for (const d of plan.drafts) {
      expect(d.body, `"${d.body}"`).not.toMatch(GUILT_WORDS);
      expect(d.title).not.toMatch(GUILT_WORDS);
      // states a consequence the reader can weigh
      expect(d.body.toLowerCase()).toMatch(/benchmark|standing|comparable|current/);
    }
  });
});
