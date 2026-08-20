import prisma from "@/lib/prisma";
import type { TokenUsage } from "./types";

/**
 * Real cost accounting for agent runs (S3).
 *
 * Before this, `max_budget_usd` was config fiction: `recordCost` only accrued
 * when a caller volunteered a `costUsd`, nothing ever did, so the accumulator
 * sat at 0 and the cap could not trip. Cost is now DERIVED from the token counts
 * the Anthropic SDK already returns, using the published per-model rates below.
 *
 * Two caps sit on top of it:
 *   - per-run `limits.max_budget_usd`, enforced in budget.ts;
 *   - a global daily ceiling enforced here, which suspends scheduling entirely.
 *     The daily cap is the backstop for the failure the per-run cap cannot see:
 *     a cheap agent on a fast cadence, or a fleet of agents each individually
 *     under budget.
 */

/** USD per 1M tokens, Anthropic first-party API list rates. */
export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
}

/**
 * Rate card. Deliberately list price, not promotional price — billing early is
 * a smaller failure than billing late, and an intro rate that lapses would
 * silently under-count. Update alongside any model change.
 */
export const MODEL_RATES: Readonly<Record<string, ModelRate>> = {
  "claude-fable-5": { inputPerMTok: 10, outputPerMTok: 50 },
  "claude-mythos-5": { inputPerMTok: 10, outputPerMTok: 50 },
  "claude-opus-5": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-7": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-opus-4-6": { inputPerMTok: 5, outputPerMTok: 25 },
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
};

/**
 * Rate used for a model we have no entry for. Set to the most expensive tier on
 * purpose: an unknown model should make the budget trip EARLY, never late. A
 * miscounted cheap model wastes a little headroom; a miscounted expensive one
 * spends real money.
 */
export const FALLBACK_RATE: ModelRate = { inputPerMTok: 10, outputPerMTok: 50 };

export function rateForModel(model: string | null | undefined): ModelRate {
  if (!model) return FALLBACK_RATE;
  return MODEL_RATES[model] ?? FALLBACK_RATE;
}

/** Cost in USD for a completed model call. */
export function estimateCostUsd(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = rateForModel(model);
  return (inputTokens / 1_000_000) * rate.inputPerMTok + (outputTokens / 1_000_000) * rate.outputPerMTok;
}

/** Build a TokenUsage (tokens + derived cost) from an SDK usage block. */
export function usageFromTokens(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    costUsd: estimateCostUsd(model, inputTokens, outputTokens),
  };
}

/**
 * Global daily spend ceiling across every agent. Conservative by default —
 * this is a backstop against a runaway loop, not a budget to be spent, so the
 * default is set low enough that tripping it is a surprise worth investigating.
 */
export const DAILY_COST_CAP_USD = Number(process.env.PAT_AGENT_DAILY_COST_CAP_USD ?? 5);

/** Start of the current local day — the window the daily cap is measured over. */
export function startOfDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

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
