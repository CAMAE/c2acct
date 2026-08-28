import { DECLINE_RUNGS, recordPatDecline, type DeclineRung } from "@/lib/patAssistant/declineLog";
import { isPatLadderEnabled } from "@/lib/patAssistant/flags";
import { classifyScope, type ClassifyScopeOptions, type ScopeVerdict } from "@/lib/patAssistant/scopeGate";
import type { RetrievedChunk } from "@/lib/agents/internal-knowledge/retrieve";
import type { PatReply } from "@/lib/patAssistant/model";
import type { WebRungResult } from "@/lib/patAssistant/web/rung";
import type { RenderedWebAnswer } from "@/lib/patAssistant/web/render";

/**
 * The answer ladder — rung router (LADDER-1).
 *
 * Cam's approved ladder has five rungs: corpus, live account data, web-grounded,
 * honest decline, human handoff. LADDER-1 built the scope gate, the corpus rung
 * and the decline; LADDER-2 inserted the WEB rung between them.
 *
 * ## Where the web rung sits, and why it is tried twice
 *
 * The web rung is attempted at BOTH ways the corpus rung can fail — a miss (the
 * corpus had nothing) and insufficient context (the corpus had something that
 * could not ground an answer). Both are "Patalign's documentation cannot answer
 * this", which is the precondition for looking outward.
 *
 * It is never attempted after a SUCCESSFUL corpus answer. Patalign's own
 * documentation is the better source whenever it has one, and paying a search
 * to second-guess it would be both wasteful and wrong.
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
  /**
   * A web-grounded answer. A DIFFERENT outcome kind from a corpus answer on
   * purpose: it renders with mandatory citations and the provenance label, and
   * giving it the same shape as a corpus answer would let a caller display it
   * through the corpus path and lose both.
   */
  | { kind: "web-answer"; answer: RenderedWebAnswer; chunks: RetrievedChunk[]; scope: ScopeVerdict | null }
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
  /**
   * Attempt the web rung (LADDER-2). Absent = the rung does not exist for this
   * caller, which is how the route expresses "web tier not wired here" without
   * the ladder needing to know why.
   *
   * Injected rather than imported so the ladder stays decoupled from the
   * provider, the caps and the database that back it.
   */
  attemptWeb?: (scope: ScopeVerdict | null) => Promise<WebRungResult>;
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

  /**
   * --- Rung 3: the web (LADDER-2) ------------------------------------------
   *
   * Tried only after the corpus has failed, and only when every wall in
   * runWebRung() passes. An unavailable web rung is not an error: the walk
   * simply continues to the decline it was already heading for, carrying the
   * corpus's own rung name unless the web rung was actually ATTEMPTED.
   *
   * `corpusRung` is the rung the walk would have declined at without the web —
   * so a caller reading the gap log sees how far the question really got.
   */
  const tryWebThenDecline = async (
    corpusRung: DeclineRung,
    corpusReason: string,
    chunks: RetrievedChunk[]
  ): Promise<LadderOutcome> => {
    if (!input.attemptWeb) {
      return decline(corpusRung, corpusReason, chunks, scope);
    }

    const web = await input.attemptWeb(scope);
    if (web.kind === "answer") {
      return { kind: "web-answer", answer: web.answer, chunks, scope };
    }

    // The web rung ran far enough to be billed or to fail on its own terms, so
    // the gap it represents is a WEB gap. A wall refusal (flag off, no provider,
    // wrong audience, unconfident scope) means the rung never really ran, so the
    // corpus keeps ownership of the decline and the digest keeps reading true.
    const attempted = web.refusal === "no_citations" || web.refusal === "provider_error";
    return attempted
      ? decline(DECLINE_RUNGS.WEB, web.refusal, chunks, scope)
      : decline(corpusRung, corpusReason, chunks, scope);
  };

  // --- Rung 1: the corpus ---------------------------------------------------
  const chunks = await input.retrieve();
  if (chunks.length === 0) {
    return tryWebThenDecline(DECLINE_RUNGS.CORPUS_MISS, "no_matching_chunks", []);
  }

  const reply = await input.generate(chunks);
  if (reply.insufficientContext) {
    // The corpus matched but could not ground an answer. A distinct rung from a
    // miss on purpose: "we have nothing on this" and "we have something and it
    // was not enough" are different corpus problems with different fixes.
    return tryWebThenDecline(DECLINE_RUNGS.CORPUS_INSUFFICIENT, "model_insufficient_context", chunks);
  }

  // Rung 2 (live account data, Big Brain Pat Phase C) inserts HERE, between the
  // corpus rung's failure and the web rung — never after this successful return.
  return { kind: "answer", reply, chunks, scope };
}
