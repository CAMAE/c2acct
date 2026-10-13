import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { articleFor, formatPoints } from "@/lib/lexicon";
import { formatDelta, formatScoreValue } from "@/lib/formatDelta";
import { gapPlanRowMeta } from "@/lib/eliteInsightsV2";
import { customerCopyFiles } from "./helpers/copyScan";

/**
 * guard:number-grammar (box-c, R65 item 2): a number interpolated into prose
 * never reads "1 pts", "A 8", "A 11", "A 18", or a two-decimal delta. The two
 * helpers in lib/lexicon.ts are the only way a template says points or an
 * article before a number; formatDelta shows one decimal at most. The source
 * scan below fails on the raw patterns the helpers replaced.
 */
const ROOT = path.resolve(__dirname, "..");
const N = [1, 8, 11, 18] as const;

describe("guard:number-grammar — helpers at n = 1, 8, 11, 18", () => {
  it("formatPoints: singular at 1, plural otherwise, one decimal at most", () => {
    expect(N.map(formatPoints)).toEqual(["1 pt", "8 pts", "11 pts", "18 pts"]);
    expect(formatPoints(6.8)).toBe("6.8 pts");
    expect(formatPoints(6.8)).not.toMatch(/\.\d{2}/);
    expect(formatPoints(8.6)).toBe("8.6 pts");
    expect(formatPoints(1.0)).toBe("1 pt");
    expect(formatPoints(-3)).toBe("3 pts");
  });

  it("articleFor: an before 8, 11, 18 and the eighties; a otherwise", () => {
    expect(N.map((n) => articleFor(n))).toEqual(["a", "an", "an", "an"]);
    expect(articleFor(80)).toBe("an");
    expect(articleFor(21)).toBe("a");
    expect(articleFor(110)).toBe("a");
    expect(articleFor(8.6, true)).toBe("An");
    expect(articleFor("18.5")).toBe("an");
  });

  it("formatDelta and formatScoreValue carry one decimal at most (-8.60 reads -8.6)", () => {
    expect(formatDelta(-8.6)).toBe("-8.6");
    expect(formatDelta(-8.604)).toBe("-8.6");
    expect(formatDelta(7.8)).toBe("+7.8");
    expect(formatDelta(0)).toBe("0");
    expect(formatScoreValue(72.5)).toBe("72.5");
    for (const n of N) expect(formatDelta(n)).toBe(`+${n}`);
    expect([formatDelta(-8.6), formatDelta(7.8), formatScoreValue(72.5)].some((v) => /\.\d{2}/.test(v))).toBe(false);
  });

  it("templates that take a number read correctly at every n", () => {
    for (const n of N) {
      const meta = gapPlanRowMeta({ gap: n, threshold: 65 });
      expect(meta).toBe(`${formatPoints(n)} under 65%`);
      expect(meta).not.toMatch(/\b1 pts\b/);
      const article = `${articleFor(n, true)} ${n}-point spread`;
      expect(article).not.toMatch(/\bA (8|11|18)\b/);
    }
  });
});

describe("guard:number-grammar — source scan of rendered copy", () => {
  it("no template interpolates a bare number before pts, after A/a, or renders a two-decimal delta", () => {
    const patterns: Array<{ label: string; re: RegExp }> = [
      { label: "`${n} pts`", re: /\$\{[^}`]+\} ?pts\b/ },
      { label: "{n} pts in JSX", re: /\{[^}]+\} pts\b/ },
      { label: "A ${n}", re: /\bA \$\{/ },
      { label: "a ${n}-point", re: /\ba \$\{[^}]+\}-point/ },
      // a displayed delta, gap, divergence or score with two decimals; SVG coordinates and the 0-to-1 integrity score are not copy
      { label: "toFixed(2) on a displayed delta", re: /(delta|gap|divergence|points?|score)[A-Za-z]*\)?\.toFixed\(2\)/i },
    ];
    const SVG_BUILDERS = /(Radar|Chart|Wordmark|Figure|Lockup|Sparkline|Heatmap)[A-Za-z]*\.tsx$/;
    const hits: string[] = [];
    for (const rel of customerCopyFiles()) {
      if (!/\.tsx?$/.test(rel)) continue;
      if (SVG_BUILDERS.test(rel)) continue; // path commands ("A r r 0 0 1 x y") and coordinates, not prose
      const source = readFileSync(path.join(ROOT, rel), "utf8");
      source.split("\n").forEach((line, index) => {
        if (/\b[MLAZ] \$\{|toFixed\(2\)\}?,|cx=|cy=|x2=|y2=/.test(line) && !/pts|point/.test(line)) return; // SVG path or attribute
        if (/integrity/i.test(line)) return; // the 0-to-1 signal-integrity score is shown to two places by design, not a delta
        for (const pattern of patterns) {
          if (pattern.re.test(line) && !/formatPoints\(|articleFor\(/.test(line)) hits.push(`${rel}:${index + 1} [${pattern.label}] ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(hits, `\n${hits.join("\n")}\n`).toEqual([]);
  });
});
