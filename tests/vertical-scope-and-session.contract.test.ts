import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import { VERTICAL_PACKS_FLAG_ENV, type VerticalEnv } from "@/lib/verticals/flag";
import { verticalFilter, verticalStamp } from "@/lib/verticals/scope";
import { resolveVerticalForSession } from "@/lib/verticals/session";

/**
 * W5 contract (VERTICAL-READINESS-AUDIT-2026-08 §3.3, §4 W5) — the storage half
 * of the byte-identity invariant, plus the production caller PF-1 deferred.
 *
 * Three obligations, and none of them is satisfiable by a comment:
 *   1. flag off, the scope seam contributes NO predicate and NO column;
 *   2. flag off, resolving a tenant's vertical performs ZERO reads — counted,
 *      not asserted in prose;
 *   3. the seven W5 columns are additive-only in the migration, so an older
 *      build keeps working against the new schema.
 */

const ROOT = process.cwd();
const FLAG_ON: VerticalEnv = { [VERTICAL_PACKS_FLAG_ENV]: "1" };
const FLAG_OFF: VerticalEnv = {};

const W5_MODELS = [
  "ModuleItem",
  "ModuleUnlockRule",
  "ModuleSitting",
  "ItemResponse",
  "SurveySubmission",
  "CompanyBenchmark",
  "CompanyBenchmarkCohort",
] as const;

describe("verticalFilter / verticalStamp — the flag-off short-circuit", () => {
  it("contributes an EMPTY object with the flag off", () => {
    // The whole storage-layer guarantee in one assertion. `{}` spread into a
    // Prisma `where` adds no predicate; spread into `data` it names no column.
    expect(verticalFilter({ env: FLAG_OFF })).toEqual({});
    expect(verticalStamp({ env: FLAG_OFF })).toEqual({});
  });

  it("does not even carry the key with the flag off", () => {
    // `{ verticalId: undefined }` would also be a no-op filter for Prisma, but
    // it is not the same object and it is not provable in the same way. The
    // absence of the key is what makes "no filter for a default tenant"
    // checkable rather than trusted.
    expect(Object.keys(verticalFilter({ env: FLAG_OFF }))).toEqual([]);
    expect("verticalId" in verticalFilter({ env: FLAG_OFF })).toBe(false);
  });

  it("ignores every input with the flag off", () => {
    expect(
      verticalFilter({
        verticalId: "legal",
        session: { company: { verticalId: "healthcare" } },
        env: { PAT_DEFAULT_VERTICAL: "manufacturing" },
      })
    ).toEqual({});
  });

  it("applies the resolved vertical with the flag on", () => {
    expect(verticalFilter({ env: FLAG_ON })).toEqual({ verticalId: DEFAULT_VERTICAL_ID });
    expect(verticalFilter({ verticalId: "legal", env: FLAG_ON })).toEqual({ verticalId: "legal" });
    expect(
      verticalStamp({ session: { company: { verticalId: "legal" } }, env: FLAG_ON })
    ).toEqual({ verticalId: "legal" });
  });

  it("keeps the read scope and the write stamp in agreement", () => {
    // Read scope and write stamp disagreeing would write rows into one vertical
    // and read them back from another.
    for (const env of [FLAG_OFF, FLAG_ON]) {
      const options = { session: { company: { verticalId: "legal" } }, env };
      expect(verticalFilter(options)).toEqual(verticalStamp(options));
    }
  });
});

describe("resolveVerticalForSession — no new DB reads with the flag off", () => {
  it("performs ZERO session reads and ZERO company reads with the flag off", async () => {
    let sessionReads = 0;
    let companyReads = 0;

    const resolved = await resolveVerticalForSession({
      env: FLAG_OFF,
      readSessionCompanyId: async () => {
        sessionReads += 1;
        return "company-1";
      },
      readCompanyVerticalId: async () => {
        companyReads += 1;
        return "legal";
      },
    });

    // This is the §3.3 promise as a counted fact: a flag-off request does not
    // acquire a read it did not already have, so no query plan changed and no
    // round trip was added for a default tenant.
    expect(sessionReads).toBe(0);
    expect(companyReads).toBe(0);
    expect(resolved).toBe(DEFAULT_VERTICAL_ID);
  });

  it("reads the tenant's vertical with the flag on", async () => {
    let companyReads = 0;
    const resolved = await resolveVerticalForSession({
      env: FLAG_ON,
      readSessionCompanyId: async () => "company-1",
      readCompanyVerticalId: async () => {
        companyReads += 1;
        return "legal";
      },
    });
    expect(companyReads).toBe(1);
    expect(resolved).toBe("legal");
  });

  it("does not read a company when there is no tenant to read", async () => {
    let companyReads = 0;
    const resolved = await resolveVerticalForSession({
      env: { ...FLAG_ON, PAT_DEFAULT_VERTICAL: "manufacturing" },
      readSessionCompanyId: async () => null,
      readCompanyVerticalId: async () => {
        companyReads += 1;
        return "legal";
      },
    });
    // Signed out: fall through to env → constant without inventing a read.
    expect(companyReads).toBe(0);
    expect(resolved).toBe("manufacturing");
  });

  it("lets an explicit vertical win without any read at all", async () => {
    let sessionReads = 0;
    const resolved = await resolveVerticalForSession({
      env: FLAG_ON,
      verticalId: "legal",
      readSessionCompanyId: async () => {
        sessionReads += 1;
        return "company-1";
      },
    });
    expect(sessionReads).toBe(0);
    expect(resolved).toBe("legal");
  });

  it("falls to the constant when the tenant column is blank", async () => {
    const resolved = await resolveVerticalForSession({
      env: FLAG_ON,
      readSessionCompanyId: async () => "company-1",
      readCompanyVerticalId: async () => "   ",
    });
    expect(resolved).toBe(DEFAULT_VERTICAL_ID);
  });
});

describe("W5 migration is additive only", () => {
  const migration = readFileSync(
    path.join(
      ROOT,
      "prisma/migrations/20260826120000_add_vertical_id_module_content_and_benchmarks/migration.sql"
    ),
    "utf8"
  );

  it("adds the column and its index to all seven models", () => {
    for (const model of W5_MODELS) {
      expect(migration).toContain(
        `ALTER TABLE "${model}" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';`
      );
      expect(migration).toContain(`CREATE INDEX "${model}_verticalId_idx" ON "${model}"("verticalId");`);
    }
  });

  it("contains no destructive or rewriting statement", () => {
    // Additive-only is the deployability claim: an older build must keep working
    // against this schema. DROP / RENAME / ALTER COLUMN / UPDATE would each
    // break that in a different way, so none of them may appear.
    const statements = migration
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--") && line.trim().length > 0);
    for (const statement of statements) {
      expect(statement).not.toMatch(/\bDROP\b/i);
      expect(statement).not.toMatch(/\bRENAME\b/i);
      expect(statement).not.toMatch(/\bALTER COLUMN\b/i);
      expect(statement).not.toMatch(/^\s*UPDATE\b/i);
      expect(statement).not.toMatch(/^\s*DELETE\b/i);
      expect(statement).toMatch(/^(ALTER TABLE .* ADD COLUMN|CREATE INDEX)/);
    }
  });

  it("defaults every new column to the frozen pack id", () => {
    const defaults = migration.match(/DEFAULT '([^']+)'/g) ?? [];
    expect(defaults).toHaveLength(W5_MODELS.length);
    for (const clause of defaults) {
      expect(clause).toBe(`DEFAULT '${DEFAULT_VERTICAL_ID}'`);
    }
  });

  it("leaves BenchmarkCohort and BenchmarkRun unverticalized on purpose", () => {
    // A cohort is single-vertical BY CONSTRUCTION (W6): the isolation invariant
    // refuses a mixed contributor set at write time rather than filtering one
    // out at read time. Adding the column to the cohort itself would invite a
    // reader to filter, which is the failure mode the audit §5.1 warns about —
    // the numbers still pass suppression while silently changing meaning.
    expect(migration).not.toContain('ALTER TABLE "BenchmarkCohort"');
    expect(migration).not.toContain('ALTER TABLE "BenchmarkRun"');
  });
});
