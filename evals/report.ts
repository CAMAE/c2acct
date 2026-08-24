import type { ItemResult, Scoreboard, Suite, SuiteSummary, Totals } from "./schema";
import { tally } from "./schema";

export const SCOREBOARD_SCHEMA_VERSION = "1.0";

const SUITE_LABEL: Record<Suite, string> = {
  scoring: "Scoring",
  bands: "Maturity bands",
  suppression: "Benchmark suppression",
  registry: "Registry lookups",
  retrieval: "Retrieval",
};

const SUITE_BLURB: Record<Suite, string> = {
  scoring: "Score computation, confidence adjustment, and the signal-integrity clamp.",
  bands: "The one band lexicon: every 0–100 score maps to exactly one published band.",
  suppression: "k-anonymity: no benchmark publishes below 5 contributors or under single-firm dominance.",
  registry: "The question architecture and canonical key sets are pinned and unique.",
  retrieval: "Help retrieval through its mandatory kind + audience walls.",
};

export function buildScoreboard(input: {
  results: ItemResult[];
  goldenVersions: Record<string, string>;
  notes: string[];
  retrieval?: Scoreboard["retrieval"];
  generatedAt: string;
}): Scoreboard {
  const suites = (Object.keys(SUITE_LABEL) as Suite[])
    .map((suite) => tally(suite, input.results.filter((result) => result.suite === suite)))
    .filter((summary) => summary.total > 0);

  return {
    schemaVersion: SCOREBOARD_SCHEMA_VERSION,
    generatedAt: input.generatedAt,
    goldenVersions: input.goldenVersions,
    totals: aggregateTotals(input.results),
    suites,
    retrieval: input.retrieval,
    results: input.results,
    notes: input.notes,
  };
}

/** Aggregate over every result regardless of suite. */
function aggregateTotals(results: ItemResult[]): Totals {
  // tally()'s first argument only labels the row, and the totals row has no
  // suite of its own — so the label is discarded and the arithmetic is applied
  // to the unfiltered result set.
  const summary = tally("scoring", results);
  return {
    total: summary.total,
    passed: summary.passed,
    failed: summary.failed,
    skipped: summary.skipped,
    errored: summary.errored,
    passRate: summary.passRate,
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function statusChip(summary: SuiteSummary): string {
  if (summary.errored > 0) return "🟥 ERROR";
  if (summary.failed > 0) return "🟥 FAIL";
  if (summary.total === summary.skipped) return "⬜ SKIPPED";
  if (summary.skipped > 0) return "🟨 PASS (partial)";
  return "🟩 PASS";
}

/**
 * Markdown scoreboard.
 *
 * This file is read by two audiences: an engineer triaging a red CI run, and a
 * prospect asking "how do you test this?". It leads with the headline and the
 * method, keeps failures specific and citable by item id, and never rounds a
 * skip into a pass.
 */
export function renderMarkdown(board: Scoreboard): string {
  const t = board.totals;
  const lines: string[] = [];

  lines.push("# How we test Pat — eval scoreboard");
  lines.push("");
  lines.push(
    "Patalign's deterministic surfaces are covered by a versioned golden set that runs on every pull request. " +
      "Each item is an exact assertion against shipped product code — no model grades these, so a green board means " +
      "the arithmetic, the published thresholds, and the canonical key sets are provably unchanged."
  );
  lines.push("");
  lines.push(`**Generated:** ${board.generatedAt}  `);
  lines.push(
    `**Golden sets:** ${Object.entries(board.goldenVersions).map(([name, version]) => `\`${name}\` @ ${version}`).join(", ")}`
  );
  lines.push("");

  const headline = t.errored > 0 || t.failed > 0 ? "🟥 **REGRESSION**" : "🟩 **ALL GREEN**";
  lines.push("## Headline");
  lines.push("");
  lines.push(
    `${headline} — **${t.passed}/${t.total - t.skipped} judged items passing** (${pct(t.passRate)})` +
      (t.skipped > 0 ? `, ${t.skipped} skipped.` : ".")
  );
  lines.push("");

  lines.push("| | Items | Passed | Failed | Skipped | Pass rate |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const summary of board.suites) {
    lines.push(
      `| ${statusChip(summary)} **${SUITE_LABEL[summary.suite]}** | ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.skipped} | ${summary.total === summary.skipped ? "—" : pct(summary.passRate)} |`
    );
  }
  lines.push(
    `| **Total** | **${t.total}** | **${t.passed}** | **${t.failed}** | **${t.skipped}** | **${t.total === t.skipped ? "—" : pct(t.passRate)}** |`
  );
  lines.push("");

  lines.push("## What each suite proves");
  lines.push("");
  for (const summary of board.suites) {
    lines.push(`- **${SUITE_LABEL[summary.suite]}** (${summary.total}) — ${SUITE_BLURB[summary.suite]}`);
  }
  lines.push("");

  if (board.retrieval) {
    lines.push("## Retrieval quality");
    lines.push("");
    lines.push(
      "Retrieval items call the same walled entry point production uses: every query declares the source kinds and " +
        "the audience it is allowed to read, and the walls are enforced in SQL rather than by prompting."
    );
    lines.push("");
    const r = board.retrieval;
    const ceiling = r.k > 0 ? ` (structural ceiling ${pct(1 / r.k)} at k=${r.k})` : "";
    lines.push("| Metric | Value | |");
    lines.push("|---|---:|---|");
    lines.push(`| **Top-1 accuracy** | **${pct(r.topOneAccuracy)}** | the expected doc ranked first |`);
    lines.push(`| **Recall@${r.k || "k"}** | **${pct(r.macroRecall)}** | the expected doc appeared in the top-k — this gates the suite |`);
    lines.push(`| Precision@${r.k || "k"} | ${pct(r.macroPrecisionAtK)} | gold docs as a share of all results${ceiling} |`);
    lines.push(`| Items scored | ${r.itemsScored} | excludes the wall-assertion item, which has no gold doc |`);
    lines.push("");
    lines.push(
      "> **Read precision@k with care.** Each of these questions has exactly ONE correct help doc, so returning " +
        `k=${r.k || "k"} results caps precision at ${r.k > 0 ? pct(1 / r.k) : "1/k"} no matter how good retrieval is — it measures result-set ` +
        "size as much as quality. Top-1 accuracy and recall are the meaningful numbers; precision is included " +
        "because it is the conventional companion metric, not because it is the one to optimize."
    );
    lines.push("");
    lines.push(
      "Recall gates the suite; precision does not. A query that surfaces the right doc alongside other genuinely " +
        "relevant ones is behaving correctly, and failing it would push the corpus toward brittle single-hit queries."
    );
    lines.push("");
  }

  const problems = board.results.filter((result) => result.status === "fail" || result.status === "error");
  lines.push("## Failures");
  lines.push("");
  if (problems.length === 0) {
    lines.push("None.");
  } else {
    for (const problem of problems) {
      lines.push(`### ${problem.status === "error" ? "🟥 ERROR" : "🟥 FAIL"} \`${problem.id}\``);
      lines.push("");
      lines.push(`*${problem.question}*`);
      lines.push("");
      if (problem.detail) lines.push(`**Detail:** ${problem.detail}`);
      if (problem.expected !== undefined) {
        lines.push("");
        lines.push("```json");
        lines.push(`expected: ${JSON.stringify(problem.expected)}`);
        lines.push(`actual:   ${JSON.stringify(problem.actual)}`);
        lines.push("```");
      }
      lines.push("");
    }
  }
  lines.push("");

  const skipped = board.results.filter((result) => result.status === "skip");
  if (skipped.length > 0) {
    lines.push("## Skipped");
    lines.push("");
    lines.push(`${skipped.length} item(s) were not judged. Skips are excluded from the pass rate above.`);
    lines.push("");
    const reasons = new Map<string, number>();
    for (const item of skipped) {
      const reason = item.detail ?? "unspecified";
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
    for (const [reason, count] of reasons) {
      lines.push(`- ${count}× ${reason}`);
    }
    lines.push("");
  }

  if (board.notes.length > 0) {
    lines.push("## Notes");
    lines.push("");
    for (const note of board.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  lines.push("## Method");
  lines.push("");
  lines.push(
    "- **Exact assertions, not snapshots.** Expected values are derived from the published rule (band boundaries, " +
      "the 5-contributor floor, the 25% dominance cap, the score formula), not captured from a previous run — so a " +
      "change that breaks the rule fails rather than silently re-baselining."
  );
  lines.push(
    "- **Versioned golden sets.** Changing an expectation means cutting a new version, not editing history."
  );
  lines.push(
    "- **Skips never count as passes.** An unavailable corpus or an unconfigured judge is reported as a skip and " +
      "excluded from the pass rate."
  );
  lines.push(
    '- **Ready for model-judged items.** Every item carries `judge: "exact" | "llm"`. Adding LLM-graded items is a ' +
      "data change plus a judge runner; the schema, scoreboard, and CI wiring do not change."
  );
  lines.push("");
  lines.push("Run it yourself: `pnpm eval`.");
  lines.push("");

  return lines.join("\n");
}
