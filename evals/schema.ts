/**
 * Eval item + result schema (v1).
 *
 * ONE shape covers every item, deterministic or model-judged, so adding LLM
 * items later is a data change rather than a rework. The discriminator is
 * `judge`:
 *
 *   judge: "exact" — the surface's output is compared to `expect` structurally.
 *                    No model in the loop, no cost, no flake. Every item in v1
 *                    is one of these.
 *   judge: "llm"   — `expect` is advisory and `rubric` carries the grading
 *                    criteria for a model judge. The runner recognises the tag
 *                    today and reports such items as `skipped` with reason
 *                    "no judge configured", so a future judge is a runner
 *                    addition and not a schema migration.
 *
 * Golden files are VERSIONED (`deterministic.v1.json`). Changing an expectation
 * means cutting a new version, not editing history — an eval you can silently
 * edit to match the code is not an eval.
 */

export type Judge = "exact" | "llm";

export type DeterministicSuite = "scoring" | "bands" | "suppression" | "registry";
export type Suite = DeterministicSuite | "retrieval";

/** One deterministic item: call a named surface with `input`, compare to `expect`. */
export interface DeterministicItem {
  /** Stable id. Never reused, never renumbered — failures are cited by it. */
  id: string;
  suite: DeterministicSuite;
  judge: Judge;
  /** Human-readable question. This is what renders in the sales artifact. */
  question: string;
  /** Key into evals/surfaces.ts — the function actually exercised. */
  surface: string;
  input: unknown;
  /** Expected output. For judge:"exact" this is asserted structurally. */
  expect: unknown;
  /** Grading criteria for judge:"llm". Ignored by the exact judge. */
  rubric?: string;
  tags?: string[];
}

/**
 * One retrieval item. `mustRetrieve` holds STABLE chunk references of the form
 * "<sourcePath>#<chunkIdx>", not KnowledgeChunk cuids: cuids are regenerated on
 * every re-index, so a golden set keyed on them would go red the first time the
 * corpus is rebuilt without anything actually regressing.
 */
export interface RetrievalItem {
  id: string;
  suite: "retrieval";
  judge: Judge;
  question: string;
  query: string;
  k: number;
  /** Retrieval walls the call must be made under (Box 1 / S6). */
  kinds: string[];
  roleAccess: string[];
  /** Chunk refs that MUST appear in the top-k. Drives recall. */
  mustRetrieve: string[];
  /** Chunk refs that must NOT appear at any rank. Drives the wall assertions. */
  mustNotRetrieve?: string[];
  rubric?: string;
  tags?: string[];
}

export type GoldenItem = DeterministicItem | RetrievalItem;

export interface GoldenFile<T> {
  version: string;
  suite: Suite | "mixed";
  /** What this set is for, in one line — rendered into the scoreboard header. */
  description: string;
  items: T[];
}

export type ItemStatus = "pass" | "fail" | "skip" | "error";

export interface ItemResult {
  id: string;
  suite: Suite;
  judge: Judge;
  question: string;
  status: ItemStatus;
  /** Why it failed/skipped. Empty on pass. */
  detail?: string;
  expected?: unknown;
  actual?: unknown;
  /** Retrieval only. */
  precision?: number;
  recall?: number;
  /** Retrieval only: was the rank-1 result a gold doc? */
  topOneHit?: boolean;
  durationMs: number;
}

export interface SuiteSummary {
  suite: Suite;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  /** Share of NON-SKIPPED items that passed. Skips never inflate this. */
  passRate: number;
}

/** Aggregate across every suite. Has no `suite` of its own. */
export type Totals = Omit<SuiteSummary, "suite">;

export interface Scoreboard {
  schemaVersion: string;
  generatedAt: string;
  goldenVersions: Record<string, string>;
  totals: Totals;
  suites: SuiteSummary[];
  /** Retrieval aggregate, absent when the corpus was unavailable. */
  retrieval?: {
    /** Share of items whose TOP result is a gold doc. The headline quality number. */
    topOneAccuracy: number;
    /** Share of gold docs found anywhere in the top-k. Gates the suite. */
    macroRecall: number;
    /**
     * Gold docs as a share of everything returned. Structurally capped at 1/k
     * when an item has a single gold doc, so it measures set size as much as
     * quality — reported for completeness, never as a headline.
     */
    macroPrecisionAtK: number;
    k: number;
    itemsScored: number;
  };
  results: ItemResult[];
  /** Non-fatal notes (corpus absent, judge unconfigured, …). */
  notes: string[];
}

/** Deep structural equality with stable key ordering; NaN equals NaN. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Number.isNaN(a) && Number.isNaN(b);
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((entry, index) => deepEqual(entry, b[index]));
  }
  const aKeys = Object.keys(a as Record<string, unknown>).sort();
  const bKeys = Object.keys(b as Record<string, unknown>).sort();
  if (aKeys.length !== bKeys.length || !aKeys.every((key, index) => key === bKeys[index])) {
    return false;
  }
  return aKeys.every((key) =>
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

export function summarize(suite: Suite, results: ItemResult[]): SuiteSummary {
  const scoped = results.filter((result) => result.suite === suite);
  return tally(suite, scoped);
}

export function tally(suite: Suite, scoped: ItemResult[]): SuiteSummary {
  const passed = scoped.filter((r) => r.status === "pass").length;
  const failed = scoped.filter((r) => r.status === "fail").length;
  const skipped = scoped.filter((r) => r.status === "skip").length;
  const errored = scoped.filter((r) => r.status === "error").length;
  const judged = scoped.length - skipped;
  return {
    suite,
    total: scoped.length,
    passed,
    failed,
    skipped,
    errored,
    passRate: judged === 0 ? 0 : passed / judged,
  };
}
