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
import { DIVERGENCE_ALIGNED_WITHIN, DIVERGENCE_FLAGGED_AT, benchmarkCutoffLabel, divergenceState, storedCutoffPhrase } from "@/lib/assessmentCore";
import { buildFirmPeerPosition } from "@/lib/eliteInsightsV2";
import type { FirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { METHODOLOGY_CHANGELOG, METHODOLOGY_SECTIONS, METHODOLOGY_VERSION } from "@/lib/methodology";
import { quartileOf } from "@/lib/eliteInsightsV2";
import { quartileWord } from "@/lib/lexicon";
import { FIRM_PILLARS } from "@/lib/firmPillars";
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

describe("ruling 21 — one divergence constant pair, matching the methodology page", () => {
  it("gaps 4, 5, 9, 10, 15 read aligned, aligned, watch, flagged, flagged", () => {
    expect([4, 5, 9, 10, 15].map((gap) => divergenceState(gap))).toEqual(["aligned", "aligned", "watch", "flagged", "flagged"]);
    expect([-4, -5, -9, -10, -15].map((gap) => divergenceState(gap))).toEqual(["aligned", "aligned", "watch", "flagged", "flagged"]);
    expect(divergenceState(null)).toBeNull();
    expect(DIVERGENCE_ALIGNED_WITHIN).toBe(5);
    expect(DIVERGENCE_FLAGGED_AT).toBe(10);
  });

  it("the engines import the pair and the methodology text names it", () => {
    for (const rel of ["lib/vendorProductInsightEngine.ts", "lib/alignmentBoard.ts", "lib/adminBriefingEngine.ts"]) {
      const source = readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(source, rel).toContain('from "@/lib/assessmentCore"');
      expect(source, rel).not.toMatch(/Math\.abs\([^)]*\) >= 15/);
      expect(source, rel).not.toMatch(/Math\.abs\(points\) < 5/);
    }
    const text = METHODOLOGY_SECTIONS.find((s) => s.key === "divergence")?.paragraphs.join(" ") ?? "";
    expect(text).toContain(`within ${DIVERGENCE_ALIGNED_WITHIN} points`);
    expect(text).toContain(`${DIVERGENCE_FLAGGED_AT} points or more`);
  });
});

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("walk V-new — quartile words follow the percentile the card shows", () => {
  /** The card's percentile for rank r of n with distinct scores: % of the cohort at or below (lib/benchmarks.percentileRank). */
  const percentileForRank = (rank: number, n: number) => Math.round(((n - rank + 1) / n) * 100);
  const wordFor = (rank: number, n: number) => quartileWord(quartileOf(percentileForRank(rank, n)));

  it("1 of 13 is top quartile and 13 of 13 is bottom quartile", () => {
    expect(wordFor(1, 13)).toBe("top quartile");
    expect(wordFor(13, 13)).toBe("bottom quartile");
  });

  it("the box's fixtures: 4 of 13 top quartile, 13 of 13 bottom quartile, 6 of 8 lower middle", () => {
    expect(wordFor(4, 13)).toBe("top quartile"); // 77th percentile
    expect(wordFor(6, 8)).toBe("lower middle"); // 38th percentile
  });

  it("7 of 13 sits at the 54th percentile and reads upper middle (the box said lower middle; ruling for Cam, see the report)", () => {
    expect(percentileForRank(7, 13)).toBe(54);
    expect(wordFor(7, 13)).toBe("upper middle");
  });

  it("the Category Position card derives the word from the quartile of the shown percentile", () => {
    const card = read("app/components/insights/elite/VendorCategoryPositionCard.tsx");
    expect(card).toContain("quartileWord(cat.quartile");
    expect(read("lib/eliteInsightsV2.ts")).toContain("quartile: quartileOf(r.percentile ?? 0)");
  });
});

describe("ruling 32 (minimum) — methodology 1.4 and the evidence floor", () => {
  const FLOOR = "the evidence floor (five contributing firms, no firm above 25 percent, structured consistent with the former 1996 DOJ/FTC safety zone, withdrawn in 2023)";

  it("METHODOLOGY_VERSION is 1.4 with the one changelog line", () => {
    expect(METHODOLOGY_VERSION).toBe("1.4");
    expect(METHODOLOGY_CHANGELOG[0]?.version).toBe("1.4");
    expect(METHODOLOGY_CHANGELOG[0]?.summary).toBe(
      "1.4: cutoff, one firm one vote and the 25 percent cap are enforced in compute; one confidence table; coverage penalty active; divergence aligned under 5 and flagged at 10; anchors per bank; firmMaturity bands retired."
    );
  });

  it("safe harbor is gone from the methodology and the Category Position page; the evidence floor phrase is there", () => {
    const methodology = read("lib/methodology.ts");
    const page = read("app/(app)/vendor/alignment-insights/[key]/page.tsx");
    const card = read("app/components/insights/elite/VendorCategoryPositionCard.tsx");
    for (const [rel, text] of [["lib/methodology.ts", methodology], ["category page", page], ["category card", card]] as const) {
      expect(text, rel).not.toMatch(/safe[- ]harbor/i);
    }
    expect(methodology).toContain(FLOOR);
    expect(page).toContain(FLOOR);
    expect(card).toContain(FLOOR);
    const suppression = METHODOLOGY_SECTIONS.find((s) => s.key === "suppression");
    expect(suppression?.title).toBe("Benchmark suppression — the evidence floor");
  });
});

describe("walk fixes (item 11)", () => {
  it("11a: the heatmap caption reads 'Module scores stay separate from confidence' and the board is in the copy scan", () => {
    const board = read("app/components/admin/briefings/BriefingBoard.tsx");
    expect(board).toContain('description="Module scores stay separate from confidence. Section values show evidence clusters inside each module."');
    expect(board).not.toContain("Canonical firm module scores stay separate");
    expect(read("tests/helpers/copyScan.ts")).toContain('"app/components/admin/briefings/BriefingBoard.tsx"');
  });

  it("11b: the person-level tile, the People assessed count, the person-level summary and the Individual risk row follow the individual flag on the portal briefing", () => {
    const board = read("app/components/admin/briefings/BriefingBoard.tsx");
    const portal = board.slice(board.indexOf("export function PortalBriefingView("));
    expect(portal).toContain("individualSurfacesEnabled ? briefing.risks : briefing.risks.filter((item) => item.layer !== \"individual\")");
    expect(portal).toContain("<LayerSummariesPanel briefing={briefing} individualSurfacesEnabled={individualSurfacesEnabled} />");
    expect(portal).toContain('voice="portal" individualSurfacesEnabled={individualSurfacesEnabled}');
    expect(board).toMatch(/\{individualSurfacesEnabled \? \(\s*<AdminMetricCard\s*label="People assessed"/);
    expect(board).toMatch(/\{individualSurfacesEnabled \? \(\s*<div[^>]*>\s*<div[^>]*>Person-level layer<\/div>/);
    // the admin view keeps every piece (default true)
    expect(board).toContain("individualSurfacesEnabled = true,");
  });

  it("11c: the hub radar and the home radar read lib/firmPillars' words", () => {
    expect(read("lib/firmWorkspaceDashboard.ts")).toContain("pillarForModule(moduleKey)");
    expect(read("lib/firmWorkspaceDashboard.ts")).not.toContain("title.split(");
    const figure = read("app/components/frontdoor/V7RadarFigure.tsx");
    expect(figure).toContain('import { FIRM_PILLARS } from "@/lib/firmPillars"');
    expect(figure).toContain("{FIRM_PILLARS.map((pillar, index) => (");
    const door = read("app/components/frontdoor/V7FrontDoor.tsx");
    expect(door).toContain("const [STRATEGY, OPERATIONS, AUTOMATION, INTEGRATION, GOVERNANCE] = FIRM_PILLARS;");
    expect(FIRM_PILLARS).toEqual(["Strategy", "Operations", "Automation", "Integration", "Governance"]);
  });

  it("11d: Gap-to-Top-Quartile Plan is Gap Plan everywhere a reader sees it", () => {
    for (const rel of ["app/(app)/firm/insights/[key]/page.tsx", "lib/insightContent.ts", "lib/eliteInsightsV2.ts"]) {
      expect(read(rel), rel).not.toContain("Gap-to-Top-Quartile");
    }
    expect(read("app/(app)/firm/insights/[key]/page.tsx")).toContain('title="Gap Plan"');
  });

  it("11e: the Guide and Enterprise ecosystem pages render vendor follow-up picks only behind PAT_ENABLE_VENDOR_FOLLOWUP_MC", () => {
    for (const rel of ["app/(app)/consultants/ecosystems/[ecosystemId]/page.tsx", "app/(app)/enterprise/ecosystems/[ecosystemId]/page.tsx"]) {
      const page = read(rel);
      expect(page, rel).toContain("const vendorFollowUpMcEnabled = isVendorFollowUpMcEnabled();");
      expect(page, rel).toContain("vendorFollowUpMcEnabled ? await getVendorFollowUpAggregate(");
      expect(page, rel).toContain("{vendorFollowUpMcEnabled && vendorFollowUpAggregate ? (");
    }
    expect(read("lib/vendorFollowUpMc.ts")).toContain('env[PAT_VENDOR_FOLLOWUP_MC_FLAG_ENV] === "1"');
  });
});

describe("ruling 1 (deploy-night fix) — the quarterly benchmark page and the Peer Position card show ONE cutoff, the stored run's", () => {
  const ALIGNMENT_INDEX = "alignment_index";
  const STORED = new Date("2026-09-30T23:59:59.999Z");

  /** A benchmark reader whose single run carries the stored cutoff. */
  function peerClient(cutoff: Date | null) {
    return {
      benchmarkCohort: { findUnique: async () => ({ id: "cohort-1" }) },
      benchmarkRun: {
        findMany: async () => [
          { metricKey: ALIGNMENT_INDEX, n: 12, mean: 66, stdev: 8, p10: 50, p25: 58, p50: 66, p75: 74, p90: 82, cutoff },
        ],
      },
      companyBenchmark: {
        findMany: async (args: { distinct?: string[] }) =>
          args.distinct
            ? Array.from({ length: 12 }, (_, i) => ({ companyId: `firm-${i}` }))
            : [{ metricKey: ALIGNMENT_INDEX, score: 70, percentile: 60 }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }
  const signal: FirmAlignmentSignal = { moduleScores: new Map(), alignmentIndex: 70 };

  it("the firm reader carries the stored run's cutoff, and the one phrase renders it", async () => {
    const peer = await buildFirmPeerPosition(peerClient(STORED), "firm-0", "DEMO" as never, signal);
    expect(peer.available).toBe(true);
    expect(peer.cutoffLabel).toBe("Sep 30, 2026");
    expect(storedCutoffPhrase(peer.cutoffLabel)).toBe("Assessments completed by Sep 30, 2026");
  });

  it("a run written before the cutoff column says so instead of inventing a quarter", async () => {
    const peer = await buildFirmPeerPosition(peerClient(null), "firm-0", "DEMO" as never, signal);
    expect(peer.cutoffLabel).toBeNull();
    expect(storedCutoffPhrase(peer.cutoffLabel)).toBe("Not recorded on this run");
  });

  it("the page and the card render the SAME phrase from the SAME helper, so they cannot drift", () => {
    const page = read("app/(app)/firm/benchmark/page.tsx");
    const card = read("app/components/insights/elite/FirmPeerPositionCard.tsx");
    const vendorCard = read("app/components/insights/elite/VendorCategoryPositionCard.tsx");
    for (const [rel, source] of [["page", page], ["card", card], ["vendor card", vendorCard]] as const) {
      expect(source, rel).toContain('from "@/lib/assessmentCore"');
      expect(source, rel).toContain("storedCutoffPhrase(");
    }
    // the page's shown-cut labels read the stored run; the card reads the same field
    expect(page).toContain("storedCutoffPhrase(peer.cutoffLabel)");
    expect(card).toContain("storedCutoffPhrase(data.cutoffLabel)");
    expect(page).toContain("cut of ${peer.cutoffLabel}");
    // the mislabel this fix removes: the SHOWN cut was named from a live quarter computation
    expect(page).not.toContain("Cutoff {meta.cutoffLabel}");
    expect(page).not.toContain("${meta.quarterLabel} cohort distribution by module`} />");
    // the forward-looking NEXT cutoff still comes from the artifact meta, clearly labelled
    expect(page).toContain("Next cutoff {meta.cutoffLabel}");
    expect(page).toContain("meta.cutoffSentence");
  });

  it("the cut-label helpers are defined exactly once, in the pure module both surfaces import", () => {
    const core = read("lib/assessmentCore.ts");
    expect(core).toContain("export function benchmarkCutoffLabel");
    expect(core).toContain("export function storedCutoffPhrase");
    expect(benchmarkCutoffLabel(STORED)).toBe("Sep 30, 2026");
    expect(benchmarkCutoffLabel(null)).toBeNull();
    for (const rel of ["lib/eliteInsightsV2.ts", "app/(app)/firm/benchmark/page.tsx"]) {
      expect(read(rel), rel).not.toMatch(/export function benchmarkCutoffLabel|export function storedCutoffPhrase/);
    }
  });
});
