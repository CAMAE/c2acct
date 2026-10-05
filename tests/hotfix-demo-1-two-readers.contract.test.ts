import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildModuleHeatmap, readFirmModuleAnswers } from "@/lib/adminBriefingEngine";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

/**
 * hotfix-demo-1 (R59, 2026-10-05) change 8 (WRONG-ROW): the briefing's module
 * heatmap and ecosystem layer read the same numbers the ecosystem page reads.
 *   - firm module answers are stored flat ({ questionId: value }); the heatmap used
 *     to read a `responses` wrapper and showed 0/5 scored answers on every section;
 *   - the ecosystem layer's "assessed firms" is the vendor alignment bundle scoped
 *     to the ecosystem's firms (getVendorScopedFirms), not the unscoped pool that
 *     excludes demo firms.
 * The pure part always runs; the two-readers render runs against the database
 * when one is reachable (the local docker db or DATABASE_URL), otherwise skips.
 */
const ROOT = path.resolve(__dirname, "..");

type HeatmapModule = Parameters<typeof buildModuleHeatmap>[0][number];
type HeatmapSubmission = Parameters<typeof buildModuleHeatmap>[1][number];

function sliderQuestion(id: string, sectionKey: string, order: number): HeatmapModule["SurveyQuestion"][number] {
  return {
    id,
    key: `${sectionKey}_q${order}`,
    prompt: `Question ${order}`,
    inputType: "SLIDER",
    weight: 1,
    order,
    required: true,
    meta: { section: { key: sectionKey, title: `Section ${sectionKey}`, order: 1 }, slider: { min: 1, max: 5 } },
    SurveySection: null,
  };
}

describe("heatmap reader — flat firm module answers", () => {
  const strategyModule: HeatmapModule = {
    id: "m1",
    key: "firm_alignment_strategy_v1",
    title: "Strategy",
    SurveyQuestion: [sliderQuestion("q1", "a", 1), sliderQuestion("q2", "a", 2), sliderQuestion("q3", "b", 3), sliderQuestion("q4", "b", 4), sliderQuestion("q5", "b", 5)],
  };
  const flat = { q1: 5, q2: 3, q3: 4, q4: 2, "open-1": "A written follow-up answer." };
  const submission = (answers: unknown): HeatmapSubmission => ({ id: "s1", moduleId: "m1", score: 70, signalIntegrityScore: 1, createdAt: new Date("2026-09-30T00:00:00.000Z"), answers });

  it("reads the flat shape the firm module submit path writes, and still the wrapped shape", () => {
    expect(readFirmModuleAnswers(flat)).toEqual(flat);
    expect(readFirmModuleAnswers({ responses: { q1: 5 } })).toEqual({ q1: 5 });
    expect(readFirmModuleAnswers(null)).toEqual({});
    expect(readFirmModuleAnswers([1, 2])).toEqual({});
  });

  it("counts the scored answers per section while the module score exists (was 0/5 everywhere)", () => {
    const [item] = buildModuleHeatmap([strategyModule], [submission(flat)]);
    expect(item.canonicalScore).toBe(70);
    const bySection = Object.fromEntries(item.sectionScores.map((section) => [section.key, section]));
    expect(bySection.a.answeredCount).toBe(2);
    expect(bySection.a.questionCount).toBe(2);
    expect(bySection.b.answeredCount).toBe(2); // q5 unanswered
    expect(bySection.b.questionCount).toBe(3);
    expect(item.sectionScores.reduce((sum, section) => sum + section.answeredCount, 0)).toBe(4);
    // a wrapped payload (the vendor shape) reads the same way
    const [wrapped] = buildModuleHeatmap([strategyModule], [submission({ responses: flat })]);
    expect(wrapped.sectionScores.reduce((sum, section) => sum + section.answeredCount, 0)).toBe(4);
  });

  it("the ecosystem-scoped briefing reader exists and the ecosystem page preload is scoped the same way", () => {
    const ecosystem = readFileSync(path.join(ROOT, "lib/ecosystem.ts"), "utf8");
    expect(ecosystem).toContain("export async function getFirmBriefingInEcosystem(");
    expect((ecosystem.match(/buildFirmBriefingPreload\(firmIds, \{ vendorCompanyId(?:: input\.vendorCompanyId)? \}\)/g) || []).length).toBe(2);
    const engine = readFileSync(path.join(ROOT, "lib/adminBriefingEngine.ts"), "utf8");
    expect(engine).toContain("getVendorAlignmentInsightBundle(options?.vendorCompanyId ? { vendorCompanyId: options.vendorCompanyId } : undefined)");
    expect(engine).toContain("const answers = readFirmModuleAnswers(latestSubmission?.answers);");
  });
});

// ---- two readers, one database ----
function loadDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    try {
      const env = readFileSync(path.join(ROOT, file), "utf8");
      const line = env.split("\n").find((entry) => entry.startsWith("DATABASE_URL="));
      if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
    } catch {
      // next file
    }
  }
  return null;
}

const databaseUrl = loadDatabaseUrl();
if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl;

async function databaseReachable(): Promise<boolean> {
  if (!databaseUrl) return false;
  try {
    const { default: prisma } = await import("@/lib/prisma");
    await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000))]);
    return true;
  } catch {
    return false;
  }
}

const dbReady = await databaseReachable();

describe.skipIf(!dbReady)("two readers, one fixture — the briefing and the ecosystem page agree", () => {
  it(
    "module section answer counts and assessed-firm counts match",
    async () => {
      const { default: prisma } = await import("@/lib/prisma");
      const { getEcosystemDetailForVendorCompany, getFirmBriefingInEcosystem } = await import("@/lib/ecosystem");
      const { getVendorScopedFirms } = await import("@/lib/tenancy");
      const ecosystem = await prisma.ecosystem.findFirst({
        where: { vendorCompanyId: { not: null }, EcosystemFirm: { some: {} } },
        orderBy: { name: "asc" },
        select: { id: true, name: true, vendorCompanyId: true, VendorCompany: { select: { name: true } } },
      });
      if (!ecosystem?.vendorCompanyId) return; // no ecosystem seeded: nothing to compare
      const detail = await getEcosystemDetailForVendorCompany({
        ecosystemId: ecosystem.id,
        ecosystemName: ecosystem.name,
        vendorCompanyId: ecosystem.vendorCompanyId,
        vendorCompanyName: ecosystem.VendorCompany?.name ?? "Vendor",
      });
      expect(detail).not.toBeNull();
      const row = detail!.firmGrid.find((firm) => (firm.moduleCompletionPercent ?? 0) > 0) ?? detail!.firmGrid[0];
      expect(row).toBeDefined();
      const briefing = await getFirmBriefingInEcosystem({ companyId: row.firmCompanyId, vendorCompanyId: ecosystem.vendorCompanyId });
      expect(briefing).not.toBeNull();

      // assessed firms: the ecosystem layer counts the ecosystem's firms with a final module submission
      const firmIds = await getVendorScopedFirms(ecosystem.vendorCompanyId);
      expect(detail!.firmCount).toBe(firmIds.length);
      const finals = await prisma.surveySubmission.findMany({
        where: getSurveyFinalWhere({ companyId: { in: firmIds }, SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) } } }),
        select: { companyId: true },
      });
      const assessedFirms = new Set(finals.map((submission) => submission.companyId)).size;
      const ecosystemRow = briefing!.confidenceAppendix.find((entry) => entry.layer === "Ecosystem");
      expect(ecosystemRow?.sampleSize).toBe(assessedFirms);
      expect(ecosystemRow!.sampleSize).toBeLessThanOrEqual(detail!.firmCount);
      if (detail!.firmGrid.some((firm) => firm.fullyAssessed)) expect(ecosystemRow!.sampleSize).toBeGreaterThan(0);

      // module section answer counts: every scored module's sections sum to the submission's answered count
      for (const heatmapModule of briefing!.firmLayer.moduleHeatmap) {
        if (heatmapModule.canonicalScore === null) continue;
        const latest = await prisma.surveySubmission.findFirst({
          where: getSurveyFinalWhere({ companyId: row.firmCompanyId, SurveyModule: { key: heatmapModule.key } }),
          orderBy: { createdAt: "desc" },
          select: { answeredCount: true },
        });
        const answered = heatmapModule.sectionScores.reduce((sum, section) => sum + section.answeredCount, 0);
        expect(answered, `${heatmapModule.key} scored answers`).toBeGreaterThan(0);
        expect(answered, `${heatmapModule.key} vs submission.answeredCount`).toBe(latest?.answeredCount ?? -1);
      }
      if ((row.moduleCompletionPercent ?? 0) > 0) {
        expect(briefing!.firmLayer.moduleHeatmap.some((module) => module.sectionScores.some((section) => section.answeredCount > 0))).toBe(true);
      }
    },
    180_000
  );
});
