import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";
import { startOfDay } from "@/lib/agents/costRates";
import { PAT_PUBLIC_TIER_FLAG_ENV } from "@/lib/patAssistant/flags";
import {
  publicDailyCapUsd,
  publicIpMaxRequests,
  publicIpWindowSeconds,
  publicSessionMaxMessages,
  type PublicLimitEnv,
} from "@/lib/patAssistant/public/limits";

/**
 * Public-tier usage accounting (BOX 2) — the database half of the guardrails.
 *
 * Three controls, one ledger, three windows over the same rows:
 *
 *   per-IP rate limit   — rows for this ipHash in the last N seconds
 *   per-session cap     — rows for this sessionId, all time
 *   global daily cost   — sum(costUsd) since local midnight
 *
 * They catch different abuse and none substitutes for another. The IP window
 * catches a burst; the session cap catches a slow drain that no per-minute limit
 * would notice; the daily cap is the only one that bounds TOTAL exposure, since
 * a distributed caller defeats the first two by definition.
 *
 * Checked BEFORE the model call, and compared with `>=` so a window that has
 * already reached its ceiling cannot admit one more — `>` allows exactly one
 * overspend per window, forever, which is the off-by-one that only shows up on
 * the bill.
 *
 * Kept OUT of any pure module on purpose: this is the only file here that
 * touches Prisma, so the limits and the output filter stay exhaustively testable
 * without a database.
 */

export const PUBLIC_IP_SALT_ENV = "PAT_PUBLIC_IP_HASH_SALT";

export class MissingPublicIpSaltError extends Error {
  constructor() {
    super(
      `${PUBLIC_IP_SALT_ENV} is not set. The public tier stores salted IP hashes; ` +
        "without a secret salt the hashes are brute-forceable and must not be written."
    );
    this.name = "MissingPublicIpSaltError";
  }
}

/**
 * Salted hash of a caller IP.
 *
 * Rate-limiting an abuser requires distinguishing callers, not identifying them,
 * and a salted hash does the first without the second.
 *
 * THERE IS NO FALLBACK SALT, and that is a deliberate correction. An earlier
 * version fell back to a constant when the env var was unset, documented as
 * "weaker but still prevents casual reversal". That reasoning was wrong: the
 * constant lived in the repo, and the entire IPv4 space is 2^32 — anyone holding
 * both the table and the source can enumerate it offline in minutes and recover
 * every address. A hash whose salt is public is not a hash, it is an encoding.
 *
 * So a missing salt is an ERROR rather than a downgrade. It is unreachable in
 * practice because {@link publicTierAvailability} refuses to enable the tier
 * without one, and this throw is the second wall behind that gate.
 */
export function hashIp(ip: string, env: PublicLimitEnv = process.env): string {
  const salt = env[PUBLIC_IP_SALT_ENV]?.trim();
  if (!salt) {
    throw new MissingPublicIpSaltError();
  }
  return createHash("sha256").update(`${salt}:${ip.trim()}`).digest("hex").slice(0, 32);
}

export type PublicTierRefusal = "flag_off" | "missing_ip_salt";

export type PublicTierAvailability = {
  available: boolean;
  refusal: PublicTierRefusal | null;
};

/**
 * May the public tier serve at all?
 *
 * The same wall pattern as the web rung's missing provider: a precondition that
 * is not met means the tier DECLINES, never that it serves in a degraded shape.
 * Enabled-with-no-salt is precisely such a shape — it would answer visitors
 * while writing rows that can be de-anonymised offline — so it is refused rather
 * than tolerated.
 *
 * Checked before anything else by any surface that ever serves this tier.
 */
export function publicTierAvailability(
  env: PublicLimitEnv = process.env
): PublicTierAvailability {
  if (env[PAT_PUBLIC_TIER_FLAG_ENV] !== "1") {
    return { available: false, refusal: "flag_off" };
  }
  if (!env[PUBLIC_IP_SALT_ENV]?.trim()) {
    return { available: false, refusal: "missing_ip_salt" };
  }
  return { available: true, refusal: null };
}

export type PublicUsageRefusal =
  | "ip_rate_limited"
  | "session_message_cap"
  | "daily_cost_cap"
  | "missing_ip_salt";

export type PublicUsageVerdict = {
  allowed: boolean;
  reason: PublicUsageRefusal | null;
  ipRequests: number;
  sessionMessages: number;
  spentUsd: number;
};

type UsageClient = Pick<typeof prisma, "patPublicUsageLog">;

/**
 * May this caller ask right now?
 *
 * Order matters only for which reason is reported, and it is deliberate:
 * cheapest-to-blame first. A rate-limited IP learns it is going too fast; a
 * session at its cap learns the conversation is over; the daily cap is reported
 * last because it is the platform's problem rather than the caller's, and
 * telling a first-time visitor "we are out of budget" should be the rarest of
 * the three.
 */
export async function checkPublicUsage(
  input: { ip: string; sessionId: string },
  env: PublicLimitEnv = process.env,
  now: Date = new Date(),
  client: UsageClient = prisma
): Promise<PublicUsageVerdict> {
  // Fail CLOSED for a caller that skipped publicTierAvailability(). Returning a
  // refusal rather than throwing keeps the shape callers already handle, and a
  // missing salt must never degrade into "serve anyway" — which is what would
  // happen if this threw and some caller caught it broadly.
  let ipHash: string;
  try {
    ipHash = hashIp(input.ip, env);
  } catch {
    return {
      allowed: false,
      reason: "missing_ip_salt",
      ipRequests: 0,
      sessionMessages: 0,
      spentUsd: 0,
    };
  }
  const windowStart = new Date(now.getTime() - publicIpWindowSeconds(env) * 1000);

  const [ipRequests, sessionMessages, todays] = await Promise.all([
    client.patPublicUsageLog.count({ where: { ipHash, createdAt: { gte: windowStart } } }),
    client.patPublicUsageLog.count({ where: { sessionId: input.sessionId } }),
    client.patPublicUsageLog.findMany({
      where: { createdAt: { gte: startOfDay(now) } },
      select: { costUsd: true },
    }),
  ]);

  const spentUsd = todays.reduce((total, row) => total + Number(row.costUsd ?? 0), 0);
  const verdict = { ipRequests, sessionMessages, spentUsd };

  if (ipRequests >= publicIpMaxRequests(env)) {
    return { allowed: false, reason: "ip_rate_limited", ...verdict };
  }
  if (sessionMessages >= publicSessionMaxMessages(env)) {
    return { allowed: false, reason: "session_message_cap", ...verdict };
  }
  if (spentUsd >= publicDailyCapUsd(env)) {
    return { allowed: false, reason: "daily_cost_cap", ...verdict };
  }
  return { allowed: true, reason: null, ...verdict };
}

/**
 * Record one public request.
 *
 * Called for EVERY request that reached the model, including ones whose answer
 * was refused by the output filter: a filtered answer still cost tokens, and a
 * ledger that records only successes under-reports the day and lets the cap
 * drift past its ceiling. It is also what makes the rate limit work at all —
 * an unrecorded request is a free one.
 *
 * Never throws. A ledger write that fails must not fail the answer the visitor
 * already waited for; the cost is a small undercount on a database blip, which
 * is the right trade against 500-ing a successful reply.
 */
export async function recordPublicUsage(
  input: { ip: string; sessionId: string; costUsd: number; answered: boolean },
  env: PublicLimitEnv = process.env,
  client: UsageClient = prisma
): Promise<void> {
  try {
    await client.patPublicUsageLog.create({
      data: {
        ipHash: hashIp(input.ip, env),
        sessionId: input.sessionId,
        costUsd: input.costUsd,
        answered: input.answered,
      },
    });
  } catch (error) {
    console.warn("[pat] public usage ledger write failed", error);
  }
}
