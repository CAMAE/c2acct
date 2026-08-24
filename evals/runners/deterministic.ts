import { promises as fs } from "node:fs";
import { getSurface } from "../surfaces";
import { deepEqual, type DeterministicItem, type GoldenFile, type ItemResult } from "../schema";

/**
 * Exact-assert runner. No model, no network, no database — every item is a pure
 * function call compared structurally against its recorded expectation.
 *
 * An item whose `judge` is not "exact" is reported as SKIPPED rather than
 * passed. Counting an ungraded item as a pass is how eval suites quietly rot;
 * skips are excluded from the pass rate and surfaced in the scoreboard.
 */
export async function runDeterministic(file: string): Promise<{
  results: ItemResult[];
  version: string;
  notes: string[];
}> {
  const golden = JSON.parse(await fs.readFile(file, "utf8")) as GoldenFile<DeterministicItem>;
  const results: ItemResult[] = [];
  const notes: string[] = [];
  let unjudged = 0;

  for (const item of golden.items) {
    const startedAt = performance.now();
    const base = {
      id: item.id,
      suite: item.suite,
      judge: item.judge,
      question: item.question,
    };

    if (item.judge !== "exact") {
      unjudged += 1;
      results.push({
        ...base,
        status: "skip",
        detail: `judge "${item.judge}" is not configured in this runner`,
        durationMs: performance.now() - startedAt,
      });
      continue;
    }

    const surface = getSurface(item.surface);
    if (!surface) {
      results.push({
        ...base,
        status: "error",
        detail: `unknown surface "${item.surface}" — it is not registered in evals/surfaces.ts`,
        durationMs: performance.now() - startedAt,
      });
      continue;
    }

    try {
      const actual = surface(item.input);
      const ok = deepEqual(actual, item.expect);
      results.push({
        ...base,
        status: ok ? "pass" : "fail",
        detail: ok ? undefined : "output did not match the recorded expectation",
        expected: ok ? undefined : item.expect,
        actual: ok ? undefined : actual,
        durationMs: performance.now() - startedAt,
      });
    } catch (error) {
      results.push({
        ...base,
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - startedAt,
      });
    }
  }

  if (unjudged > 0) {
    notes.push(`${unjudged} item(s) carry a non-exact judge and were skipped (no LLM judge configured).`);
  }
  return { results, version: golden.version, notes };
}
