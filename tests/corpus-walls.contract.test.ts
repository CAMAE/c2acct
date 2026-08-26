import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Corpus program (a) + (b) — the depth-tier wall and the reserved `public`
 * audience, proved in the composed SQL.
 *
 * Same technique as tests/pat-help-scope.test.ts: mock the prisma boundary and
 * inspect what the query builder actually emitted. A wall asserted in prose is a
 * wall nobody checked; a wall asserted against the SQL string is one that has to
 * survive an edit to keep passing.
 */

const { queryRaw } = vi.hoisted(() => ({
  // Typed as a function OF the query argument so the recorded call tuple is
  // indexable — this suite asserts on the composed SQL and its bound values,
  // which live in that first argument.
  queryRaw: vi.fn(async (query: unknown) => {
    void query;
    return [] as unknown[];
  }),
}));

vi.mock("@/lib/prisma", () => ({ default: { $queryRaw: queryRaw } }));

import { retrieveHelp } from "@/lib/patAssistant/retrieveHelp";
import {
  AUTHENTICATED_AUDIENCES,
  DEPTH_TIERS,
  DEPTH_TIER_CORE,
  DEPTH_TIER_ELITE,
  PUBLIC_AUDIENCE,
  isKnownAudienceToken,
  maxDepthTierFor,
  readableDepthTiers,
} from "@/lib/patAssistant/corpusAccess";
import { MEMBERSHIP_PLAN, NO_MEMBERSHIP } from "@/lib/membership";

function lastCall() {
  return queryRaw.mock.calls.at(-1)?.[0] as
    | { strings?: string[]; values?: unknown[] }
    | undefined;
}
function composedSql(): string {
  const arg = lastCall();
  return arg?.strings && Array.isArray(arg.strings) ? arg.strings.join(" ") : "";
}
/**
 * Every bound parameter, flattened — nested Prisma.sql fragments included.
 *
 * The array check comes FIRST on purpose: `Array.prototype.values` exists, so a
 * bare `"values" in value` test treats every bound array (like the depth-tier
 * allowlist this suite is here to assert on) as a nested SQL fragment.
 */
function boundValues(): unknown[] {
  const out: unknown[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      out.push(value);
      return;
    }
    if (value && typeof value === "object" && Array.isArray((value as { values?: unknown }).values)) {
      for (const nested of (value as { values: unknown[] }).values) walk(nested);
      return;
    }
    out.push(value);
  };
  for (const value of lastCall()?.values ?? []) walk(value);
  return out;
}

beforeEach(() => {
  queryRaw.mockClear();
});

describe("depth-tier wall (corpus program (a))", () => {
  it("always emits a depthTier predicate, in every mode", async () => {
    await retrieveHelp("q", "vendor", 5, { membershipPlan: MEMBERSHIP_PLAN.PRO });
    expect(composedSql()).toContain('"depthTier"');

    await retrieveHelp("q", "consultant", 5, { unrestricted: true });
    // unrestricted drops the AUDIENCE predicate — never the tier predicate.
    expect(composedSql()).toContain('"depthTier"');
  });

  it("binds CORE only for a viewer with no ELITE entitlement", async () => {
    for (const plan of [NO_MEMBERSHIP, MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.FREE, null, undefined]) {
      queryRaw.mockClear();
      await retrieveHelp("q", "firm", 5, { membershipPlan: plan });
      expect(boundValues()).toContainEqual([DEPTH_TIER_CORE]);
    }
  });

  it("binds CORE and ELITE for an ELITE member", async () => {
    await retrieveHelp("q", "firm", 5, { membershipPlan: MEMBERSHIP_PLAN.ELITE });
    expect(boundValues()).toContainEqual([DEPTH_TIER_CORE, DEPTH_TIER_ELITE]);
  });

  it("gives consultant/admin CORE depth despite unrestricted audience reach", async () => {
    // Being entitled to ask about any audience's help is not the same
    // entitlement as being entitled to read paid depth. Collapsing the two would
    // hand ELITE content to every consultant seat.
    await retrieveHelp("q", "consultant", 5, { unrestricted: true, membershipPlan: NO_MEMBERSHIP });
    expect(boundValues()).toContainEqual([DEPTH_TIER_CORE]);
  });

  it("is an allowlist, so a future tier is invisible until named", () => {
    // Deny-by-default: readableDepthTiers never returns a tier it was not
    // written to return, so adding a tier to the enum cannot silently widen
    // anyone's reach.
    for (const plan of [NO_MEMBERSHIP, MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE]) {
      for (const tier of readableDepthTiers(plan)) {
        expect(DEPTH_TIERS).toContain(tier);
      }
    }
    expect(readableDepthTiers(NO_MEMBERSHIP)).toEqual([DEPTH_TIER_CORE]);
    expect(maxDepthTierFor(MEMBERSHIP_PLAN.ELITE)).toBe(DEPTH_TIER_ELITE);
    expect(maxDepthTierFor(MEMBERSHIP_PLAN.PRO)).toBe(DEPTH_TIER_CORE);
  });

  it("is INERT today: every existing source is CORE, and CORE is readable by all", async () => {
    // The wall ships BEFORE the content it gates. With no ELITE row in the
    // corpus, every viewer's allowlist admits every row, so retrieval returns
    // exactly what it returned before the column existed.
    for (const plan of [NO_MEMBERSHIP, MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE]) {
      expect(readableDepthTiers(plan)).toContain(DEPTH_TIER_CORE);
    }
  });

  it("keeps the help_doc corpus wall in place alongside the new one", async () => {
    await retrieveHelp("q", "vendor", 5, { membershipPlan: MEMBERSHIP_PLAN.ELITE });
    const sql = composedSql();
    expect(sql).toContain("help_doc");
    expect(sql).not.toContain("audit_log");
  });
});

describe("the reserved public audience (corpus program (b))", () => {
  it("is a known audience token that the authenticated list does NOT contain", () => {
    expect(isKnownAudienceToken(PUBLIC_AUDIENCE)).toBe(true);
    expect(AUTHENTICATED_AUDIENCES as readonly string[]).not.toContain(PUBLIC_AUDIENCE);
  });

  it("returns nothing for a caller claiming `public` without the public entry path", async () => {
    // The wall accepts the word; no authenticated caller may speak it.
    const rows = await retrieveHelp("q", PUBLIC_AUDIENCE, 5, { membershipPlan: "ELITE" });
    expect(rows).toEqual([]);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("pins the public entry path to CORE depth regardless of what it passes", async () => {
    // The public path is signed out by definition, so it cannot carry an
    // entitlement — even if a caller tried to hand it one.
    await retrieveHelp("q", PUBLIC_AUDIENCE, 5, {
      publicEntry: true,
      membershipPlan: MEMBERSHIP_PLAN.ELITE,
    });
    expect(boundValues()).toContainEqual([DEPTH_TIER_CORE]);
  });

  it("keeps the audience predicate for the public path", async () => {
    await retrieveHelp("q", PUBLIC_AUDIENCE, 5, { publicEntry: true });
    expect(composedSql()).toContain('"roleAccess"');
    expect(boundValues()).toContain(PUBLIC_AUDIENCE);
  });
});

describe("no surface serves the public path in this box", () => {
  it("nothing outside the retrieval seam and its tests passes publicEntry", async () => {
    // (b) is explicit: the wall accepts the value, no surface serves it. This is
    // the assertion that keeps "not yet wired" true rather than assumed.
    const { execFileSync } = await import("node:child_process");
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const root = process.cwd();

    const tracked = execFileSync("git", ["ls-files", "app", "lib", "scripts"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
    expect(tracked.length).toBeGreaterThan(100);

    const allowed = new Set(["lib/patAssistant/retrieveHelp.ts"]);
    const offenders = tracked.filter(
      (file) => !allowed.has(file) && /\bpublicEntry\b/.test(readFileSync(path.join(root, file), "utf8"))
    );
    expect(offenders).toEqual([]);
  });
});

describe("the corpus migration is additive only", () => {
  it("adds an enum, a defaulted column, a table and indexes — and nothing else", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "prisma/migrations/20260826150000_add_corpus_depth_tier_and_decline_log/migration.sql"
      ),
      "utf8"
    );

    expect(migration).toContain(
      `ALTER TABLE "KnowledgeSource" ADD COLUMN "depthTier" "KnowledgeDepthTier" NOT NULL DEFAULT 'CORE'`
    );
    expect(migration).toContain(`CREATE TYPE "KnowledgeDepthTier" AS ENUM ('CORE', 'ELITE')`);
    expect(migration).toContain(`CREATE TABLE "PatDeclineLog"`);

    // Additive-only is the deployability claim: an older build must keep working
    // against this schema. The default is CORE, which is what every existing
    // source already is, so the column is inert on the day it lands.
    const statements = migration
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--") && line.trim().length > 0);
    for (const statement of statements) {
      expect(statement).not.toMatch(/\bDROP\b/i);
      expect(statement).not.toMatch(/\bRENAME\b/i);
      expect(statement).not.toMatch(/\bALTER COLUMN\b/i);
      expect(statement).not.toMatch(/^\s*UPDATE\b/i);
      expect(statement).not.toMatch(/^\s*DELETE\b/i);
    }
  });

  it("carries no identity column into the gap log", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "prisma/migrations/20260826150000_add_corpus_depth_tier_and_decline_log/migration.sql"
      ),
      "utf8"
    );
    const table = migration.slice(migration.indexOf('CREATE TABLE "PatDeclineLog"'));
    const body = table.slice(0, table.indexOf(");"));
    for (const forbidden of ["userId", "companyId", "subjectId", "email"]) {
      expect(body).not.toContain(forbidden);
    }
  });
});
