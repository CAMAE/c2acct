import { describe, expect, it } from "vitest";
import { DataBoundary } from "@prisma/client";
import { latestFinalPerFirm, distinctFirmCount } from "@/lib/assessmentCore";
import {
  computeBenchmarks,
  productMeans,
  productVotes,
  vendorCategoryContributorWeights,
  evaluateVendorCategorySuppression,
  type FirmProductReviewRow,
} from "@/lib/benchmarks";
import { computeProductAlignmentIndex } from "@/lib/productMaturity";
import { buildVendorCategoryPosition } from "@/lib/eliteInsightsV2";
import { FIRM_PRODUCT_MODULE_KEY, buildFirmProductQuestions } from "@/lib/firmPat";
import { firmInsightConfidenceForModules } from "@/lib/firmInsightEngine";
import { layerCompleteness } from "@/lib/adminBriefingEngine";
import { buildVendorProductQuestions, computeVendorAssessmentMetrics } from "@/lib/vendorPat";
import { maturityBandFor, SCORE_BANDS } from "@/lib/bandLexicon";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * enforce-core (R62): the code keeps the methodology page. Three pins for the
 * compute — the quarter cutoff (ruling 1), one firm one vote (ruling 2) and the
 * 25 percent dominance cap (ruling 3).
 */

const CUTOFF = new Date("2026-09-30T23:59:59.999Z");
const day = (iso: string) => new Date(iso);
const FIRM_MODULE = "firm_alignment_governance_v1";
const FIRM_PRODUCT_MODULE = FIRM_PRODUCT_MODULE_KEY;

type Row = {
  id: string;
  companyId: string;
  moduleKey: string;
  productId: string | null;
  score: number;
  scoreVersion: number;
  createdAt: Date;
  boundary: DataBoundary;
};

/** A client whose surveySubmission.findMany honours the predicates the compute sends. */
function fakeClient(rows: Row[], products: Array<{ id: string; companyId: string; category: string }>) {
  const runs: Array<{ metricKey: string; cohortKey: string; n: number; cutoff: Date }> = [];
  const cohorts = new Map<string, string>();
  const companyRows: Array<{ companyId: string; metricKey: string; score: number }> = [];
  const client = {
    benchmarkCohort: {
      findUnique: async ({ where }: { where: { key: string } }) => (cohorts.has(where.key) ? { id: cohorts.get(where.key) } : null),
      create: async ({ data }: { data: { id: string; key: string } }) => {
        cohorts.set(data.key, data.id);
        return { id: data.id };
      },
    },
    benchmarkRun: {
      upsert: async ({ where, create }: { where: { cohortId_metricKey_version: { cohortId: string; metricKey: string } }; create: { n: number; cutoff: Date } }) => {
        const cohortKey = [...cohorts.entries()].find(([, id]) => id === where.cohortId_metricKey_version.cohortId)?.[0] ?? "?";
        runs.push({ metricKey: where.cohortId_metricKey_version.metricKey, cohortKey, n: create.n, cutoff: create.cutoff });
      },
    },
    companyBenchmark: {
      upsert: async ({ create }: { create: { companyId: string; metricKey: string; score: number } }) => {
        companyRows.push({ companyId: create.companyId, metricKey: create.metricKey, score: create.score });
      },
    },
    companyBenchmarkCohort: { upsert: async () => undefined },
    product: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => products.filter((p) => where.id.in.includes(p.id)),
    },
    surveySubmission: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        const moduleWhere = where.SurveyModule as { key: string | { in: string[] } };
        const keys = typeof moduleWhere.key === "string" ? [moduleWhere.key] : moduleWhere.key.in;
        const boundaries = (where.Company as { is: { dataBoundary: { in: DataBoundary[] } } }).is.dataBoundary.in;
        const lte = (where.createdAt as { lte: Date }).lte;
        const gt = (where.scoreVersion as { gt: number }).gt;
        expect(lte).toBeInstanceOf(Date);
        return rows
          .filter((r) => keys.includes(r.moduleKey) && boundaries.includes(r.boundary) && r.scoreVersion > gt && r.createdAt <= lte)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((r) => ({
            companyId: r.companyId,
            score: r.score,
            createdAt: r.createdAt,
            SurveyModule: { key: r.moduleKey },
            Subject: { productId: r.productId },
          }));
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, runs, companyRows };
}

describe("ruling 1 — the quarter cutoff is enforced in compute and stored on the run", () => {
  it("a final dated one day after the cutoff is excluded; the run carries the cutoff", async () => {
    const rows: Row[] = [
      { id: "1", companyId: "firm-a", moduleKey: FIRM_MODULE, productId: null, score: 70, scoreVersion: 1, createdAt: day("2026-09-01T00:00:00Z"), boundary: DataBoundary.PRODUCTION },
      { id: "2", companyId: "firm-b", moduleKey: FIRM_MODULE, productId: null, score: 60, scoreVersion: 1, createdAt: day("2026-09-30T12:00:00Z"), boundary: DataBoundary.PRODUCTION },
      // one day after the cutoff: next quarter's cut, not this one
      { id: "3", companyId: "firm-c", moduleKey: FIRM_MODULE, productId: null, score: 90, scoreVersion: 1, createdAt: day("2026-10-01T12:00:00Z"), boundary: DataBoundary.PRODUCTION },
      // a draft never counts
      { id: "4", companyId: "firm-d", moduleKey: FIRM_MODULE, productId: null, score: 10, scoreVersion: 0, createdAt: day("2026-09-10T00:00:00Z"), boundary: DataBoundary.PRODUCTION },
    ];
    const { client, runs, companyRows } = fakeClient(rows, []);
    const result = await computeBenchmarks(client, { cutoff: CUTOFF });
    expect(result.cutoff).toEqual(CUTOFF);
    const governance = runs.find((r) => r.metricKey === FIRM_MODULE && r.cohortKey === "firm:real");
    expect(governance?.n).toBe(2);
    expect(governance?.cutoff).toEqual(CUTOFF);
    expect(companyRows.filter((r) => r.metricKey === FIRM_MODULE).map((r) => r.companyId).sort()).toEqual(["firm-a", "firm-b"]);
  });

  it("without an explicit cutoff the run uses the last instant of the current quarter", async () => {
    const { client, runs } = fakeClient([], []);
    const result = await computeBenchmarks(client);
    expect(result.cutoff.toISOString()).toMatch(/T23:59:59\.999Z$/);
    expect([2, 5, 8, 11]).toContain(result.cutoff.getUTCMonth());
    expect(runs).toHaveLength(0);
  });
});

describe("ruling 2 — one firm one vote", () => {
  const reviews: FirmProductReviewRow[] = [
    { companyId: "firm-a", productId: "p1", score: 40, createdAt: day("2026-07-01T00:00:00Z") },
    { companyId: "firm-a", productId: "p1", score: 80, createdAt: day("2026-09-01T00:00:00Z") },
    { companyId: "firm-b", productId: "p1", score: 60, createdAt: day("2026-08-01T00:00:00Z") },
  ];

  it("latestFinalPerFirm keeps the newest row per (firm, group)", () => {
    const votes = latestFinalPerFirm(reviews, { firmId: (r) => r.companyId, groupKey: (r) => r.productId, createdAt: (r) => r.createdAt });
    expect(votes.map((v) => `${v.companyId}:${v.score}`)).toEqual(["firm-a:80", "firm-b:60"]);
    expect(distinctFirmCount(votes, (r) => r.companyId)).toBe(2);
  });

  it("a firm with two finals contributes once, with the newer; assessmentCount counts distinct firms", () => {
    expect(productVotes(reviews).get("p1")).toHaveLength(2);
    const p1 = productMeans(reviews).get("p1");
    expect(p1?.firmCount).toBe(2);
    expect(p1?.mean).toBe(70); // (80 + 60) / 2, never (40 + 80 + 60) / 3
  });

  it("the compute's product average follows the vote, not the submission count", async () => {
    const rows: Row[] = reviews.map((r, i) => ({
      id: String(i),
      companyId: r.companyId,
      moduleKey: FIRM_PRODUCT_MODULE,
      productId: r.productId,
      score: r.score,
      scoreVersion: 1,
      createdAt: r.createdAt,
      boundary: DataBoundary.PRODUCTION,
    }));
    const { client, companyRows } = fakeClient(rows, [{ id: "p1", companyId: "vendor-x", category: "Tax" }]);
    await computeBenchmarks(client, { cutoff: CUTOFF });
    expect(companyRows.find((r) => r.metricKey === "Tax")?.score).toBe(70);
  });

  it("productMaturity's index reads the same vote", async () => {
    const client = {
      surveySubmission: {
        findMany: async () => reviews.map((r) => ({ companyId: r.companyId, score: r.score, createdAt: r.createdAt })),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await computeProductAlignmentIndex(client as any, "p1")).toBe(70);
  });
});

describe("ruling 3 — the 25 percent dominance cap on vendor category cohorts", () => {
  const products = [
    { id: "a1", companyId: "vendor-a", category: "Tax" },
    { id: "a2", companyId: "vendor-a", category: "Tax" },
    { id: "a3", companyId: "vendor-a", category: "Tax" },
    { id: "a4", companyId: "vendor-a", category: "Tax" },
    { id: "b1", companyId: "vendor-b", category: "Tax" },
    { id: "b2", companyId: "vendor-b", category: "Tax" },
    { id: "c1", companyId: "vendor-c", category: "Tax" },
    { id: "c2", companyId: "vendor-c", category: "Tax" },
    { id: "d1", companyId: "vendor-d", category: "Tax" },
    { id: "e1", companyId: "vendor-e", category: "Tax" },
  ];
  const reviews: FirmProductReviewRow[] = products.map((p, i) => ({
    companyId: `firm-${i}`,
    productId: p.id,
    score: 50 + i,
    createdAt: day("2026-09-01T00:00:00Z"),
  }));

  it("a five-vendor cohort where one vendor holds 40 percent of the reviewed products is suppressed", () => {
    const cohort = vendorCategoryContributorWeights(products, productMeans(reviews)).get("Tax");
    expect(cohort?.vendors).toHaveLength(5);
    expect(cohort?.weights.sort((a, b) => b - a)).toEqual([4, 2, 2, 1, 1]);
    const suppression = evaluateVendorCategorySuppression(cohort!.weights);
    expect(suppression.suppressed).toBe(true);
    expect(suppression.reason).toBe("contributor_dominance");
    expect(suppression.contributorCount).toBe(5);
    expect(suppression.maxContributorShare).toBeCloseTo(0.4, 5);
  });

  it("the Category Position reader withholds the category with the same label the count rule uses", async () => {
    const client = {
      benchmarkCohort: { findUnique: async () => ({ id: "cohort-v" }) },
      benchmarkRun: {
        findMany: async () => [{ metricKey: "Tax", n: 5, mean: 55, stdev: 3, p10: 50, p25: 52, p50: 55, p75: 58, p90: 59, cutoff: CUTOFF }],
      },
      companyBenchmark: { findMany: async () => [{ metricKey: "Tax", score: 59, percentile: 100 }] },
      product: { findMany: async () => products.map((p) => ({ ...p })) },
      surveySubmission: {
        findMany: async () => reviews.map((r) => ({ companyId: r.companyId, score: r.score, createdAt: r.createdAt, Subject: { productId: r.productId } })),
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const position = await buildVendorCategoryPosition(client as any, "vendor-e", DataBoundary.PRODUCTION);
    expect(position.available).toBe(true);
    expect(position.cutoffLabel).toBe("Sep 30, 2026");
    expect(position.categories[0]?.n).toBe(5);
    expect(position.categories[0]?.suppressed).toBe(true);
    expect(position.categories[0]?.suppressionReason).toBe("contributor_dominance");
    expect(position.topAction).toBeNull();
  });

  it("the same five vendors with one product each publish", () => {
    const even = products.filter((p) => p.id.endsWith("1"));
    const cohort = vendorCategoryContributorWeights(even, productMeans(reviews)).get("Tax");
    expect(evaluateVendorCategorySuppression(cohort!.weights).suppressed).toBe(false);
  });
});

describe("ruling 4 — one confidence table", () => {
  it("firmInsightEngine reads the shared table with n = scored modules; 5 of 5 is Early signal, as intended (the table says 6 for Grounded)", () => {
    expect(firmInsightConfidenceForModules(0).label).toBe("No signal");
    expect(firmInsightConfidenceForModules(1).label).toBe("Early signal");
    expect(firmInsightConfidenceForModules(5).label).toBe("Early signal");
    expect(firmInsightConfidenceForModules(5).band).toBe("emerging");
    expect(firmInsightConfidenceForModules(6).label).toBe("Grounded");
  });

  it("the briefing's coverage is a completeness flag that never produces a confidence word", () => {
    const partial = layerCompleteness(2, 5, "The firm layer");
    expect(partial.complete).toBe(false);
    expect(partial.summary).not.toMatch(/Early signal|Grounded|No signal|directional/);
    expect(layerCompleteness(5, 5, "The firm layer").complete).toBe(true);
    const engine = readFileSync(path.join(process.cwd(), "lib/adminBriefingEngine.ts"), "utf8");
    expect(engine).not.toContain('"directional"');
    expect(engine).toContain("confidenceBandForSampleSize");
    const board = readFileSync(path.join(process.cwd(), "app/components/admin/briefings/BriefingBoard.tsx"), "utf8");
    expect(board).toContain("{module.confidenceLabel}");
    expect(board).not.toContain("confidence {formatConfidence(module.confidenceScore)}");
  });
});

describe("ruling 5 — the coverage penalty is live", () => {
  it("a half-answered vendor assessment carries a coverage flag", () => {
    const utilityKeys = ["erp_gl_core_ledger"];
    const questions = buildVendorProductQuestions(utilityKeys);
    expect(questions.length).toBeGreaterThan(0);
    const half = Object.fromEntries(questions.slice(0, Math.ceil(questions.length / 2)).map((q, i) => [q.id, (i % 5) + 1]));
    const metrics = computeVendorAssessmentMetrics(half, questions.length);
    expect(metrics.integrity.flags).toContain("LOW_COVERAGE");
    expect(metrics.integrity.meta.coverage).toBeLessThan(0.6);
    expect(metrics.integrity.score).toBeLessThan(1);
    const full = Object.fromEntries(questions.map((q, i) => [q.id, (i % 5) + 1]));
    expect(computeVendorAssessmentMetrics(full, questions.length).integrity.flags).not.toContain("LOW_COVERAGE");
  });

  it("the firm product review runs evaluateSignalIntegrity instead of a hard-coded 1", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/firmPat.ts"), "utf8");
    const submit = source.slice(source.indexOf("export async function submitFirmProductAssessment"));
    expect(submit).toContain("evaluateSignalIntegrity(input.answers");
    expect(submit).toContain("signalIntegrityScore: integrity.score");
    expect(submit).not.toContain("signalIntegrityScore: 1,");
    expect(buildFirmProductQuestions(["erp_gl_core_ledger"]).length).toBeGreaterThan(0);
  });
});

describe("ruling 6 — firmMaturity's band table is retired", () => {
  it("the stored band is the one score-band lexicon", () => {
    expect(maturityBandFor(30)).toEqual({ tier: "EARLY", bandMin: SCORE_BANDS.early.min, bandMax: SCORE_BANDS.early.max });
    expect(maturityBandFor(70).tier).toBe("BUILDING");
    expect(maturityBandFor(95).tier).toBe("LEADING");
  });

  it("no EMERGING / FOUNDATIONAL / SCALING / ADVANCED band literal survives in lib, app or scripts", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          if (entry === "node_modules" || entry === "generated") continue;
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry)) {
          const text = readFileSync(full, "utf8");
          if (/"(EMERGING|FOUNDATIONAL|SCALING|ADVANCED)"/.test(text)) hits.push(path.relative(process.cwd(), full));
        }
      }
    };
    for (const dir of ["lib", "app", "scripts"]) walk(path.join(process.cwd(), dir));
    expect(hits).toEqual([]);
  });
});
