import { DECLINE_RUNGS, recordPatDecline, type DeclineRung } from "@/lib/patAssistant/declineLog";
import { isPatLadderEnabled } from "@/lib/patAssistant/flags";
import { classifyScope, type ClassifyScopeOptions, type ScopeVerdict } from "@/lib/patAssistant/scopeGate";
import type { RetrievedChunk } from "@/lib/agents/internal-knowledge/retrieve";
import type { PatReply } from "@/lib/patAssistant/model";

/**
 * The answer ladder — rung router (LADDER-1).
 *
 * Cam's approved ladder has five rungs: corpus, live account data, web-grounded,
 * honest decline, human handoff. THIS BOX BUILDS TWO OF THEM — the scope gate in
 * front, and corpus → decline — and the shape of the walk, so the remaining
 * rungs are inserted rather than retrofitted.
 *
 * ## One path, not two
 *
 * The router is NOT a parallel implementation switched on by a flag. With the
 * ladder flag off it skips the scope-gate rung and walks corpus → decline, which
 * is exactly the flow app/api/pat/route.ts already had. That is deliberate: a
 * flag that selects between two implementations of the same journey guarantees
 * they drift, and the one nobody is running is the one that rots. Here the flag
 * ADDS a rung to a single walk, and `tests/pat-ladder.contract.test.ts` asserts
 * the flag-off walk is step-for-step the pre-ladder flow.
 *
 * ## Every exit is logged, and logged once
 *
 * Each rung either answers or declines, and every decline names the rung it
 * declined at, through the one gap log (PatDeclineLog). The router owns that
 * logging so a future rung cannot be added without a rung name — the alternative
 * is a rung that silently drops out of the digest and makes the corpus look
 * healthier than it is.
 */

export type LadderOutcome =
  | { kind: "answer"; reply: PatReply; chunks: RetrievedChunk[]; scope: ScopeVerdict | null }
  | { kind: "decline"; rung: DeclineRung; reason: string; chunks: RetrievedChunk[]; scope: ScopeVerdict | null };

export type LadderInput = {
  question: string;
  audience: string;
  verticalId?: string;
  /** Rung 1 — retrieve from the corpus. Returns [] on a miss. */
  retrieve: () => Promise<RetrievedChunk[]>;
  /** Rung 1 — ground an answer in what retrieval returned. */
  generate: (chunks: RetrievedChunk[]) => Promise<PatReply>;
  /** Presence of the model key. No key means no rung can produce an answer. */
  hasModelKey: () => boolean;
  env?: Record<string, string | undefined>;
  /** Injected for tests; the real gate otherwise. */
  scopeOptions?: ClassifyScopeOptions;
  /** Injected for tests; the real gap log otherwise. */
  recordDecline?: typeof recordPatDecline;
};

/**
 * Walk the ladder.
 *
 * Never throws for an expected outcome — a decline is a result, not an error.
 * A generation failure is genuinely exceptional and is rethrown, because the
 * route distinguishes "we could not answer" (200 + fallback copy) from "we
 * broke" (502), and collapsing those would hide an outage inside a polite
 * message about the help library.
 */
export async function runAnswerLadder(input: LadderInput): Promise<LadderOutcome> {
  const env = input.env ?? process.env;
  const log = input.recordDecline ?? recordPatDecline;

  const decline = async (
    rung: DeclineRung,
    reason: string,
    chunks: RetrievedChunk[],
    scope: ScopeVerdict | null
  ): Promise<LadderOutcome> => {
    // Guarded here as well as inside the logger: "a gap-log failure never
    // reaches the user" is a property of the ladder, not an implementation
    // detail of the logger it happens to call.
    try {
      await log({
        question: input.question,
        audience: input.audience,
        rungReached: rung,
        verticalId: input.verticalId,
      });
    } catch {
      // Deliberately swallowed.
    }
    return { kind: "decline", rung, reason, chunks, scope };
  };

  // --- Rung 0: scope gate (only when the ladder flag is on) -----------------
  let scope: ScopeVerdict | null = null;
  if (isPatLadderEnabled(env)) {
    scope = await classifyScope(input.question, input.scopeOptions);
    if (!scope.inScope) {
      // Declined before retrieval: no corpus read, no generation, and — once the
      // web tier exists — no paid search.
      return decline(DECLINE_RUNGS.SCOPE_GATE, scope.reason, [], scope);
    }
  }

  // No key: no rung can produce a grounded answer, so say so rather than
  // retrieving into a generation that cannot happen.
  if (!input.hasModelKey()) {
    return decline(DECLINE_RUNGS.UNAVAILABLE, "no_model_key", [], scope);
  }

  // --- Rung 1: the corpus ---------------------------------------------------
  const chunks = await input.retrieve();
  if (chunks.length === 0) {
    return decline(DECLINE_RUNGS.CORPUS_MISS, "no_matching_chunks", [], scope);
  }

  const reply = await input.generate(chunks);
  if (reply.insufficientContext) {
    // The corpus matched but could not ground an answer. A distinct rung from a
    // miss on purpose: "we have nothing on this" and "we have something and it
    // was not enough" are different corpus problems with different fixes.
    return decline(DECLINE_RUNGS.CORPUS_INSUFFICIENT, "model_insufficient_context", chunks, scope);
  }

  // --- Rung 2+ (live account data, web tier) are inserted HERE --------------
  // The web tier is LADDER-2, behind PAT_ENABLE_PAT_WEB_TIER, and does not
  // exist yet. It slots between the corpus rung's failure and the decline, not
  // after a successful answer.

  return { kind: "answer", reply, chunks, scope };
}
