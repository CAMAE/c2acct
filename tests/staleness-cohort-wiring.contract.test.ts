import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ackFor,
  peersReassessedInCohort,
  vendorProductScoreChanges,
} from "@/lib/notifications/staleness/runStalenessSweep";

const note = (kind: string, read: boolean) => ({ kind, readAt: read ? new Date() : null });

const snap = (id: string, productId: string, score: number, iso: string) => ({
  id,
  productId,
  score,
  computedAt: new Date(iso),
});
const NAMES = new Map([
  ["a", "Meridian Portal"],
  ["b", "Meridian Tax"],
  ["solo", "Meridian Payroll"],
]);

/**
 * Block 17 Track C / C1 — cohort-movement gather wiring. planCohortMovement is
 * already unit-tested (copy + fire + ledger). This pins the NEW gather logic:
 * peers-reassessed is counts-only (cohort total minus self, floored), and the
 * sweep actually composes the cohort generator (guards a silent drop).
 */

describe("peersReassessedInCohort (counts-only, subtract self, floor 0)", () => {
  it("excludes the recipient's own company from the cohort count", () => {
    expect(peersReassessedInCohort(5, true)).toBe(4);
    expect(peersReassessedInCohort(5, false)).toBe(5);
  });

  it("floors at 0 and handles an empty cohort", () => {
    expect(peersReassessedInCohort(1, true)).toBe(0);
    expect(peersReassessedInCohort(0, false)).toBe(0);
    expect(peersReassessedInCohort(0, true)).toBe(0);
  });
});

describe("ackFor (C3 — digest-ack refinement)", () => {
  const STALE = "AUTO_FIRM_STALENESS_AGING";
  const DIGEST = "AUTO_FIRM_DIGEST_2026-W29";
  const PREFIXES = ["AUTO_FIRM_STALENESS_", "AUTO_FIRM_DIGEST_"];

  it("a read digest acknowledges a generator it collapsed (no standalone single)", () => {
    expect(ackFor([note(DIGEST, true)], PREFIXES)).toBe(true);
  });

  it("a more-recent UNREAD single is not acknowledged by an older read digest", () => {
    // notes are createdAt-desc: the unread single is newest.
    expect(ackFor([note(STALE, false), note(DIGEST, true)], PREFIXES)).toBe(false);
  });

  it("a read single (no digest) is acknowledged", () => {
    expect(ackFor([note(STALE, true)], PREFIXES)).toBe(true);
  });

  it("no relevant notes → not acknowledged", () => {
    expect(ackFor([note("AUTO_FIRM_SCORE_CHANGE", true)], PREFIXES)).toBe(false);
    expect(ackFor([], PREFIXES)).toBe(false);
  });
});

describe("vendorProductScoreChanges (C2 — per-product singles, Mythos ruling)", () => {
  it("one change PER PRODUCT with >=2 rounds, keyed by the newest snapshot id", () => {
    const changes = vendorProductScoreChanges(
      [
        snap("a2", "a", 80, "2026-07-01"),
        snap("a1", "a", 70, "2026-04-01"),
        snap("b2", "b", 60, "2026-07-01"),
        snap("b1", "b", 52, "2026-04-01"),
      ],
      NAMES
    );
    expect(changes).toHaveLength(2);
    const a = changes.find((c) => c.subjectId === "a")!;
    expect(a).toMatchObject({ subjectLabel: "Meridian Portal", latestSubmissionId: "a2", newScore: 80, priorScore: 70 });
    const b = changes.find((c) => c.subjectId === "b")!;
    expect(b).toMatchObject({ subjectLabel: "Meridian Tax", newScore: 60, priorScore: 52 });
  });

  it("a product with only ONE round is honest-empty (no fact — never fires)", () => {
    const changes = vendorProductScoreChanges([snap("s1", "solo", 40, "2026-07-01")], NAMES);
    expect(changes).toEqual([]);
  });

  it("empty snapshots → no changes", () => {
    expect(vendorProductScoreChanges([], NAMES)).toEqual([]);
  });
});

describe("cohort generator is wired into the sweep", () => {
  const src = readFileSync(path.resolve(__dirname, "..", "lib/notifications/staleness/runStalenessSweep.ts"), "utf8");

  it("composes planCohortMovement into the dispatched drafts", () => {
    expect(src).toMatch(/\.\.\.planCohortMovement\(cohortFacts, nowMs\)/);
  });

  it("resolves the cohort key from the company boundary (coarse demo/real pool)", () => {
    expect(src).toContain("firmCohortKeyForBoundary");
    expect(src).toContain("vendorCohortKeyForBoundary");
  });

  it("is counts-only — the cohort fact carries peersReassessed, never a peer identity list", () => {
    // The gather builds CohortMovementFact with peersReassessed (a number); it
    // must not thread any per-peer name/id collection into the fact.
    expect(src).toMatch(/peersReassessed: peersReassessedInCohort\(/);
    expect(src).not.toMatch(/peerNames|peerIds|peerCompanies|reassessedFirmNames/);
  });
});
