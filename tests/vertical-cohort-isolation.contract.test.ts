import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DataBoundary } from "@prisma/client";
import {
  BenchmarkCohortIsolationError,
  assertSingleVerticalCohort,
  assertVerticalPackInstalled,
  benchmarkCohortKey,
  evaluateBenchmarkSuppressionForVertical,
  partitionByVertical,
  type CohortContributor,
} from "@/lib/benchmarkCohortIsolation";
import {
  MAX_CONTRIBUTOR_SHARE,
  MIN_CONTRIBUTORS,
  evaluateBenchmarkSuppression,
} from "@/lib/benchmarkSuppression";
import { firmCohortKeyForBoundary, vendorCohortKeyForBoundary } from "@/lib/benchmarks";
import {
  DEFAULT_VERTICAL_ID,
  FROZEN_VERTICAL_IDS,
  SYNTHETIC_VERTICAL_IDS,
  isSyntheticVerticalId,
} from "@/lib/verticals/context";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";
import { loadVerticalPack } from "@/lib/verticals/loader";
import { listVerticalIds } from "@/lib/verticals/registry";
import { resolveVerticalForSession } from "@/lib/verticals/session";

/**
 * W6 contract — benchmark cohort isolation
 * (VERTICAL-READINESS-AUDIT-2026-08 §5.1).
 *
 * §5.1 is the only risk in this framework that can corrupt PUBLISHED numbers,
 * and the reason it needs a contract test rather than care is that NOTHING
 * FAILS when it goes wrong: suppression's 5-contributor floor and 25% dominance
 * cap both pass for a cross-vertical pool, because five firms are five firms.
 * The benchmark silently changes meaning and every downstream check stays green.
 *
 * Proving that with one vertical installed is impossible — "accounting never
 * mixes with another vertical" is vacuously true when accounting is the only
 * vertical there is. So this suite runs against a real second pack,
 * verticals/test-fixture/, which is deliberately synthetic and walled off from
 * production.
 */

const ROOT = process.cwd();
const FIXTURE = "test-fixture";

const contributor = (companyId: string, verticalId: string, weight?: number): CohortContributor => ({
  companyId,
  verticalId,
  ...(weight === undefined ? {} : { weight }),
});

// ---------------------------------------------------------------------------
// The fixture itself — synthetic, loadable, and unable to reach production.
// ---------------------------------------------------------------------------

describe("the second-vertical fixture is real, synthetic, and walled off", () => {
  it("loads as a genuine pack, so the isolation proofs are not vacuous", async () => {
    const pack = await loadVerticalPack(FIXTURE);
    expect(pack.id).toBe(FIXTURE);
    expect(await listVerticalIds()).toEqual(expect.arrayContaining([DEFAULT_VERTICAL_ID, FIXTURE]));
  });

  it("announces itself as synthetic in its own manifest", () => {
    const manifest = readFileSync(path.join(ROOT, "verticals", FIXTURE, "pack.yaml"), "utf8");
    expect(manifest).toMatch(/DO NOT SHIP/);
    expect(manifest).toMatch(/SYNTHETIC/);
  });

  it("is registered synthetic and is NOT frozen", () => {
    // Frozen ids are ids that stored rows reference. Nothing stored may ever
    // reference the fixture, so it must not be frozen — and it must be listed
    // synthetic so the request-boundary guard can refuse it.
    expect(isSyntheticVerticalId(FIXTURE)).toBe(true);
    expect(SYNTHETIC_VERTICAL_IDS).toContain(FIXTURE);
    expect(FROZEN_VERTICAL_IDS).not.toContain(FIXTURE);
  });

  it("can never resolve for a real request, even from a stored tenant column", async () => {
    // A mis-seeded Company.verticalId is the realistic way a fixture leaks into
    // production. It fails loudly here rather than rendering fixture nouns and
    // filing that tenant's rows under a fixture vertical.
    await expect(
      resolveVerticalForSession({
        env: { [VERTICAL_PACKS_FLAG_ENV]: "1" },
        readSessionCompanyId: async () => "company-1",
        readCompanyVerticalId: async () => FIXTURE,
      })
    ).rejects.toThrow(/synthetic test fixture/i);
  });

  it("cannot be reached through the env override or an explicit argument either", async () => {
    await expect(
      resolveVerticalForSession({
        env: { [VERTICAL_PACKS_FLAG_ENV]: "1", PAT_DEFAULT_VERTICAL: FIXTURE },
        readSessionCompanyId: async () => null,
      })
    ).rejects.toThrow(/synthetic test fixture/i);

    await expect(
      resolveVerticalForSession({ env: { [VERTICAL_PACKS_FLAG_ENV]: "1" }, verticalId: FIXTURE })
    ).rejects.toThrow(/synthetic test fixture/i);
  });

  it("is named by no shipping source file", () => {
    // The fixture may appear in tests, in its own pack, and in the framework's
    // synthetic-id list and docs. Anywhere else is a leak — including a passing
    // mention in a comment, because a comment is where the next person copies
    // the literal from instead of asking isSyntheticVerticalId().
    //
    // NOTE: this assertion is only meaningful once the files are TRACKED. It
    // passed vacuously while the PF-2 files were still untracked and caught a
    // real leak (lib/verticals/session.ts) on the first post-commit run.
    const tracked = execFileSync("git", ["ls-files", "app", "lib", "scripts", "prisma", "evals"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter((file) => file.length > 0);

    // Guard against a vacuous pass: an empty file list would satisfy the
    // assertion below while checking nothing.
    expect(tracked.length).toBeGreaterThan(100);

    const allowed = new Set(["lib/verticals/context.ts"]);
    const offenders = tracked.filter((file) => {
      if (allowed.has(file)) return false;
      return readFileSync(path.join(ROOT, file), "utf8").includes(FIXTURE);
    });
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Required assertion: an unknown / packless vertical FAILS LOUDLY.
// ---------------------------------------------------------------------------

describe("constructing a cohort under an unknown or packless vertical fails loudly", () => {
  it("throws for a vertical with no installed pack", async () => {
    // Silent acceptance IS the bug. Accepting it would create benchmark rows
    // under a vertical nothing can resolve, render, or suppress — rows that look
    // valid and mean nothing.
    await expect(assertVerticalPackInstalled("no-such-vertical")).rejects.toThrow(
      BenchmarkCohortIsolationError
    );
    await expect(assertVerticalPackInstalled("no-such-vertical")).rejects.toThrow(
      /No Vertical Pack is installed/i
    );
  });

  it("names the installed packs in the error, so the bad id is obvious", async () => {
    await expect(assertVerticalPackInstalled("typo-accounting")).rejects.toThrow(
      new RegExp(DEFAULT_VERTICAL_ID)
    );
  });

  it("throws for a blank or whitespace-only vertical rather than defaulting", async () => {
    // A missing vertical is not "accounting". Defaulting here would file a row
    // whose vertical nobody knows into the accounting cohort.
    for (const blank of ["", "   "]) {
      await expect(assertVerticalPackInstalled(blank)).rejects.toThrow(/blank verticalId/i);
      expect(() => assertSingleVerticalCohort(blank, [])).toThrow(/blank verticalId/i);
      expect(() =>
        assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, [contributor("c1", blank)])
      ).toThrow(/blank verticalId/i);
    }
  });

  it("accepts both installed packs", async () => {
    await expect(assertVerticalPackInstalled(DEFAULT_VERTICAL_ID)).resolves.toBe(DEFAULT_VERTICAL_ID);
    await expect(assertVerticalPackInstalled(FIXTURE)).resolves.toBe(FIXTURE);
  });
});

// ---------------------------------------------------------------------------
// Proof 1 — a second-vertical firm can never enter an accounting cohort.
// ---------------------------------------------------------------------------

describe("proof 1 — a second-vertical firm can never enter an accounting cohort", () => {
  const accountingFive = Array.from({ length: 5 }, (_, i) => contributor(`acct-${i}`, DEFAULT_VERTICAL_ID));

  it("THROWS on a mixed contributor set — it does not filter it", () => {
    // The distinction is the whole design. A filter would drop the fixture firm,
    // publish a plausible number, and leave the caller that mixed them intact.
    const mixed = [...accountingFive, contributor("fixture-1", FIXTURE)];
    expect(() => assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, mixed)).toThrow(
      BenchmarkCohortIsolationError
    );

    let thrown: BenchmarkCohortIsolationError | null = null;
    try {
      assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, mixed);
    } catch (error) {
      thrown = error as BenchmarkCohortIsolationError;
    }
    expect(thrown?.code).toBe("mixed_verticals");
    // The error must name the offender: an isolation failure you cannot trace
    // back to a row is barely better than a silent one.
    expect(thrown?.message).toContain("fixture-1");
    expect(thrown?.message).toContain(FIXTURE);
  });

  it("returns the set unchanged when it is single-vertical", () => {
    expect(assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, accountingFive)).toEqual(accountingFive);
    expect(assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, [])).toEqual([]);
  });

  it("throws in BOTH directions — accounting cannot enter a fixture cohort either", () => {
    // Isolation is symmetric. A one-way guard would let the second vertical's
    // cohorts silently inherit accounting's firms.
    expect(() =>
      assertSingleVerticalCohort(FIXTURE, [contributor("acct-1", DEFAULT_VERTICAL_ID)])
    ).toThrow(BenchmarkCohortIsolationError);
  });

  it("throws even when every contributor is foreign", () => {
    let thrown: BenchmarkCohortIsolationError | null = null;
    try {
      assertSingleVerticalCohort(DEFAULT_VERTICAL_ID, [contributor("fixture-1", FIXTURE)]);
    } catch (error) {
      thrown = error as BenchmarkCohortIsolationError;
    }
    expect(thrown?.code).toBe("foreign_vertical");
  });

  it("keeps the two verticals on different cohort ROWS, not one filtered row", () => {
    // Separate keys mean separate BenchmarkCohort rows. A shared row filtered at
    // read time is the failure mode §5.1 describes: the pool is mixed in
    // storage, and one forgotten filter republishes it.
    for (const boundary of [DataBoundary.PRODUCTION, DataBoundary.PILOT, DataBoundary.DEMO]) {
      expect(firmCohortKeyForBoundary(boundary, DEFAULT_VERTICAL_ID)).not.toBe(
        firmCohortKeyForBoundary(boundary, FIXTURE)
      );
      expect(vendorCohortKeyForBoundary(boundary, DEFAULT_VERTICAL_ID)).not.toBe(
        vendorCohortKeyForBoundary(boundary, FIXTURE)
      );
    }
  });

  it("splits a mixed set into separate cohorts when a mix is legitimately expected", () => {
    const partitioned = partitionByVertical([
      contributor("acct-1", DEFAULT_VERTICAL_ID),
      contributor("fixture-1", FIXTURE),
      contributor("acct-2", DEFAULT_VERTICAL_ID),
    ]);
    expect([...partitioned.keys()].sort()).toEqual([DEFAULT_VERTICAL_ID, FIXTURE]);
    expect(partitioned.get(DEFAULT_VERTICAL_ID)).toHaveLength(2);
    expect(partitioned.get(FIXTURE)).toHaveLength(1);
    // And each partition then satisfies the invariant on its own.
    for (const [verticalId, rows] of partitioned) {
      expect(() => assertSingleVerticalCohort(verticalId, rows)).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Proof 2 — suppression floors and caps count PER VERTICAL.
// ---------------------------------------------------------------------------

describe("proof 2 — suppression floors and caps count per vertical", () => {
  it("does not let two verticals' firms combine to clear the 5-firm floor", () => {
    // THE §5.1 scenario, in one assertion. Three accounting firms and three
    // fixture firms are six contributors — enough to publish if pooled, and the
    // published number would be meaningless. Counted per vertical it is three,
    // and both cuts stay suppressed.
    const accounting = Array.from({ length: 3 }, (_, i) => contributor(`acct-${i}`, DEFAULT_VERTICAL_ID));
    const fixture = Array.from({ length: 3 }, (_, i) => contributor(`fixture-${i}`, FIXTURE));

    const pooledIfNaive = evaluateBenchmarkSuppression([...accounting, ...fixture].map(() => 1));
    expect(pooledIfNaive.contributorCount).toBe(6);
    expect(pooledIfNaive.suppressed).toBe(false); // what the bug would publish

    const accountingCut = evaluateBenchmarkSuppressionForVertical(DEFAULT_VERTICAL_ID, accounting);
    const fixtureCut = evaluateBenchmarkSuppressionForVertical(FIXTURE, fixture);
    expect(accountingCut.contributorCount).toBe(3);
    expect(accountingCut.suppressed).toBe(true);
    expect(accountingCut.reason).toBe("insufficient_contributors");
    expect(fixtureCut.suppressed).toBe(true);
  });

  it("publishes a per-vertical cut that clears the floor on its own", () => {
    const accounting = Array.from({ length: MIN_CONTRIBUTORS }, (_, i) =>
      contributor(`acct-${i}`, DEFAULT_VERTICAL_ID)
    );
    const cut = evaluateBenchmarkSuppressionForVertical(DEFAULT_VERTICAL_ID, accounting);
    expect(cut.suppressed).toBe(false);
    expect(cut.contributorCount).toBe(MIN_CONTRIBUTORS);
  });

  it("applies the dominance cap within the vertical, not across the pool", () => {
    // One accounting firm supplying most of the accounting weight must suppress
    // the ACCOUNTING cut, however much data other verticals hold.
    const accounting = [
      contributor("acct-dominant", DEFAULT_VERTICAL_ID, 20),
      ...Array.from({ length: 4 }, (_, i) => contributor(`acct-${i}`, DEFAULT_VERTICAL_ID, 1)),
    ];
    const cut = evaluateBenchmarkSuppressionForVertical(DEFAULT_VERTICAL_ID, accounting);
    expect(cut.suppressed).toBe(true);
    expect(cut.reason).toBe("contributor_dominance");
    expect(cut.maxContributorShare).toBeGreaterThan(MAX_CONTRIBUTOR_SHARE);
  });

  it("refuses to count a mixed set at all", () => {
    // Counting the subset would silently "fix" the caller's mistake.
    expect(() =>
      evaluateBenchmarkSuppressionForVertical(DEFAULT_VERTICAL_ID, [
        ...Array.from({ length: 5 }, (_, i) => contributor(`acct-${i}`, DEFAULT_VERTICAL_ID)),
        contributor("fixture-1", FIXTURE),
      ])
    ).toThrow(BenchmarkCohortIsolationError);
  });

  it("leaves the suppression thresholds themselves vertical-neutral (class c)", () => {
    // Scoring, bands and suppression stay identical across verticals by design
    // (audit §2 class c). Only the DENOMINATOR is per-vertical.
    expect(MIN_CONTRIBUTORS).toBe(5);
    expect(MAX_CONTRIBUTOR_SHARE).toBe(0.25);
    const five = Array.from({ length: 5 }, (_, i) => contributor(`x-${i}`, FIXTURE));
    expect(evaluateBenchmarkSuppressionForVertical(FIXTURE, five)).toEqual(
      evaluateBenchmarkSuppression(five.map(() => 1))
    );
  });
});

// ---------------------------------------------------------------------------
// Proof 3 — accounting cohorts are byte-identical flag-off AND
// flag-on-with-only-accounting-data.
// ---------------------------------------------------------------------------

describe("proof 3 — accounting cohorts are byte-identical either way", () => {
  const BOUNDARIES = [DataBoundary.PRODUCTION, DataBoundary.PILOT, DataBoundary.DEMO];

  it("keeps accounting's cohort keys as the literal keys that already exist", () => {
    // BenchmarkCohort.key is unique and already stored. Qualifying accounting's
    // key would orphan every existing cohort row and every CompanyBenchmark
    // pointing at it — a rename dressed as a config change.
    expect(firmCohortKeyForBoundary(DataBoundary.PRODUCTION)).toBe("firm:real");
    expect(firmCohortKeyForBoundary(DataBoundary.PILOT)).toBe("firm:real");
    expect(firmCohortKeyForBoundary(DataBoundary.DEMO)).toBe("firm:demo");
    expect(vendorCohortKeyForBoundary(DataBoundary.PRODUCTION)).toBe("vendor:real");
    expect(vendorCohortKeyForBoundary(DataBoundary.DEMO)).toBe("vendor:demo");
  });

  it("produces the same key with the vertical passed explicitly as with it omitted", () => {
    // Flag off, callers pass nothing; flag on with only accounting data, they
    // pass "accounting". Both must address the same cohort row.
    for (const boundary of BOUNDARIES) {
      expect(firmCohortKeyForBoundary(boundary, DEFAULT_VERTICAL_ID)).toBe(
        firmCohortKeyForBoundary(boundary)
      );
      expect(vendorCohortKeyForBoundary(boundary, DEFAULT_VERTICAL_ID)).toBe(
        vendorCohortKeyForBoundary(boundary)
      );
    }
  });

  it("appends nothing for accounting and a segment for any other vertical", () => {
    expect(benchmarkCohortKey("firm:real", DEFAULT_VERTICAL_ID)).toBe("firm:real");
    expect(benchmarkCohortKey("firm:real", FIXTURE)).toBe(`firm:real:${FIXTURE}`);
    // Trimmed, but never re-spelled.
    expect(benchmarkCohortKey("firm:real", `  ${DEFAULT_VERTICAL_ID}  `)).toBe("firm:real");
  });

  it("never constructs a key that could be mistaken for another vertical's", () => {
    const keys = new Set<string>();
    for (const boundary of BOUNDARIES) {
      for (const verticalId of [DEFAULT_VERTICAL_ID, FIXTURE]) {
        keys.add(firmCohortKeyForBoundary(boundary, verticalId));
        keys.add(vendorCohortKeyForBoundary(boundary, verticalId));
      }
    }
    // 2 audiences × 2 distinct pools × 2 verticals = 8 distinct keys, with no
    // collision between accounting's unqualified keys and the fixture's.
    expect(keys.size).toBe(8);
  });

  it("leaves accounting's suppression verdicts unchanged by the fixture's existence", () => {
    // The proof that a second vertical existing at all cannot move an accounting
    // number: the same accounting contributors produce the same verdict whether
    // or not fixture data is present in the system.
    const accounting = Array.from({ length: 6 }, (_, i) => contributor(`acct-${i}`, DEFAULT_VERTICAL_ID));
    const before = evaluateBenchmarkSuppression(accounting.map(() => 1));
    const after = evaluateBenchmarkSuppressionForVertical(DEFAULT_VERTICAL_ID, accounting);
    expect(after).toEqual(before);
  });
});
