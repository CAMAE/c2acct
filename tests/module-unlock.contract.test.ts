import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import {
  ADAPTIVE_MODULES_FLAG_ENV,
  categoryForModuleKey,
  isAdaptiveModulesEnabled,
  unlockDateFor,
} from "@/lib/modules/unlock";
import { SCORE_BAND_ORDER } from "@/lib/bandLexicon";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";

/**
 * Adaptive module unlock resolver (Block A).
 *
 * Split deliberately: the pure arithmetic (pattern vocabulary, the quarter
 * drip, the flag) is tested with no database so it gates in CI; the gates that
 * depend on real rows (the APPROVED publish wall, determinism over a real
 * query) run against Postgres and SKIP visibly when none is reachable.
 */

applyRepoEnv();

const NS = "test-blocka-unlock";
let prisma: typeof import("@/lib/prisma").default;
let dbAvailable = false;

// --- Pure: vocabulary, drip, flag (no database) ------------------------------

describe("pattern vocabulary", () => {
  it("uses lowercased pillar names as the category token", () => {
    expect(categoryForModuleKey("firm_alignment_data_flow_v1")).toBe("integration");
    expect(categoryForModuleKey("firm_alignment_governance_v1")).toBe("governance");
    expect(categoryForModuleKey("not_a_module")).toBeNull();
    // Every shipped pillar resolves — a new pillar must not silently produce
    // pattern keys nothing can match.
    for (const definition of FIRM_MODULE_DEFINITIONS) {
      expect(categoryForModuleKey(definition.key)).toBe(definition.pillarName.toLowerCase());
    }
  });

  it("admits the five lexicon bands and nothing else", () => {
    // One vocabulary, one spelling per fact (Mythos, Box 4 verdict). A coarse
    // low/mid/high token set was rejected: coarse is recoverable by authoring
    // two precise rules, precise is not recoverable from coarse.
    expect(SCORE_BAND_ORDER).toEqual(["early", "developing", "building", "established", "leading"]);
    const retired = ["low", "mid", "high"];
    for (const token of retired) {
      expect(SCORE_BAND_ORDER as readonly string[]).not.toContain(token);
    }
  });

  it("produces keys of shape <category>:<band> using only lexicon bands", () => {
    const shape = /^[a-z]+:(early|developing|building|established|leading)$/;
    for (const definition of FIRM_MODULE_DEFINITIONS) {
      const category = definition.pillarName.toLowerCase();
      for (const band of SCORE_BAND_ORDER) {
        expect(`${category}:${band}`).toMatch(shape);
      }
      // A retired coarse token must not satisfy the vocabulary.
      expect(`${category}:low`).not.toMatch(shape);
    }
  });
});

describe("quarterOffset drip", () => {
  const patternAsOf = new Date("2026-01-15T00:00:00Z");
  const quarters = [
    { dueDate: new Date("2026-03-31T00:00:00Z") },
    { dueDate: new Date("2026-06-30T00:00:00Z") },
    { dueDate: new Date("2026-09-30T00:00:00Z") },
  ];

  it("offset 0 opens as soon as the pattern exists", () => {
    expect(unlockDateFor(0, patternAsOf, quarters)).toEqual(patternAsOf);
  });

  it("offset N opens at the Nth upcoming quarter's due date", () => {
    expect(unlockDateFor(1, patternAsOf, quarters)).toEqual(quarters[0]!.dueDate);
    expect(unlockDateFor(2, patternAsOf, quarters)).toEqual(quarters[1]!.dueDate);
    expect(unlockDateFor(3, patternAsOf, quarters)).toEqual(quarters[2]!.dueDate);
  });

  it("returns null when the firm has no quarter that far out", () => {
    expect(unlockDateFor(4, patternAsOf, quarters)).toBeNull();
    expect(unlockDateFor(1, patternAsOf, [])).toBeNull();
  });

  it("ignores quarters that already closed before the pattern existed", () => {
    const withPast = [{ dueDate: new Date("2025-12-31T00:00:00Z") }, ...quarters];
    // The stale 2025 quarter must not consume the offset — offset 1 still
    // resolves to Q1 2026, not to the quarter that closed before the pattern.
    expect(unlockDateFor(1, patternAsOf, withPast)).toEqual(quarters[0]!.dueDate);
  });

  it("returns null with no pattern at all", () => {
    expect(unlockDateFor(0, null, quarters)).toBeNull();
  });
});

describe("flag", () => {
  it("defaults OFF and is only on for an explicit 1", () => {
    expect(isAdaptiveModulesEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(isAdaptiveModulesEnabled({ [ADAPTIVE_MODULES_FLAG_ENV]: "0" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isAdaptiveModulesEnabled({ [ADAPTIVE_MODULES_FLAG_ENV]: "true" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(isAdaptiveModulesEnabled({ [ADAPTIVE_MODULES_FLAG_ENV]: "1" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("no surface references the resolver while dark", () => {
  it("is imported only by lib/modules and its tests", async () => {
    const { promises: fs } = await import("node:fs");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    void fs;
    const run = promisify(execFile);
    // Block A is explicitly "no UI, no serving change": nothing under app/ may
    // reach the resolver yet.
    const { stdout } = await run("grep", ["-rl", "modules/unlock", "app", "lib", "scripts", "tests"]).catch(
      (error: { stdout?: string }) => ({ stdout: error.stdout ?? "" })
    );
    const referrers = stdout.split("\n").filter(Boolean).sort();
    expect(referrers.filter((path) => path.startsWith("app/"))).toEqual([]);
    expect(referrers).toEqual(["tests/module-unlock.contract.test.ts"]);
  });
});

// --- DB-backed: the publish wall and determinism ------------------------------

async function cleanup() {
  if (!dbAvailable) return;
  await prisma.moduleUnlockRule.deleteMany({ where: { patternSubset: { startsWith: NS } } });
  await prisma.moduleTemplate.deleteMany({ where: { key: { startsWith: NS } } });
  await prisma.engagementQuarter.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.surveySubmission.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: NS } } });
}

beforeAll(async () => {
  prisma = (await import("@/lib/prisma")).default;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  await cleanup();
});

// ModuleUnlockRule is keyed by (patternSubset, template) and is GLOBAL — it is
// not scoped to a company. A rule seeded by one test therefore matches every
// later test's firm with the same pattern, so fixtures must be torn down
// between tests rather than only at the end.
beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  if (dbAvailable) await prisma.$disconnect();
});

/** A firm with one scored governance submission, plus a rule → template. */
async function seedFirm(suffix: string, reviewStatus: "APPROVED" | "DRAFT" | "RETIRED", opts?: {
  quarterOffset?: number;
  active?: boolean;
  score?: number;
}) {
  const companyId = `${NS}-company-${suffix}`;
  await prisma.company.create({
    data: { id: companyId, name: `Unlock ${suffix}`, type: "FIRM", dataBoundary: "DEMO", updatedAt: new Date() },
  });

  const governanceModule = await prisma.surveyModule.findFirstOrThrow({
    where: { key: "firm_alignment_governance_v1" },
    select: { id: true },
  });
  await prisma.surveySubmission.create({
    data: {
      id: `${NS}-sub-${suffix}`,
      companyId,
      moduleId: governanceModule.id,
      answers: {},
      score: opts?.score ?? 20, // → "early" / coarse "low"
      createdAt: new Date("2026-01-15T00:00:00Z"),
    },
  });

  const template = await prisma.moduleTemplate.create({
    data: {
      key: `${NS}-template-${suffix}`,
      category: "governance",
      targetPattern: "governance:early",
      moduleType: "REMEDIATION",
      title: `Unlock ${suffix}`,
      reviewStatus,
      active: opts?.active ?? true,
    },
  });
  const rule = await prisma.moduleUnlockRule.create({
    data: {
      patternSubset: `${NS}-unused`, // replaced below with a real pattern key
      templateId: template.id,
      quarterOffset: opts?.quarterOffset ?? 0,
    },
  });
  return { companyId, template, rule };
}

describe("resolveUnlocks — publish wall and determinism", () => {
  it("unlocks an APPROVED template whose rule matches the firm's pattern", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { computeScoringPattern, resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, template, rule } = await seedFirm("approved", "APPROVED");

    const pattern = await computeScoringPattern(companyId);
    // Precise vocabulary only — the coarse alias must NOT be emitted.
    expect(pattern.keys).toEqual(["governance:early"]);
    expect(pattern.composite).toBe("governance:early");

    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });

    const unlocked = await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"));
    expect(unlocked.map((entry) => entry.templateId)).toEqual([template.id]);
    expect(unlocked[0]!.ruleId).toBe(rule.id);
  });

  it("NEVER unlocks a DRAFT template, even with a matching active rule", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, rule } = await seedFirm("draft", "DRAFT");
    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });

    // The rule matches perfectly. The publish gate still wins.
    expect(await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"))).toEqual([]);
  });

  it("NEVER unlocks a RETIRED template", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, rule } = await seedFirm("retired", "RETIRED");
    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });

    expect(await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"))).toEqual([]);
  });

  it("NEVER unlocks an APPROVED-but-inactive template", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, rule } = await seedFirm("inactive", "APPROVED", { active: false });
    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });

    expect(await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"))).toEqual([]);
  });

  it("quarterOffset shifts availability to the firm's own quarter calendar", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, template, rule } = await seedFirm("drip", "APPROVED", { quarterOffset: 1 });
    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });
    await prisma.engagementQuarter.create({
      data: { companyId, quarter: "2026-Q1", dueDate: new Date("2026-03-31T00:00:00Z"), updatedAt: new Date() },
    });

    // Before the quarter closes: still dripping.
    expect(await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"))).toEqual([]);
    // After: open.
    const later = await resolveUnlocks(companyId, new Date("2026-04-01T00:00:00Z"));
    expect(later.map((entry) => entry.templateId)).toEqual([template.id]);
    expect(later[0]!.unlockedAsOf).toEqual(new Date("2026-03-31T00:00:00Z"));
  });

  it("is deterministic — two calls against the same state return identical output", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { computeScoringPattern, resolveUnlocks } = await import("@/lib/modules/unlock");
    const { companyId, rule } = await seedFirm("determinism", "APPROVED");
    await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });

    const now = new Date("2026-02-01T00:00:00Z");
    const [a, b] = [await resolveUnlocks(companyId, now), await resolveUnlocks(companyId, now)];
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));

    const [p1, p2] = [await computeScoringPattern(companyId), await computeScoringPattern(companyId)];
    expect(JSON.stringify(p1)).toBe(JSON.stringify(p2));
  });

  it("returns nothing for a firm with no scored pillars", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { computeScoringPattern, resolveUnlocks } = await import("@/lib/modules/unlock");
    const companyId = `${NS}-company-empty`;
    await prisma.company.create({
      data: { id: companyId, name: "Empty", type: "FIRM", dataBoundary: "DEMO", updatedAt: new Date() },
    });

    const pattern = await computeScoringPattern(companyId);
    expect(pattern.keys).toEqual([]);
    expect(pattern.composite).toBe("");
    expect(await resolveUnlocks(companyId, new Date())).toEqual([]);
  });

  it("works with the flag OFF — the flag gates surfaces, not the arithmetic", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { resolveUnlocks } = await import("@/lib/modules/unlock");
    const previous = process.env[ADAPTIVE_MODULES_FLAG_ENV];
    delete process.env[ADAPTIVE_MODULES_FLAG_ENV];
    try {
      expect(isAdaptiveModulesEnabled()).toBe(false);
      const { companyId, rule } = await seedFirm("flagoff", "APPROVED");
      await prisma.moduleUnlockRule.update({ where: { id: rule.id }, data: { patternSubset: "governance:early" } });
      // Callable and correct while dark; no surface consumes it (asserted above).
      expect((await resolveUnlocks(companyId, new Date("2026-02-01T00:00:00Z"))).length).toBe(1);
    } finally {
      if (previous === undefined) delete process.env[ADAPTIVE_MODULES_FLAG_ENV];
      else process.env[ADAPTIVE_MODULES_FLAG_ENV] = previous;
    }
  });
});
