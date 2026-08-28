import { mayReachPaidRung, type ScopeVerdict } from "@/lib/patAssistant/scopeGate";
// From the dependency-free leaf, NOT corpusAccess: that module imports the
// membership resolver and therefore Prisma, which would breach this rung's
// tenant-data firewall. The contract test caught exactly that import.
import { PUBLIC_AUDIENCE } from "@/lib/patAssistant/audienceTokens";
import { isPatWebTierEnabled } from "@/lib/patAssistant/flags";
import {
  allowedDomainsFor,
  type WebSearchOutcome,
  type WebSearchProvider,
} from "@/lib/patAssistant/web/provider";
import { renderWebAnswer, type RenderedWebAnswer } from "@/lib/patAssistant/web/render";

/**
 * The web rung (LADDER-2, rung 3).
 *
 * Reached ONLY after the corpus rung has failed. It never runs ahead of the
 * corpus and never runs after a successful answer — Patalign's own
 * documentation is always the better source when it has one, and paying for a
 * search to second-guess it would be both wasteful and wrong.
 *
 * ## The tenant-data firewall, proven rather than promised
 *
 * This module imports NOTHING from a tenant data layer: no Prisma client, no
 * membership resolver, no company/subject/session lookup. Everything it needs
 * arrives as an argument. `tests/pat-web-tier.contract.test.ts` walks its
 * transitive import graph and fails if a database or tenant module appears.
 *
 * That matters because this is the one rung that sends text to a third party.
 * A firewall that depends on nobody adding the wrong import is not a firewall;
 * a firewall that fails the build when someone does is. The spend ledger and the
 * cap check DO touch the database, which is exactly why they live in
 * ./budget.ts and are injected here as a verdict and a callback.
 *
 * ## Five independent walls
 *
 * Every one must pass, and each is separate so that turning on the flag in an
 * environment missing any other does nothing:
 *
 *   1. PAT_ENABLE_PAT_WEB_TIER is on.
 *   2. A search provider is configured (its credential is present).
 *   3. The caller is signed-in and NOT the public audience.
 *   4. The scope gate returned CONFIDENTLY in scope — an ambiguous question
 *      never spends money (the LADDER-2 ruling).
 *   5. Both spend caps have room.
 *
 * A failure of any wall is a DECLINE, never an error. The user asked a help
 * question; a misconfiguration is not their problem to see.
 */

export type WebRungRefusal =
  | "flag_off"
  | "no_provider"
  | "public_audience"
  | "scope_not_confident"
  | "cap_exhausted"
  | "no_citations"
  | "provider_error";

export type WebRungResult =
  | { kind: "answer"; answer: RenderedWebAnswer; outcome: WebSearchOutcome }
  | { kind: "unavailable"; refusal: WebRungRefusal; outcome: WebSearchOutcome | null };

export type WebRungInput = {
  question: string;
  audience: string;
  /** Null when signed out. The web rung requires a signed-in caller. */
  userId: string | null;
  scope: ScopeVerdict | null;
  /** Injected; ./budget.ts owns the database side of this. */
  budgetAllows: () => Promise<{ allowed: boolean; reason: string | null }>;
  /** Injected; called for EVERY billed provider call, answered or not. */
  onSearchBilled: (outcome: WebSearchOutcome, answered: boolean) => Promise<void>;
  /** Injected for tests; the configured provider otherwise. */
  provider: WebSearchProvider | null;
  env?: Record<string, string | undefined>;
  maxResults?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export const WEB_RUNG_MAX_RESULTS = 5;
export const WEB_RUNG_MAX_TOKENS = 900;
export const WEB_RUNG_TIMEOUT_MS = 25_000;

/**
 * Attempt the web rung.
 *
 * Returns `unavailable` for every refusal so the ladder can decline uniformly.
 * Nothing here throws for an expected condition, including a provider outage:
 * a search API being down is a Tuesday, not an exception, and it must read to
 * the user exactly like the corpus having nothing.
 */
export async function runWebRung(input: WebRungInput): Promise<WebRungResult> {
  const env = input.env ?? process.env;

  // Wall 1 — the flag.
  if (!isPatWebTierEnabled(env)) {
    return { kind: "unavailable", refusal: "flag_off", outcome: null };
  }

  // Wall 2 — a configured provider. No key = unavailable, never an error.
  if (!input.provider) {
    return { kind: "unavailable", refusal: "no_provider", outcome: null };
  }

  // Wall 3 — signed-in, non-public. The public audience can never reach a rung
  // that spends money: an unauthenticated caller has no account to bill, no
  // per-user allowance to consume, and no consent on file for sending their
  // text to a third party.
  if (!input.userId || input.audience === PUBLIC_AUDIENCE) {
    return { kind: "unavailable", refusal: "public_audience", outcome: null };
  }

  // Wall 4 — confidently in scope. `inScope` alone is NOT enough: that is the
  // fail-open answer, and ambiguity is free-rungs-only.
  if (!mayReachPaidRung(input.scope)) {
    return { kind: "unavailable", refusal: "scope_not_confident", outcome: null };
  }

  // Wall 5 — spend caps, checked BEFORE the money is spent.
  const budget = await input.budgetAllows();
  if (!budget.allowed) {
    return { kind: "unavailable", refusal: "cap_exhausted", outcome: null };
  }

  let outcome: WebSearchOutcome;
  try {
    outcome = await input.provider.search({
      question: input.question,
      allowedDomains: allowedDomainsFor(env),
      maxResults: input.maxResults ?? WEB_RUNG_MAX_RESULTS,
      maxTokens: input.maxTokens ?? WEB_RUNG_MAX_TOKENS,
      timeoutMs: input.timeoutMs ?? WEB_RUNG_TIMEOUT_MS,
    });
  } catch {
    // A failed call may still have been billed upstream, but we have no usage
    // to record and no answer to show. Decline quietly.
    return { kind: "unavailable", refusal: "provider_error", outcome: null };
  }

  const rendered = renderWebAnswer(outcome.text, outcome.sources, env);

  // Billed either way: a search that produced nothing citable still cost money,
  // and a ledger that records only successes under-reports the day and lets the
  // cap drift past its ceiling.
  await input.onSearchBilled(outcome, rendered.ok);

  if (!rendered.ok) {
    return { kind: "unavailable", refusal: "no_citations", outcome };
  }
  return { kind: "answer", answer: rendered.answer, outcome };
}
