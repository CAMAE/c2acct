import prisma from "@/lib/prisma";
import {
  FIRM_BASELINE_MODULE_KEY,
  PRODUCT_BASELINE_MODULE_KEY,
} from "@/lib/intelligence/runtimeConfig";
import { PRODUCT_EXTERNAL_REVIEW_MODULE_KEY } from "@/lib/assessment-module-catalog";
import { buildTrustedExternalReviewWhere } from "@/lib/reviews/trustedExternalReview";

export type ChartGranularity = "monthly" | "quarterly" | "yearly";

type SelfSignalRow = {
  createdAt: Date;
  score: number;
  weightedAvg: number | null;
};

type ObservedSignalRow = {
  createdAt: Date;
  score: number | null;
  signalIntegrityScore: number | null;
};

export type InsightTrendPoint = {
  periodKey: string;
  label: string;
  selfScoreAvg: number | null;
  selfWeightedAvg: number | null;
  selfSubmissionCount: number;
  observedScoreAvg: number | null;
  observedIntegrityAvg: number | null;
  observedReviewCount: number;
  scoreGap: number | null;
};

export type InsightTrendSeries = {
  granularity: ChartGranularity;
  points: InsightTrendPoint[];
  hasEnoughHistory: boolean;
  note: string;
};

export type InsightTrendSeriesSet = Record<ChartGranularity, InsightTrendSeries>;

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getQuarter(monthIndex: number) {
  return Math.floor(monthIndex / 3) + 1;
}

function getPeriodKey(date: Date, granularity: ChartGranularity) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();

  if (granularity === "yearly") {
    return `${year}`;
  }

  if (granularity === "quarterly") {
    return `${year}-Q${getQuarter(month)}`;
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getPeriodLabel(periodKey: string, granularity: ChartGranularity) {
  if (granularity === "monthly") {
    const [year, month] = periodKey.split("-");
    return `${year}-${month}`;
  }

  return periodKey;
}

function buildSeries(granularity: ChartGranularity, selfRows: SelfSignalRow[], observedRows: ObservedSignalRow[]): InsightTrendSeries {
  const keys = new Set<string>();
  for (const row of selfRows) {
    keys.add(getPeriodKey(row.createdAt, granularity));
  }
  for (const row of observedRows) {
    keys.add(getPeriodKey(row.createdAt, granularity));
  }

  const sortedKeys = [...keys].sort((left, right) => left.localeCompare(right));
  const points = sortedKeys.map((periodKey) => {
    const selfMatches = selfRows.filter((row) => getPeriodKey(row.createdAt, granularity) === periodKey);
    const observedMatches = observedRows.filter((row) => getPeriodKey(row.createdAt, granularity) === periodKey);
    const selfScoreAvg = average(selfMatches.map((row) => row.score));
    const selfWeightedAvg = average(
      selfMatches.map((row) => row.weightedAvg).filter((value): value is number => typeof value === "number")
    );
    const observedScoreAvg = average(
      observedMatches.map((row) => row.score).filter((value): value is number => typeof value === "number")
    );
    const observedIntegrityAvg = average(
      observedMatches.map((row) => row.signalIntegrityScore).filter((value): value is number => typeof value === "number")
    );

    return {
      periodKey,
      label: getPeriodLabel(periodKey, granularity),
      selfScoreAvg: selfScoreAvg === null ? null : Math.round(selfScoreAvg * 10) / 10,
      selfWeightedAvg: selfWeightedAvg === null ? null : Math.round(selfWeightedAvg * 100) / 100,
      selfSubmissionCount: selfMatches.length,
      observedScoreAvg: observedScoreAvg === null ? null : Math.round(observedScoreAvg * 10) / 10,
      observedIntegrityAvg: observedIntegrityAvg === null ? null : Math.round(observedIntegrityAvg * 100) / 100,
      observedReviewCount: observedMatches.length,
      scoreGap:
        selfScoreAvg === null || observedScoreAvg === null
          ? null
          : Math.round((selfScoreAvg - observedScoreAvg) * 10) / 10,
    };
  });

  return {
    granularity,
    points,
    hasEnoughHistory: points.length >= 2,
    note:
      points.length === 0
        ? "No persisted history is available for this scope yet."
        : points.length === 1
          ? "Only one persisted period is available. The charts are truthful but trend interpretation is still thin."
          : "Trend charts are derived only from persisted survey and trusted observed-review rows.",
  };
}

export async function getInsightTrendSeries(input: {
  companyId: string;
  productId: string | null;
}): Promise<InsightTrendSeriesSet> {
  const selfModuleKey = input.productId ? PRODUCT_BASELINE_MODULE_KEY : FIRM_BASELINE_MODULE_KEY;
  const selfModule = await prisma.surveyModule.findUnique({
    where: { key: selfModuleKey },
    select: { id: true },
  });

  const selfRows = selfModule
    ? await prisma.surveySubmission.findMany({
        where: {
          companyId: input.companyId,
          productId: input.productId,
          moduleId: selfModule.id,
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          score: true,
          weightedAvg: true,
        },
      })
    : [];

  let observedRows: ObservedSignalRow[] = [];

  if (input.productId) {
    const observedModule = await prisma.surveyModule.findUnique({
      where: { key: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY },
      select: { id: true },
    });

    if (observedModule) {
      observedRows = await prisma.externalReviewSubmission.findMany({
        where: buildTrustedExternalReviewWhere({
          moduleId: observedModule.id,
          subjectCompanyId: input.companyId,
          subjectProductId: input.productId,
        }),
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          score: true,
          signalIntegrityScore: true,
        },
      });
    }
  }

  return {
    monthly: buildSeries("monthly", selfRows, observedRows),
    quarterly: buildSeries("quarterly", selfRows, observedRows),
    yearly: buildSeries("yearly", selfRows, observedRows),
  };
}
