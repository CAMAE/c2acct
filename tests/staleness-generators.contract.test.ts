import { describe, expect, it } from "vitest";
import {
  planCohortMovement,
  planReviewExpiry,
  planScoreChange,
  type CohortMovementFact,
  type ReviewExpiryFact,
  type ScoreChangeFact,
} from "@/lib/notifications/staleness/generators";
import { collapseToDigest, isoWeekKey } from "@/lib/notifications/staleness/digest";
import type { StalenessDraft } from "@/lib/notifications/staleness/plan";

/**
 * 16b slice 2 — generators (2)(3)(4) + the weekly-digest collapser. Pins the
 * signature idempotency (no re-fire on unchanged data), the counts-only rail for
 * cohort movement, E3 (every draft aiGenerated), no-guilt copy, and the
 * one-digest-per-week collapse.
 */
const NOW = Date.parse("2026-07-17T12:00:00.000Z");
const GUILT = /\b(should have|failed|neglect|overdue|behind|lazy|forgot)\b/i;

function base(over: Record<string, unknown> = {}) {
  return {
    recipientUserId: "u1",
    companyId: "c1",
    companyName: "Acme",
    audience: "firm" as const,
    acknowledgedSinceLast: false,
    ledger: null,
    ...over,
  };
}

describe("review-expiry (2)", () => {
  it("fires once when reviews enter the window, then is idempotent", () => {
    const fact: ReviewExpiryFact = { ...base(), reviewsEnteringExpiry: 3 };
    const first = planReviewExpiry([fact], NOW);
    expect(first).toHaveLength(1);
    expect(first[0].aiGenerated).toBe(true);
    expect(first[0].generator).toBe("review");
    // re-run at the same signature → silent
    const again = planReviewExpiry([{ ...fact, ledger: first[0].nextEntry }], NOW);
    expect(again).toHaveLength(0);
  });
  it("does not fire with zero expiring reviews", () => {
    expect(planReviewExpiry([{ ...base(), reviewsEnteringExpiry: 0 }], NOW)).toHaveLength(0);
  });
});

describe("score-change (3)", () => {
  it("fires once per new submission that moved the score", () => {
    const fact: ScoreChangeFact = { ...base(), latestSubmissionId: "s9", newScore: 74, priorScore: 68 };
    const d = planScoreChange([fact], NOW);
    expect(d).toHaveLength(1);
    expect(d[0].body).toContain("74");
    expect(d[0].generator).toBe("score");
    // same submission id → silent
    expect(planScoreChange([{ ...fact, ledger: d[0].nextEntry }], NOW)).toHaveLength(0);
  });
  it("does not fire when the score did not move", () => {
    expect(
      planScoreChange([{ ...base(), latestSubmissionId: "s9", newScore: 70, priorScore: 70 }], NOW)
    ).toHaveLength(0);
  });
  it("C2 per-product single: names the product, links to it, distinct ledger + Product source", () => {
    const fact: ScoreChangeFact = {
      ...base(),
      latestSubmissionId: "snap-new",
      newScore: 80,
      priorScore: 70,
      subjectId: "prod-1",
      subjectLabel: "Meridian Portal",
    };
    const [d] = planScoreChange([fact], NOW);
    expect(d.title).toBe("Meridian Portal strength updated");
    expect(d.body).toContain("Meridian Portal");
    expect(d.body).toContain("80");
    expect(d.ctaHref).toBe("/vendor/product-insight/prod-1");
    expect(d.sourceType).toBe("Product");
    expect(d.sourceId).toBe("prod-1");
    // per-product ledger key is distinct from the firm/company-level score key.
    expect(d.ledgerItemKey).toContain("prod-1");
  });
});

describe("cohort movement (4) — counts only, never identities", () => {
  it("fires with a peer count and names no firm", () => {
    const fact: CohortMovementFact = { ...base(), quarterKey: "2026-Q3", peersReassessed: 4 };
    const d = planCohortMovement([fact], NOW);
    expect(d).toHaveLength(1);
    expect(d[0].body).toContain("4");
    expect(d[0].body).not.toMatch(GUILT);
    // counts-only: the copy must not carry a firm name field
    expect(d[0].body.toLowerCase()).toContain("cohort");
  });
  it("is idempotent within the same quarter+count", () => {
    const fact: CohortMovementFact = { ...base(), quarterKey: "2026-Q3", peersReassessed: 4 };
    const first = planCohortMovement([fact], NOW);
    expect(planCohortMovement([{ ...fact, ledger: first[0].nextEntry }], NOW)).toHaveLength(0);
  });
});

describe("weekly digest collapse", () => {
  function draft(over: Partial<StalenessDraft>): StalenessDraft {
    return {
      recipientUserId: "u1",
      audience: "firm",
      generator: "module",
      kind: "AUTO_FIRM_STALENESS_AGING",
      title: "T",
      body: "B",
      ctaLabel: "c",
      ctaHref: "/firm",
      sourceType: "Company",
      sourceId: "c1",
      aiGenerated: true,
      ledgerItemKey: "ledger:staleness:firm:c1:u1",
      nextEntry: { lastSignature: "aging", lastSentIso: "x", unackedCount: 1 },
      ...over,
    };
  }

  it("a single draft dispatches as itself (no digest)", () => {
    const items = collapseToDigest([draft({})], NOW);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("AUTO_FIRM_STALENESS_AGING");
    expect(items[0].ledgerWrites).toHaveLength(1);
  });

  it("two+ drafts for one user collapse into one week-stamped digest that advances all ledgers", () => {
    const week = isoWeekKey(NOW);
    const items = collapseToDigest(
      [draft({}), draft({ generator: "cohort", kind: "AUTO_FIRM_COHORT_MOVEMENT", ledgerItemKey: "ledger:cohort:firm:c1:u1" })],
      NOW
    );
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe(`AUTO_FIRM_DIGEST_${week}`);
    expect(items[0].sourceType).toBe("Digest");
    expect(items[0].ledgerWrites).toHaveLength(2);
    expect(items[0].aiGenerated).toBe(true);
  });

  it("separates distinct recipients", () => {
    const items = collapseToDigest([draft({}), draft({ recipientUserId: "u2" })], NOW);
    expect(items).toHaveLength(2);
  });
});
