import prisma from "@/lib/prisma";
import { FIRM_MODULE_DEFINITIONS, FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { VENDOR_PRODUCT_MODULE_KEY } from "@/lib/vendorPat";
import { CUSTOMER_FACING_BOUNDARIES } from "@/lib/dataBoundary";
import type { DataBoundary } from "@prisma/client";
import { DIVERGENCE_MIN_FIRM_REVIEWS } from "@/lib/vendorProductInsightEngine";

// Data-integrity wall (CLASS 1): the platform picture is the REAL (+pilot)
// number — demo/synthetic companies are excluded from every count and average.
// (Operator-only; an explicit demo/all cut would have to be labelled.)
const REAL_POOL = { dataBoundary: { in: [...CUSTOMER_FACING_BOUNDARIES] } };

export type PlatformPicture = {
  firmCount: number;
  vendorCount: number;
  /** Final firm alignment-module submissions across all firms. */
  firmModuleSubmissionCount: number;
  /** Final product assessments: vendor self-assessments + firm product reviews. */
  productAssessmentCount: number;
  /** Average of per-firm alignment indexes (latest final score per module, averaged per firm, then across firms). */
  averageAlignmentIndex: number | null;
  /** Firms contributing to the average. */
  scoredFirmCount: number;
  /** Products where |vendor self-reported − avg firm-reviewed| > 10 points. */
  hotDivergenceCount: number;
};

const HOT_DIVERGENCE_THRESHOLD = 10;

export type PlatformFirmLeagueRow = {
  companyId: string;
  companyName: string;
  alignmentIndex: number;
  scoredModuleCount: number;
};

export type PlatformHotDivergenceRow = {
  productId: string;
  productName: string;
  vendorName: string;
  vendorScore: number;
  firmAverage: number;
  gap: number;
  reviewCount: number;
};

export type PlatformReportData = {
  picture: PlatformPicture;
  /** All scored firms ranked by alignment index, lowest first (needs-attention order). */
  firmLeague: PlatformFirmLeagueRow[];
  /** Products with a >10-pt vendor/firm gap, widest first. */
  hotDivergences: PlatformHotDivergenceRow[];
};

/**
 * One query module for the /admin "Platform picture" band. Reads the same
 * final-submission evidence the portal pages use — no derived tables.
 */
export async function getPlatformPicture(): Promise<PlatformPicture> {
  const firmModuleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);

  const [firmCount, vendorCount, firmModuleSubmissions, productSubmissions] = await Promise.all([
    prisma.company.count({ where: { type: "FIRM", ...REAL_POOL } }),
    prisma.company.count({ where: { type: "VENDOR", ...REAL_POOL } }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: firmModuleKeys } },
        Company: { is: REAL_POOL },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        moduleId: true,
        score: true,
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: [VENDOR_PRODUCT_MODULE_KEY, FIRM_PRODUCT_MODULE_KEY] } },
        Subject: { productId: { not: null } },
        Company: { is: REAL_POOL },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        score: true,
        SurveyModule: { select: { key: true } },
        Subject: { select: { productId: true } },
      },
    }),
  ]);

  // Latest final score per (firm, module) -> firm alignment index -> platform average.
  const latestByFirmModule = new Map<string, number>();
  for (const submission of firmModuleSubmissions) {
    if (!submission.companyId || typeof submission.score !== "number") continue;
    const key = `${submission.companyId}:${submission.moduleId}`;
    if (!latestByFirmModule.has(key)) {
      latestByFirmModule.set(key, submission.score);
    }
  }
  const scoresByFirm = new Map<string, number[]>();
  for (const [key, score] of latestByFirmModule) {
    const companyId = key.slice(0, key.lastIndexOf(":"));
    const list = scoresByFirm.get(companyId) ?? [];
    list.push(score);
    scoresByFirm.set(companyId, list);
  }
  const firmIndexes = Array.from(scoresByFirm.values()).map(
    (scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length
  );
  const averageAlignmentIndex = firmIndexes.length
    ? Math.round(firmIndexes.reduce((sum, index) => sum + index, 0) / firmIndexes.length)
    : null;

  // Hot divergences: latest vendor self-reported score vs avg firm-reviewed score per product.
  const latestVendorScoreByProduct = new Map<string, number>();
  const firmReviewScoresByProduct = new Map<string, number[]>();
  for (const submission of productSubmissions) {
    const productId = submission.Subject?.productId;
    if (!productId || typeof submission.score !== "number") continue;
    if (submission.SurveyModule?.key === VENDOR_PRODUCT_MODULE_KEY) {
      if (!latestVendorScoreByProduct.has(productId)) {
        latestVendorScoreByProduct.set(productId, submission.score);
      }
    } else {
      const list = firmReviewScoresByProduct.get(productId) ?? [];
      list.push(submission.score);
      firmReviewScoresByProduct.set(productId, list);
    }
  }
  let hotDivergenceCount = 0;
  for (const [productId, vendorScore] of latestVendorScoreByProduct) {
    const firmScores = firmReviewScoresByProduct.get(productId);
    // Divergence sample floor (CLASS 2): a single reviewer is an anecdote.
    if (!firmScores || firmScores.length < DIVERGENCE_MIN_FIRM_REVIEWS) continue;
    const firmAverage = firmScores.reduce((sum, score) => sum + score, 0) / firmScores.length;
    if (Math.abs(vendorScore - firmAverage) > HOT_DIVERGENCE_THRESHOLD) {
      hotDivergenceCount += 1;
    }
  }

  return {
    firmCount,
    vendorCount,
    firmModuleSubmissionCount: firmModuleSubmissions.length,
    productAssessmentCount: productSubmissions.length,
    averageAlignmentIndex,
    scoredFirmCount: firmIndexes.length,
    hotDivergenceCount,
  };
}

export type PeerModuleAverage = {
  moduleKey: string;
  title: string;
  /** Cross-firm mean of the latest final score per firm for this module (0–100). */
  averageScore: number | null;
  /** Distinct firms contributing (one latest score each) — the benchmark contributor count. */
  contributorCount: number;
};

export type PeerBenchmark = {
  /** Mean of per-firm alignment indexes across the pool (0–100). */
  overallAverageIndex: number | null;
  /** Distinct firms behind the overall index — the suppression contributor count. */
  overallContributorCount: number;
  modules: PeerModuleAverage[];
};

/**
 * Viewer-scoped peer benchmark (Elite firm surface F2). `boundaries` is the
 * viewer's pool from `poolForViewerBoundary` — a real firm benchmarks against
 * REAL+PILOT, a demo firm against DEMO — so demo rows never leak into a real
 * pool and the demo environment still shows a populated benchmark. One-firm-one-
 * vote: the latest final score per (firm, module) is averaged across firms;
 * `contributorCount` feeds the Governance Phase 2 minimum-n suppression rule.
 */
export async function getPeerBenchmark(boundaries: DataBoundary[]): Promise<PeerBenchmark> {
  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { key: { in: FIRM_MODULE_DEFINITIONS.map((module) => module.key) } },
      Company: { is: { dataBoundary: { in: boundaries } } },
    }),
    orderBy: { createdAt: "desc" },
    select: { companyId: true, score: true, SurveyModule: { select: { key: true } } },
  });

  // Latest final score per (firm, moduleKey) — one vote per firm per module.
  const latestByFirmModule = new Map<string, number>();
  for (const submission of submissions) {
    const moduleKey = submission.SurveyModule?.key;
    if (!submission.companyId || !moduleKey || typeof submission.score !== "number") continue;
    const key = `${submission.companyId}::${moduleKey}`;
    if (!latestByFirmModule.has(key)) latestByFirmModule.set(key, submission.score);
  }

  const scoresByModule = new Map<string, number[]>();
  const scoresByFirm = new Map<string, number[]>();
  for (const [key, score] of latestByFirmModule) {
    const sep = key.lastIndexOf("::");
    const companyId = key.slice(0, sep);
    const moduleKey = key.slice(sep + 2);
    (scoresByModule.get(moduleKey) ?? scoresByModule.set(moduleKey, []).get(moduleKey)!).push(score);
    (scoresByFirm.get(companyId) ?? scoresByFirm.set(companyId, []).get(companyId)!).push(score);
  }

  const firmIndexes = Array.from(scoresByFirm.values()).map(
    (scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length
  );

  return {
    overallAverageIndex: firmIndexes.length
      ? Math.round(firmIndexes.reduce((sum, index) => sum + index, 0) / firmIndexes.length)
      : null,
    overallContributorCount: firmIndexes.length,
    modules: FIRM_MODULE_DEFINITIONS.map((module) => {
      const scores = scoresByModule.get(module.key) ?? [];
      return {
        moduleKey: module.key,
        title: module.title,
        averageScore: scores.length
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
          : null,
        contributorCount: scores.length,
      };
    }),
  };
}

export type PlatformProductBenchmark = {
  /** Mean of all firm-reviewed product scores across the pool (0–100). */
  marketAverage: number | null;
  /** Distinct firms that reviewed any product — the suppression contributor count. */
  contributorCount: number;
};

/**
 * Viewer-scoped market benchmark for firm-reviewed products (Elite vendor surface
 * V1). Mean of every firm's firm-reviewed product score over the viewer's pool,
 * with the distinct-firm contributor count that feeds minimum-n suppression.
 */
export async function getPlatformProductBenchmark(boundaries: DataBoundary[]): Promise<PlatformProductBenchmark> {
  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { key: FIRM_PRODUCT_MODULE_KEY },
      Subject: { productId: { not: null } },
      Company: { is: { dataBoundary: { in: boundaries } } },
    }),
    select: { companyId: true, score: true },
  });
  const scores: number[] = [];
  const firms = new Set<string>();
  for (const submission of submissions) {
    if (typeof submission.score !== "number") continue;
    scores.push(submission.score);
    if (submission.companyId) firms.add(submission.companyId);
  }
  return {
    marketAverage: scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : null,
    contributorCount: firms.size,
  };
}

/**
 * Report-grade detail behind the Platform picture: the same evidence plus
 * names, the per-firm league table, and the per-product divergence rows.
 * Used by the /admin/reports print routes.
 */
export async function getPlatformReportData(): Promise<PlatformReportData> {
  const firmModuleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);

  const [picture, firmModuleSubmissions, productSubmissions, firms, products] = await Promise.all([
    getPlatformPicture(),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: firmModuleKeys } },
        Company: { is: REAL_POOL },
      }),
      orderBy: { createdAt: "desc" },
      select: { companyId: true, moduleId: true, score: true },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: [VENDOR_PRODUCT_MODULE_KEY, FIRM_PRODUCT_MODULE_KEY] } },
        Subject: { productId: { not: null } },
        Company: { is: REAL_POOL },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        score: true,
        SurveyModule: { select: { key: true } },
        Subject: { select: { productId: true } },
      },
    }),
    prisma.company.findMany({
      where: { type: "FIRM", ...REAL_POOL },
      select: { id: true, name: true },
    }),
    // Products scoped to real (+pilot) vendors — demo vendor products never
    // appear in the operator divergence table.
    prisma.product.findMany({
      where: { Company: { is: REAL_POOL } },
      select: { id: true, name: true, Company: { select: { name: true } } },
    }),
  ]);

  const firmNameById = new Map(firms.map((firm) => [firm.id, firm.name]));
  const latestByFirmModule = new Map<string, number>();
  for (const submission of firmModuleSubmissions) {
    if (!submission.companyId || typeof submission.score !== "number") continue;
    const key = `${submission.companyId}:${submission.moduleId}`;
    if (!latestByFirmModule.has(key)) {
      latestByFirmModule.set(key, submission.score);
    }
  }
  const scoresByFirm = new Map<string, number[]>();
  for (const [key, score] of latestByFirmModule) {
    const companyId = key.slice(0, key.lastIndexOf(":"));
    if (!firmNameById.has(companyId)) continue;
    const list = scoresByFirm.get(companyId) ?? [];
    list.push(score);
    scoresByFirm.set(companyId, list);
  }
  const firmLeague = Array.from(scoresByFirm.entries())
    .map(([companyId, scores]) => ({
      companyId,
      companyName: firmNameById.get(companyId) ?? companyId,
      alignmentIndex: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      scoredModuleCount: scores.length,
    }))
    .sort((left, right) => left.alignmentIndex - right.alignmentIndex);

  const productById = new Map(products.map((product) => [product.id, product]));
  const latestVendorScoreByProduct = new Map<string, number>();
  const firmReviewScoresByProduct = new Map<string, number[]>();
  for (const submission of productSubmissions) {
    const productId = submission.Subject?.productId;
    if (!productId || typeof submission.score !== "number") continue;
    if (submission.SurveyModule?.key === VENDOR_PRODUCT_MODULE_KEY) {
      if (!latestVendorScoreByProduct.has(productId)) {
        latestVendorScoreByProduct.set(productId, submission.score);
      }
    } else {
      const list = firmReviewScoresByProduct.get(productId) ?? [];
      list.push(submission.score);
      firmReviewScoresByProduct.set(productId, list);
    }
  }
  const hotDivergences: PlatformHotDivergenceRow[] = [];
  for (const [productId, vendorScore] of latestVendorScoreByProduct) {
    const firmScores = firmReviewScoresByProduct.get(productId);
    // Divergence sample floor (CLASS 2): need ≥ N firm reviews to assert a gap.
    if (!firmScores || firmScores.length < DIVERGENCE_MIN_FIRM_REVIEWS) continue;
    const firmAverage = firmScores.reduce((sum, score) => sum + score, 0) / firmScores.length;
    const gap = Math.round(Math.abs(vendorScore - firmAverage) * 10) / 10;
    if (gap <= HOT_DIVERGENCE_THRESHOLD) continue;
    const product = productById.get(productId);
    hotDivergences.push({
      productId,
      productName: product?.name ?? productId,
      vendorName: product?.Company?.name ?? "Unknown vendor",
      vendorScore: Math.round(vendorScore),
      firmAverage: Math.round(firmAverage * 10) / 10,
      gap,
      reviewCount: firmScores.length,
    });
  }
  hotDivergences.sort((left, right) => right.gap - left.gap);

  return { picture, firmLeague, hotDivergences };
}
