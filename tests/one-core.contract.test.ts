import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * test:one-core (scoring-core, R63; R-X.13): every scoring function and constant
 * is defined in lib/assessmentCore.ts and nowhere else. The two lexicon modules
 * it re-exports from (score bands, confidence table) are the only other homes.
 * A hit is a defect, never an allowlist entry.
 */

const ROOT = process.cwd();
const ALLOWED = new Set(["lib/assessmentCore.ts", "lib/bandLexicon.ts", "lib/confidenceBands.ts"]);
const NAMES = [
  "computeScore", "alignmentIndex", "alignmentIndexState", "percentileRank", "rankFromTop", "bandFor", "scoreBandFor",
  "displayTierFor", "rankShownFor", "resolveStoredScale", "latestFinalPerFirm", "divergenceState",
  "confidenceBandForSampleSize", "SCALE", "LEGACY_SCALE_MIN", "MIN_CONTRIBUTORS", "MAX_CONTRIBUTOR_SHARE",
  "DIVERGENCE_ALIGNED_WITHIN", "DIVERGENCE_FLAGGED_AT", "DRAFT_SCORE_VERSION", "FINAL_SCORE_VERSION", "RANK_MIN_N",
  "ALIGNMENT_INDEX_MIN_MODULES", "DISPLAY_TIER_MIN_N", "SCORE_BANDS",
];
const DEFINITION = new RegExp(`\\b(?:function|const|let|var|class)\\s+(${NAMES.join("|")})\\b`);
/** Inline copies of the arithmetic the core owns, as they were written before the box. */
const INLINE_COPIES: Array<{ label: string; re: RegExp }> = [
  { label: "rankFromTop formula", re: /n\s*-\s*Math\.round\(\s*\(?\s*\w+\s*\/\s*100\s*\)?\s*\*\s*n\s*\)\s*\+\s*1/ },
  { label: "anchor-interpolation percentile", re: /percentileForValue|distributionAnchors/ },
  { label: "scoreVersion literal", re: /scoreVersion:\s*[01]\b/ },
  { label: "scale fallback literal", re: /(?:scaleMin|min)\s*(?:\?\?|:)\s*1\b[^\n]*\n?[^\n]*(?:scaleMax|max)\s*(?:\?\?|:)\s*5\b/ },
];

function walk(dir: string, out: string[]) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated" || entry === "archive") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts)$/.test(entry) && !/\.test\./.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
}

function sourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of ["lib", "app", "scripts"]) walk(path.join(ROOT, dir), files);
  return files.map((file) => path.relative(ROOT, file)).sort();
}

describe("test:one-core — one scoring module", () => {
  it("no scoring function or constant is defined outside lib/assessmentCore.ts (and the two lexicons it re-exports)", () => {
    const hits: string[] = [];
    for (const rel of sourceFiles()) {
      if (ALLOWED.has(rel)) continue;
      const lines = readFileSync(path.join(ROOT, rel), "utf8").split("\n");
      lines.forEach((line, index) => {
        const match = DEFINITION.exec(line);
        if (match) hits.push(`${rel}:${index + 1} defines ${match[1]}`);
      });
    }
    expect(hits).toEqual([]);
  });

  it("no inline copy of the core's arithmetic survives in lib, app or scripts", () => {
    const hits: string[] = [];
    for (const rel of sourceFiles()) {
      if (ALLOWED.has(rel)) continue;
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      for (const { label, re } of INLINE_COPIES) {
        if (re.test(text)) hits.push(`${rel}: ${label}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("the core exports every name the guard protects", async () => {
    const core = await import("@/lib/assessmentCore");
    for (const name of NAMES) {
      if (name === "scoreBandFor") continue; // re-exported as bandFor
      expect(core, name).toHaveProperty(name);
    }
  });
});
