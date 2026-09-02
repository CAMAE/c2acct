/**
 * Public-tier guardrail limits (BOX 2).
 *
 * Every value is an env-overridable default, and every one of them is a REFUSAL
 * threshold rather than a target. The public tier is an unauthenticated endpoint
 * in front of a paid model: without these it is an open relay, and the failure
 * mode is not degraded service but a bill and a scraped corpus.
 *
 * Pure and dependency-free so the thresholds can be asserted exhaustively
 * without a database or a request.
 *
 * A malformed env value falls back to the default rather than becoming NaN.
 * That matters more here than it reads: `NaN >= cap` is false, so a typo in a
 * cap variable would silently disable the very control it was meant to tune.
 */

export type PublicLimitEnv = Record<string, string | undefined>;

function positiveNumber(raw: string | undefined, fallback: number): number {
  // Blank counts as ABSENT, matching the convention used elsewhere in the repo
  // (see clean() in lib/verticals/context.ts). This is not pedantry: Number("")
  // is 0, not NaN, so an env var set but left empty — PAT_PUBLIC_IP_MAX_REQUESTS=
  // — would silently configure a cap of ZERO and refuse every request. That
  // fails closed rather than open, but a public surface that answers nobody
  // because of a stray equals sign is still an outage, and the operator's
  // intent was plainly "unset".
  //
  // An explicit "0" is still honoured: that is a deliberate lockdown, and the
  // difference between "0" and "" is exactly the difference between meaning it
  // and mistyping it.
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export const PUBLIC_INPUT_MAX_CHARS_ENV = "PAT_PUBLIC_INPUT_MAX_CHARS";
export const PUBLIC_IP_WINDOW_SECONDS_ENV = "PAT_PUBLIC_IP_WINDOW_SECONDS";
export const PUBLIC_IP_MAX_REQUESTS_ENV = "PAT_PUBLIC_IP_MAX_REQUESTS";
export const PUBLIC_SESSION_MAX_MESSAGES_ENV = "PAT_PUBLIC_SESSION_MAX_MESSAGES";
export const PUBLIC_DAILY_CAP_USD_ENV = "PAT_PUBLIC_DAILY_CAP_USD";

/**
 * Input length cap.
 *
 * The signed-in surface already truncates at 1000 chars. The public one REFUSES
 * instead of truncating, and is tighter: a truncated question silently becomes a
 * different question, and answering a question the visitor did not ask is worse
 * than declining the one they did. Long inputs are also the cheap half of a
 * cost-amplification attempt.
 */
export function publicInputMaxChars(env: PublicLimitEnv = process.env): number {
  return positiveNumber(env[PUBLIC_INPUT_MAX_CHARS_ENV], 600);
}

/** Sliding window for the per-IP rate limit, in seconds. */
export function publicIpWindowSeconds(env: PublicLimitEnv = process.env): number {
  return positiveNumber(env[PUBLIC_IP_WINDOW_SECONDS_ENV], 60);
}

/** Requests one IP may make inside that window. */
export function publicIpMaxRequests(env: PublicLimitEnv = process.env): number {
  return positiveNumber(env[PUBLIC_IP_MAX_REQUESTS_ENV], 8);
}

/**
 * Messages one conversation may send, total.
 *
 * Separate from the IP limit because they catch different things: the IP window
 * catches a burst, this catches a slow drain — one visitor asking all day at a
 * polite rate, which no per-minute limit would ever notice.
 */
export function publicSessionMaxMessages(env: PublicLimitEnv = process.env): number {
  return positiveNumber(env[PUBLIC_SESSION_MAX_MESSAGES_ENV], 20);
}

/**
 * Global daily spend ceiling for the whole public tier.
 *
 * Same shape as the agent fleet's daily cap and the web tier's: a backstop
 * against a bug or a spike, not a budget to be spent, so tripping it should be a
 * surprise worth investigating. It is the only control that bounds total
 * exposure — per-IP and per-session limits bound one caller each, and a
 * distributed caller defeats both.
 */
export function publicDailyCapUsd(env: PublicLimitEnv = process.env): number {
  return positiveNumber(env[PUBLIC_DAILY_CAP_USD_ENV], 3);
}

export type PublicInputVerdict =
  | { ok: true; question: string }
  | { ok: false; reason: "empty_question" | "input_too_long" };

/** Validate a public question. Refuses; never truncates. */
export function checkPublicInput(raw: unknown, env: PublicLimitEnv = process.env): PublicInputVerdict {
  const question = typeof raw === "string" ? raw.trim() : "";
  if (!question) {
    return { ok: false, reason: "empty_question" };
  }
  if (question.length > publicInputMaxChars(env)) {
    return { ok: false, reason: "input_too_long" };
  }
  return { ok: true, question };
}
