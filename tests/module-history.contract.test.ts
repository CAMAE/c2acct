import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";

/**
 * Per-item response history — "Prerequisite Zero" (Adaptive Modules Block A).
 *
 * These assertions are about CONSTRAINTS THE DATABASE ENFORCES (a unique index,
 * two RESTRICT foreign keys), so they run against a real Postgres. An in-memory
 * fake would only be testing the fake: it would happily "enforce" whatever the
 * fake was written to enforce, which proves nothing about the migration that
 * actually ships.
 *
 * When no database is reachable the suite SKIPS rather than passing vacuously —
 * a constraint test that silently succeeds without a constraint is worse than
 * no test. CI (which has no DB) reports these as skipped.
 */

applyRepoEnv();

const NS = "test-blocka-history";
let prisma: typeof import("@/lib/prisma").default;
let dbAvailable = false;

async function cleanup() {
  if (!dbAvailable) return;
  // Children first — the RESTRICT edges under test refuse the other order.
  await prisma.itemResponse.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.moduleSitting.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.moduleItem.deleteMany({ where: { key: { startsWith: NS } } });
  await prisma.moduleTemplate.deleteMany({ where: { key: { startsWith: NS } } });
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

afterAll(async () => {
  await cleanup();
  if (dbAvailable) await prisma.$disconnect();
});

/** One template + one item + one company + one in-progress sitting. */
async function fixture(suffix: string) {
  const companyId = `${NS}-company-${suffix}`;
  const templateKey = `${NS}-template-${suffix}`;
  const itemKey = `${NS}-item-${suffix}`;

  await prisma.company.create({
    data: { id: companyId, name: `Block A ${suffix}`, type: "FIRM", dataBoundary: "DEMO", updatedAt: new Date() },
  });
  const template = await prisma.moduleTemplate.create({
    data: {
      key: templateKey,
      category: "governance",
      targetPattern: "governance:early",
      moduleType: "DIAGNOSTIC",
      title: `Block A ${suffix}`,
      reviewStatus: "APPROVED",
    },
  });
  const item = await prisma.moduleItem.create({
    data: {
      key: itemKey,
      templateId: template.id,
      category: "governance",
      itemKind: "ENTRY",
      difficulty: "MODERATE",
      stem: "Which control owns sign-off?",
      choices: [{ key: "a", label: "Partner" }, { key: "b", label: "Nobody" }],
      correctKey: "a",
    },
  });
  const sitting = await prisma.moduleSitting.create({
    data: { companyId, templateId: template.id, servedItemIds: [item.id] },
  });
  return { companyId, template, item, sitting };
}

describe("ItemResponse history constraints", () => {
  it("derives isCorrect server-side from correctKey, never from the caller", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("grade");

    // The input carries NO correctness claim — only the chosen key.
    const wrong = await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "b" });
    expect(wrong.isCorrect).toBe(false);

    const right = await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });
    expect(right.isCorrect).toBe(true);

    // Grading follows the ITEM, so editing correctKey re-grades future answers
    // rather than trusting anything the caller said.
    await prisma.moduleItem.update({ where: { id: item.id }, data: { correctKey: "b" } });
    const regraded = await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "b" });
    expect(regraded.isCorrect).toBe(true);
  });

  it("enforces one response per (sitting, item)", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("unique");

    await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });
    await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "b" });

    const rows = await prisma.itemResponse.findMany({ where: { sittingId: sitting.id, itemId: item.id } });
    expect(rows).toHaveLength(1);
    // The second answer replaced the first rather than appending.
    expect(rows[0]!.responseKey).toBe("b");

    // And the raw constraint is real: a direct insert of a duplicate is refused.
    await expect(
      prisma.itemResponse.create({
        data: {
          sittingId: sitting.id,
          itemId: item.id,
          companyId: rows[0]!.companyId,
          responseKey: "a",
          isCorrect: true,
          itemRevisionAt: new Date(),
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("RESTRICT on itemId refuses to delete an item that has history", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("restrict-item");
    await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });

    // A content cleanup must NOT be able to destroy calibration history.
    await expect(prisma.moduleItem.delete({ where: { id: item.id } })).rejects.toMatchObject({ code: "P2003" });
    expect(await prisma.moduleItem.count({ where: { id: item.id } })).toBe(1);
  });

  it("RESTRICT on templateId refuses to delete a template that has sittings", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { template } = await fixture("restrict-template");

    await expect(prisma.moduleTemplate.delete({ where: { id: template.id } })).rejects.toMatchObject({
      code: "P2003",
    });
    expect(await prisma.moduleTemplate.count({ where: { id: template.id } })).toBe(1);
  });

  it("CASCADE from sitting removes its responses", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("cascade-sitting");
    await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });

    await prisma.moduleSitting.delete({ where: { id: sitting.id } });
    expect(await prisma.itemResponse.count({ where: { sittingId: sitting.id } })).toBe(0);
    // The item itself survives — only the sitting's own answers went.
    expect(await prisma.moduleItem.count({ where: { id: item.id } })).toBe(1);
  });

  it("refuses an answer for an item belonging to another template", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse, ModuleHistoryError } = await import("@/lib/modules/history");
    const a = await fixture("crosstalk-a");
    const b = await fixture("crosstalk-b");

    await expect(
      recordItemResponse({ sittingId: a.sitting.id, itemId: b.item.id, responseKey: "a" })
    ).rejects.toBeInstanceOf(ModuleHistoryError);
  });

  it("refuses an answer against a closed sitting", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("closed");
    await prisma.moduleSitting.update({ where: { id: sitting.id }, data: { status: "COMPLETED" } });

    await expect(
      recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" })
    ).rejects.toMatchObject({ code: "sitting_closed" });
  });

  it("scores a sitting against the SERVE MANIFEST, not the answer count", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse, completeSitting } = await import("@/lib/modules/history");
    const { companyId, template, item } = await fixture("scoring");

    // Served four items; answered one, correctly. Score is 1/4, not 1/1 —
    // otherwise abandoning hard items would inflate the score.
    const sitting = await prisma.moduleSitting.create({
      data: { companyId, templateId: template.id, servedItemIds: [item.id, "x2", "x3", "x4"] },
    });
    await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });

    const closed = await completeSitting(sitting.id);
    expect(closed.scoreRaw).toBe(1);
    expect(closed.scorePercent).toBe(25);
    expect(closed.status).toBe("COMPLETED");
  });

  it("records the item revision at answer time", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const { recordItemResponse } = await import("@/lib/modules/history");
    const { item, sitting } = await fixture("provenance");

    const before = await prisma.moduleItem.findUniqueOrThrow({ where: { id: item.id } });
    const response = await recordItemResponse({ sittingId: sitting.id, itemId: item.id, responseKey: "a" });
    expect(response.itemRevisionAt.getTime()).toBe(before.updatedAt.getTime());

    // Editing the item afterwards must not rewrite the stored provenance.
    await prisma.moduleItem.update({ where: { id: item.id }, data: { stem: "Edited stem" } });
    const stored = await prisma.itemResponse.findFirstOrThrow({ where: { sittingId: sitting.id, itemId: item.id } });
    expect(stored.itemRevisionAt.getTime()).toBe(before.updatedAt.getTime());
  });
});
