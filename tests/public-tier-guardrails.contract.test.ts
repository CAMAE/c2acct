import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { PAT_PUBLIC_TIER_FLAG_ENV, isPublicTierEnabled } from "@/lib/patAssistant/flags";
import {
  checkPublicInput,
  publicDailyCapUsd,
  publicInputMaxChars,
  publicIpMaxRequests,
  publicIpWindowSeconds,
  publicSessionMaxMessages,
} from "@/lib/patAssistant/public/limits";
import {
  ALLOWED_PUBLIC_HOST,
  filterPublicAnswer,
  longestSharedRun,
  offsiteHosts,
} from "@/lib/patAssistant/public/outputFilter";
import {
  MissingPublicIpSaltError,
  checkPublicUsage,
  hashIp,
  publicTierAvailability,
  recordPublicUsage,
} from "@/lib/patAssistant/public/usage";

/**
 * Public-tier guardrails (BOX 2).
 *
 * These exist BEFORE the surface they guard. That ordering is the point: rate
 * limits, spend caps and output filtering are what get bolted on after launch
 * under pressure, and an unauthenticated endpoint in front of a paid model
 * without them is an open relay. Built while nothing is reachable, the surface
 * cannot ship without them.
 */

applyRepoEnv();

const ROOT = process.cwd();
const DB_TIMEOUT_MS = 60_000;
const NS = "test-public-tier";
// No fallback salt exists any more, so every usage call names one explicitly.
const SALT = { PAT_PUBLIC_IP_HASH_SALT: "test-salt" };

let prisma: typeof import("@/lib/prisma").default;
let dbAvailable = false;

async function cleanup() {
  if (!dbAvailable) return;
  await prisma.patPublicUsageLog.deleteMany({ where: { sessionId: { startsWith: NS } } });
}

beforeAll(async () => {
  prisma = (await import("@/lib/prisma")).default;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  await cleanup();
}, DB_TIMEOUT_MS);

afterAll(async () => {
  await cleanup();
  if (dbAvailable) await prisma.$disconnect();
}, DB_TIMEOUT_MS);

// ---------------------------------------------------------------------------
// Nothing is reachable while dark.
// ---------------------------------------------------------------------------

/**
 * RETIRED IN BOX 3: "is read by no route, page or component" and "has no public
 * entry point passing publicEntry into retrieval".
 *
 * Both asserted an ABSENCE that was correct while the guardrails shipped ahead
 * of the surface they guard. Box 3 built that surface, so both are now false by
 * design and are replaced by their inversions below rather than deleted or
 * quietly weakened — the same treatment the LADDER-1 web-tier-absence test got.
 *
 * The boundary is still pinned, from the other side: the flag is read by exactly
 * the page and the route, and exactly ONE file outside the retrieval seam passes
 * publicEntry — this route.
 */
describe("the public tier is reachable ONLY through its own surface", () => {
  const PAGE = "app/(public)/ask/page.tsx";
  const ROUTE = "app/api/pat/public/route.ts";
  const SEAM = "lib/patAssistant/retrieveHelp.ts";

  function trackedFiles(...dirs: string[]): string[] {
    return execFileSync("git", ["ls-files", ...dirs], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  }

  it("defaults off and admits only an exact \"1\"", () => {
    expect(isPublicTierEnabled({})).toBe(false);
    for (const value of ["0", "", "true", "yes", "TRUE", " 1"]) {
      expect(isPublicTierEnabled({ [PAT_PUBLIC_TIER_FLAG_ENV]: value })).toBe(false);
    }
    expect(isPublicTierEnabled({ [PAT_PUBLIC_TIER_FLAG_ENV]: "1" })).toBe(true);
  });

  it("gates the page and the route on availability, through the SAME function", () => {
    // A page that rendered while its endpoint refused would be a chat box that
    // silently never answers, so both consult publicTierAvailability().
    for (const file of [PAGE, ROUTE]) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      expect({ file, gated: /publicTierAvailability\(\)/.test(source) }).toEqual({ file, gated: true });
    }
  });

  it("is consulted by NOTHING else under app/", () => {
    const offenders = trackedFiles("app").filter(
      (file) =>
        file !== PAGE &&
        file !== ROUTE &&
        /PAT_ENABLE_PUBLIC_TIER|isPublicTierEnabled|publicTierAvailability/.test(
          readFileSync(path.join(ROOT, file), "utf8")
        )
    );
    expect(offenders).toEqual([]);
  });

  it("has EXACTLY ONE publicEntry caller outside the retrieval seam", () => {
    const callers = trackedFiles("app", "lib", "scripts").filter(
      (file) => file !== SEAM && /\bpublicEntry\s*:/.test(readFileSync(path.join(ROOT, file), "utf8"))
    );
    expect(callers).toEqual([ROUTE]);
  });

  /**
   * Executable code only — comments and imports stripped.
   *
   * The first version of these assertions matched raw source and failed on the
   * route's own docblock, which SAYS it does not import getSessionUser and does
   * not pass attemptWeb. A scan that a comment can trip is a scan that will be
   * silenced by rewording rather than by fixing, so it reads code here.
   */
  function routeCode(): string {
    return readFileSync(path.join(ROOT, ROUTE), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/[^\n]*/g, "$1");
  }

  /** The POST body, so ordering assertions measure execution, not import order. */
  function postBody(): string {
    const code = routeCode();
    return code.slice(code.indexOf("export async function POST"));
  }

  it("is anonymous BY CONSTRUCTION — the route cannot read a session", () => {
    // Not "does not currently read one": it imports nothing that could. A
    // signed-in visitor hitting this endpoint is another anonymous caller, and
    // there is no path by which privilege could flow in.
    const code = routeCode();
    for (const forbidden of [
      "@/lib/auth/session",
      "next/headers",
      "resolvePatAudience",
      "getSessionUser",
      "membershipPlan",
      "unrestricted",
    ]) {
      expect({ forbidden, present: code.includes(forbidden) }).toEqual({ forbidden, present: false });
    }
  });

  it("cannot reach the web tier, because it passes no attemptWeb", () => {
    // Rung 3 exists only through that callback. Not passing one means the web
    // tier does not exist on this path — no flag flip anywhere can add it.
    const code = routeCode();
    expect(code).toContain("runAnswerLadder");
    expect(code).not.toMatch(/attemptWeb/);
  });

  it("runs every cheap refusal BEFORE the model call", () => {
    // Spend-shaped order: a rate-limited or over-long request must cost $0 of
    // model spend, which is the whole reason the caps sit in front. Measured in
    // the POST body — an earlier version compared positions in the whole file
    // and was reading the import block, where order means nothing.
    const body = postBody();
    const at = (needle: string) => {
      const index = body.indexOf(needle);
      expect({ needle, found: index > -1 }).toEqual({ needle, found: true });
      return index;
    };
    expect(at("publicTierAvailability()")).toBeLessThan(at("checkPublicInput("));
    expect(at("checkPublicInput(")).toBeLessThan(at("checkPublicUsage("));
    expect(at("checkPublicUsage(")).toBeLessThan(at("runAnswerLadder("));
    expect(at("runAnswerLadder(")).toBeLessThan(at("filterPublicAnswer("));
    expect(at("filterPublicAnswer(")).toBeLessThan(body.lastIndexOf("recordPublicUsage("));
  });

  it("filters every answer and bills every path, refusals included", () => {
    // Three recordPublicUsage calls: decline, filtered-out, answered.
    expect(routeCode().match(/recordPublicUsage\(/g) ?? []).toHaveLength(3);
    expect(routeCode()).toMatch(/answered: false/);
    expect(routeCode()).toMatch(/answered: true/);
  });

  it("never logs a cap refusal as a corpus gap", () => {
    // A cap is our throttling, not a hole in the corpus; writing it to the gap
    // queue would corrupt the signal the queue exists to carry.
    const code = routeCode();
    expect(code).not.toMatch(/recordPatDecline/);
    const capBranch = code.slice(code.indexOf("if (!usage.allowed)"), code.indexOf("const ip ="));
    expect(capBranch).toContain("429");
    expect(capBranch).not.toContain("decline(");
  });
});

// ---------------------------------------------------------------------------
// Input length cap.
// ---------------------------------------------------------------------------

describe("input length cap — refuses, never truncates", () => {
  it("accepts an ordinary question", () => {
    expect(checkPublicInput("  what is PAT?  ")).toEqual({ ok: true, question: "what is PAT?" });
  });

  it("refuses an over-long question rather than truncating it", () => {
    // A truncated question silently becomes a different question, and answering
    // one the visitor did not ask is worse than declining the one they did.
    const long = "a".repeat(publicInputMaxChars({}) + 1);
    expect(checkPublicInput(long)).toEqual({ ok: false, reason: "input_too_long" });
  });

  it("refuses empty and non-string input", () => {
    for (const value of ["", "   ", null, undefined, 42, {}]) {
      expect(checkPublicInput(value)).toEqual({ ok: false, reason: "empty_question" });
    }
  });

  it("is tighter than the signed-in surface's 1000-char limit", () => {
    expect(publicInputMaxChars({})).toBeLessThan(1000);
  });
});

// ---------------------------------------------------------------------------
// Limits: defaults, overrides, and malformed values.
// ---------------------------------------------------------------------------

describe("limit configuration", () => {
  it("has conservative defaults", () => {
    expect(publicInputMaxChars({})).toBe(600);
    expect(publicIpWindowSeconds({})).toBe(60);
    expect(publicIpMaxRequests({})).toBe(8);
    expect(publicSessionMaxMessages({})).toBe(20);
    expect(publicDailyCapUsd({})).toBe(3);
  });

  it("reads overrides", () => {
    expect(publicIpMaxRequests({ PAT_PUBLIC_IP_MAX_REQUESTS: "3" })).toBe(3);
    expect(publicDailyCapUsd({ PAT_PUBLIC_DAILY_CAP_USD: "10" })).toBe(10);
  });

  it("falls back on a malformed value rather than disabling the control", () => {
    // NaN >= cap is false, so a typo in a cap variable would silently switch the
    // control off — the one failure mode a cap must not have.
    for (const bad of ["banana", "", "  ", "-1", "NaN"]) {
      expect({ bad, value: publicIpMaxRequests({ PAT_PUBLIC_IP_MAX_REQUESTS: bad }) }).toEqual({ bad, value: 8 });
      expect({ bad, value: publicDailyCapUsd({ PAT_PUBLIC_DAILY_CAP_USD: bad }) }).toEqual({ bad, value: 3 });
    }
  });

  it("honours an explicit zero as a deliberate lockdown", () => {
    // "0" and "" must not mean the same thing: one is an operator locking the
    // tier down, the other is a stray equals sign. Number("") is 0, so without
    // the blank-as-absent rule an empty var would silently refuse every request.
    expect(publicIpMaxRequests({ PAT_PUBLIC_IP_MAX_REQUESTS: "0" })).toBe(0);
    expect(publicDailyCapUsd({ PAT_PUBLIC_DAILY_CAP_USD: "0" })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Output filtering.
// ---------------------------------------------------------------------------

describe("output filtering — refuses, never scrubs", () => {
  it("passes an ordinary grounded answer", () => {
    const result = filterPublicAnswer("PAT measures alignment using deterministic arithmetic.");
    expect(result).toEqual({ ok: true, text: "PAT measures alignment using deterministic arithmetic." });
  });

  it("refuses an email address", () => {
    // Scrubbing would hide the attempt, and the attempt is the interesting event.
    const result = filterPublicAnswer("Contact support@patalign.com for help.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violation).toBe("email_address");
  });

  it("refuses an offsite URL, bare or fully qualified", () => {
    for (const answer of [
      "See https://example.com/docs for more.",
      "Read more at competitor.io/pricing.",
      "Details at www.some-blog.co.uk.",
    ]) {
      const result = filterPublicAnswer(answer);
      expect({ answer, ok: result.ok }).toEqual({ answer, ok: false });
      if (!result.ok) expect(result.violation).toBe("offsite_url");
    }
  });

  it("allows patalign.com and its subdomains", () => {
    expect(filterPublicAnswer("Start at https://patalign.com/sign-in.").ok).toBe(true);
    expect(filterPublicAnswer("See app.patalign.com for the portal.").ok).toBe(true);
  });

  it("rejects lookalike hosts a naive matcher would allow", () => {
    // Same trap the web-tier allowlist guards: endsWith accepts the first,
    // includes accepts both.
    expect(offsiteHosts("visit notpatalign.com")).toEqual(["notpatalign.com"]);
    expect(offsiteHosts("visit patalign.com.evil.com")).toEqual(["patalign.com.evil.com"]);
    expect(offsiteHosts("visit patalign.com")).toEqual([]);
  });

  it("refuses a long verbatim quote from a source", () => {
    // The public shelf is published marketing, not a scrapeable archive.
    const source = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const result = filterPublicAnswer(source, [source]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violation).toBe("verbatim_quote");
  });

  it("allows a short quotation and ordinary paraphrase", () => {
    const source = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
    const shortQuote = Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ");
    expect(filterPublicAnswer(`As the article puts it: ${shortQuote}.`, [source]).ok).toBe(true);
  });

  it("checks each source separately, so a long run cannot hide across two", () => {
    const runA = Array.from({ length: 60 }, (_, i) => `alpha${i}`).join(" ");
    const other = "completely unrelated prose about something else entirely";
    const result = filterPublicAnswer(runA, [other, runA]);
    expect(result.ok).toBe(false);
  });

  it("measures the longest SHARED run, not total overlap", () => {
    expect(longestSharedRun("a b c d e", "x a b c y")).toBe(3);
    expect(longestSharedRun("", "a b")).toBe(0);
  });

  it("refuses an empty answer", () => {
    const result = filterPublicAnswer("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violation).toBe("empty_answer");
  });

  it("pins the single allowed host", () => {
    expect(ALLOWED_PUBLIC_HOST).toBe("patalign.com");
  });
});

// ---------------------------------------------------------------------------
// Usage caps, against real Postgres.
// ---------------------------------------------------------------------------

describe("usage caps (DB-backed)", () => {
  it("hashes the IP and never stores it raw", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const ip = "203.0.113.42";
    await recordPublicUsage({ ip, sessionId: `${NS}-hash`, costUsd: 0, answered: true }, SALT);
    const row = await prisma.patPublicUsageLog.findFirst({ where: { sessionId: `${NS}-hash` } });
    expect(row).not.toBeNull();
    expect(row!.ipHash).not.toContain(ip);
    expect(row!.ipHash).toBe(hashIp(ip, SALT));
    // No question text column exists to leak into.
    expect(Object.keys(row!)).not.toContain("question");
  }, DB_TIMEOUT_MS);

  it("changes the hash when the salt changes", () => {
    expect(hashIp("1.2.3.4", { PAT_PUBLIC_IP_HASH_SALT: "a" })).not.toBe(
      hashIp("1.2.3.4", { PAT_PUBLIC_IP_HASH_SALT: "b" })
    );
  });

  it("rate-limits an IP inside the window", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const env = { ...SALT, PAT_PUBLIC_IP_MAX_REQUESTS: "3", PAT_PUBLIC_SESSION_MAX_MESSAGES: "999" };
    const ip = "203.0.113.99";
    for (let i = 0; i < 3; i += 1) {
      await recordPublicUsage({ ip, sessionId: `${NS}-ip-${i}`, costUsd: 0, answered: true }, env);
    }
    const verdict = await checkPublicUsage({ ip, sessionId: `${NS}-ip-next` }, env);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("ip_rate_limited");
    expect(verdict.ipRequests).toBeGreaterThanOrEqual(3);
  }, DB_TIMEOUT_MS);

  it("caps a session's total messages, which no per-minute window would catch", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const env = { ...SALT, PAT_PUBLIC_IP_MAX_REQUESTS: "999", PAT_PUBLIC_SESSION_MAX_MESSAGES: "2" };
    const sessionId = `${NS}-session-cap`;
    for (let i = 0; i < 2; i += 1) {
      await recordPublicUsage({ ip: `198.51.100.${i}`, sessionId, costUsd: 0, answered: true }, env);
    }
    const verdict = await checkPublicUsage({ ip: "198.51.100.9", sessionId }, env);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("session_message_cap");
  }, DB_TIMEOUT_MS);

  it("trips the global daily cost cap", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const env = {
      ...SALT,
      PAT_PUBLIC_IP_MAX_REQUESTS: "999",
      PAT_PUBLIC_SESSION_MAX_MESSAGES: "999",
      PAT_PUBLIC_DAILY_CAP_USD: "0.05",
    };
    await recordPublicUsage(
      { ip: "198.51.100.50", sessionId: `${NS}-cost`, costUsd: 0.06, answered: true },
      env
    );
    const verdict = await checkPublicUsage({ ip: "198.51.100.51", sessionId: `${NS}-cost-2` }, env);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("daily_cost_cap");
  }, DB_TIMEOUT_MS);

  it("allows a fresh caller under every limit", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const verdict = await checkPublicUsage(
      { ip: "192.0.2.1", sessionId: `${NS}-fresh-${Date.now()}` },
      { ...SALT, PAT_PUBLIC_DAILY_CAP_USD: "1000" }
    );
    expect(verdict.allowed).toBe(true);
    expect(verdict.reason).toBeNull();
  }, DB_TIMEOUT_MS);

  it("records refused answers too, because they still cost tokens", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    const sessionId = `${NS}-refused`;
    await recordPublicUsage({ ip: "192.0.2.7", sessionId, costUsd: 0.02, answered: false }, SALT);
    const row = await prisma.patPublicUsageLog.findFirst({ where: { sessionId } });
    expect(row!.answered).toBe(false);
    expect(Number(row!.costUsd)).toBeCloseTo(0.02, 5);
  }, DB_TIMEOUT_MS);

  it("never throws when the ledger write fails", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    // A ledger write that fails must not fail the answer the visitor waited for.
    await expect(
      recordPublicUsage(
        { ip: "192.0.2.8", sessionId: null as unknown as string, costUsd: 0, answered: true },
        SALT
      )
    ).resolves.toBeUndefined();
  }, DB_TIMEOUT_MS);
});

/**
 * The salt precondition (Mythos rider).
 *
 * The first version fell back to a constant salt when the env var was unset,
 * documented as "weaker but still prevents casual reversal". That reasoning was
 * wrong, and the rider is right: the constant lived in the repo, and the entire
 * IPv4 space is 2^32 — anyone holding both the table and the source enumerates
 * it offline in minutes. A hash whose salt is public is an encoding, not a hash.
 *
 * Enabled-with-no-salt is therefore REFUSED, the same wall pattern as the web
 * rung's missing provider: a precondition that is not met means decline, never
 * serve in a degraded shape.
 */
describe("a missing IP salt refuses the tier rather than weakening it", () => {
  it("refuses availability when the flag is on but no salt is set", () => {
    expect(publicTierAvailability({ [PAT_PUBLIC_TIER_FLAG_ENV]: "1" })).toEqual({
      available: false,
      refusal: "missing_ip_salt",
    });
    expect(publicTierAvailability({ [PAT_PUBLIC_TIER_FLAG_ENV]: "1", PAT_PUBLIC_IP_HASH_SALT: "   " })).toEqual({
      available: false,
      refusal: "missing_ip_salt",
    });
  });

  it("refuses on the flag before it even looks at the salt", () => {
    expect(publicTierAvailability({})).toEqual({ available: false, refusal: "flag_off" });
  });

  it("is available only with BOTH the flag and a salt", () => {
    expect(
      publicTierAvailability({ [PAT_PUBLIC_TIER_FLAG_ENV]: "1", PAT_PUBLIC_IP_HASH_SALT: "s3cr3t" })
    ).toEqual({ available: true, refusal: null });
  });

  it("hashIp throws rather than falling back to a constant", () => {
    // There is no fallback salt. This throw is the second wall behind the gate.
    expect(() => hashIp("203.0.113.1", {})).toThrow(MissingPublicIpSaltError);
    expect(() => hashIp("203.0.113.1", { PAT_PUBLIC_IP_HASH_SALT: "" })).toThrow(
      /brute-forceable/
    );
  });

  it("no constant salt literal survives in the source", () => {
    // The specific string that made the old fallback brute-forceable.
    const source = readFileSync(path.join(ROOT, "lib/patAssistant/public/usage.ts"), "utf8");
    expect(source).not.toContain("pat-public-tier-unsalted");
  });

  it("checkPublicUsage fails CLOSED for a caller that skipped the gate", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    // Returning a refusal rather than throwing keeps the shape callers handle,
    // and a missing salt must never degrade into "serve anyway".
    const verdict = await checkPublicUsage(
      { ip: "203.0.113.5", sessionId: `${NS}-nosalt` },
      { PAT_PUBLIC_DAILY_CAP_USD: "1000" }
    );
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe("missing_ip_salt");
  }, DB_TIMEOUT_MS);
});
