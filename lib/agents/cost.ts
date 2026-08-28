import prisma from "@/lib/prisma";
import { rateForModel, startOfDay } from "./costRates";

/**
 * Agent cost accounting (S3) — the database half.
 *
 * The rate card and the pure arithmetic live in ./costRates.ts and are
 * re-exported here so every existing import keeps working. They moved because a
 * caller that only needs to price a call must not inherit a Prisma client; see
 * that file's docblock for the case that forced it.
 */
export {
  FALLBACK_RATE,
  MODEL_RATES,
  estimateCostUsd,
  rateForModel,
  startOfDay,
  usageFromTokens,
  type ModelRate,
} from "./costRates";

// Re-exported above for import compatibility; referenced here so the
// value imports are not elided as unused.
void rateForModel;
void startOfDay;

/**
 * Global daily spend ceiling across every agent. Conservative by default —
 * this is a backstop against a runaway loop, not a budget to be spent, so the
 * default is set low enough that tripping it is a surprise worth investigating.
 */
export const DAILY_COST_CAP_USD = Number(process.env.PAT_AGENT_DAILY_COST_CAP_USD ?? 5);

/** Total estUsd across every agent run started today. */
export async function dailyCostUsd(now = new Date()): Promise<number> {
  const runs = await prisma.agentRun.findMany({
    where: { startedAt: { gte: startOfDay(now) } },
    select: { estCostUsd: true },
  });
  return runs.reduce((total, run) => total + Number(run.estCostUsd ?? 0), 0);
}

export interface DailyCapVerdict {
  exceeded: boolean;
  spentUsd: number;
  capUsd: number;
}

/**
 * Whether scheduling must be suspended. Checked before each scheduled fire and
 * before each claimed trigger, so an overspend stops new work rather than
 * merely being reported after the fact.
 */
export async function checkDailyCap(
  capUsd = DAILY_COST_CAP_USD,
  now = new Date()
): Promise<DailyCapVerdict> {
  const spentUsd = await dailyCostUsd(now);
  return { exceeded: spentUsd >= capUsd, spentUsd, capUsd };
}
