import prisma from "@/lib/prisma";
import { startOfDay } from "@/lib/agents/cost";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";

/**
 * Web-tier spend controls (LADDER-2).
 *
 * The web rung is the first thing in Pat that costs money per question, so it
 * gets the same shape of guard the agent runtime already uses: a GLOBAL daily
 * ceiling that stops everything, plus a PER-USER daily allowance that stops one
 * account from consuming the ceiling on its own.
 *
 * Both are needed, and neither substitutes for the other. The global cap is the
 * backstop against a bug or a spike; the per-user cap is the backstop against a
 * single enthusiastic (or hostile) account, which the global cap would only
 * catch after it had already spent everyone else's budget.
 *
 * THIS MODULE TOUCHES THE DATABASE, and it is deliberately NOT imported by the
 * rung handler — see lib/patAssistant/web/rung.ts. Caps are checked by the
 * caller and the verdict is injected, so the handler's module graph stays clean
 * of Prisma and the tenant-data firewall is provable rather than promised.
 */

export const WEB_TIER_DAILY_CAP_ENV = "PAT_WEB_TIER_DAILY_CAP_USD";
export const WEB_TIER_USER_CAP_ENV = "PAT_WEB_TIER_USER_DAILY_SEARCHES";

/**
 * Global daily ceiling. Low by default and on purpose: this is a backstop
 * against a runaway, not a budget to be spent, so tripping it should be a
 * surprise worth investigating rather than a Tuesday.
 */
export function dailyCapUsd(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env[WEB_TIER_DAILY_CAP_ENV] ?? 2);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

/** Per-user daily web answers. */
export function userDailySearchCap(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env[WEB_TIER_USER_CAP_ENV] ?? 10);
  return Number.isFinite(raw) && raw >= 0 ? raw : 10;
}

export type WebBudgetVerdict = {
  allowed: boolean;
  /** Why it was refused, for the gap log. Null when allowed. */
  reason: "global_cap_exhausted" | "user_cap_exhausted" | null;
  spentUsd: number;
  capUsd: number;
  userSearches: number;
  userCap: number;
};

type BudgetClient = Pick<typeof prisma, "patWebSearchLog">;

/**
 * May this user spend on a web search right now?
 *
 * Checked BEFORE the search, from what previous searches actually cost. The
 * global cap is compared with `>=` so a day that has already reached the ceiling
 * cannot start one more call — a `>` would allow exactly one overspend every
 * day, forever, which is the kind of off-by-one that only shows up on the bill.
 */
export async function checkWebBudget(
  userId: string,
  env: Record<string, string | undefined> = process.env,
  now: Date = new Date(),
  client: BudgetClient = prisma
): Promise<WebBudgetVerdict> {
  const capUsd = dailyCapUsd(env);
  const userCap = userDailySearchCap(env);
  const since = startOfDay(now);

  const [todays, userSearches] = await Promise.all([
    client.patWebSearchLog.findMany({
      where: { createdAt: { gte: since } },
      select: { costUsd: true },
    }),
    client.patWebSearchLog.count({ where: { userId, createdAt: { gte: since } } }),
  ]);

  const spentUsd = todays.reduce((total, row) => total + Number(row.costUsd ?? 0), 0);

  if (spentUsd >= capUsd) {
    return { allowed: false, reason: "global_cap_exhausted", spentUsd, capUsd, userSearches, userCap };
  }
  if (userSearches >= userCap) {
    return { allowed: false, reason: "user_cap_exhausted", spentUsd, capUsd, userSearches, userCap };
  }
  return { allowed: true, reason: null, spentUsd, capUsd, userSearches, userCap };
}

export type RecordWebSearchInput = {
  userId: string;
  audience: string;
  provider: string;
  costUsd: number;
  answered: boolean;
  verticalId?: string;
};

/**
 * Record one billed search.
 *
 * Called for EVERY provider call that was actually made, including calls that
 * produced no citable answer: a search that returned nothing still cost money,
 * and a ledger that only records successes under-reports the day and lets the
 * cap drift past its ceiling.
 *
 * Never throws — a ledger write that fails must not fail the answer the user
 * already paid for. The cost of that choice is a small undercount on a database
 * blip, which is the right trade against 500-ing a successful reply.
 */
export async function recordWebSearch(
  input: RecordWebSearchInput,
  client: BudgetClient = prisma
): Promise<void> {
  try {
    await client.patWebSearchLog.create({
      data: {
        userId: input.userId,
        audience: input.audience,
        provider: input.provider,
        costUsd: input.costUsd,
        answered: input.answered,
        verticalId: input.verticalId ?? DEFAULT_VERTICAL_ID,
      },
    });
  } catch (error) {
    console.warn("[pat] web search ledger write failed", error);
  }
}
