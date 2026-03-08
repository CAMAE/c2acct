
export type IntegrityResult = {
  score: number;          // 0..1 (1 = highest confidence)
  flags: string[];        // machine-readable flags
  meta: Record<string, any>;
};

type Answers = Record<string, any>;

function isNumberLike(v: any) {
  return typeof v === "number" && Number.isFinite(v);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

/**
 * v1 heuristic integrity evaluation:
 * - coverage (answered / expected)
 * - straightlining on numeric scale answers
 * - extreme skew (too many 1s/5s)
 * - low variance (almost all same)
 * - text answers too short / suspicious
 * - mixed-type sanity checks
 *
 * NOTE: This is intentionally conservative. It should reduce confidence, not "accuse".
 */
export function evaluateSignalIntegrity(
  answers: Answers,
  opts?: {
    expectedQuestionCount?: number; // if provided, boosts accuracy of coverage calc
    scaleMin?: number;             // default 1
    scaleMax?: number;             // default 5
  }
): IntegrityResult {
  const flags: string[] = [];
  const meta: Record<string, any> = {};

  const scaleMin = opts?.scaleMin ?? 1;
  const scaleMax = opts?.scaleMax ?? 5;

  const keys = Object.keys(answers ?? {});
  const answeredCount = keys.filter(k => answers[k] !== null && answers[k] !== undefined && answers[k] !== "").length;

  const expected = opts?.expectedQuestionCount;
  const coverage = expected && expected > 0 ? answeredCount / expected : undefined;

  if (coverage !== undefined) {
    meta.coverage = round3(coverage);
    if (coverage < 0.6) flags.push("LOW_COVERAGE");
    else if (coverage < 0.8) flags.push("MED_COVERAGE");
  }

  // Numeric scale answers (ignore text/multi-choice strings)
  const numeric: number[] = [];
  const numericKeys: string[] = [];
  for (const k of keys) {
    const v = answers[k];
    if (isNumberLike(v)) {
      numeric.push(v);
      numericKeys.push(k);
    }
  }

  meta.numericAnswered = numeric.length;

  // Straightlining / low variance checks (only meaningful if enough numeric answers)
  if (numeric.length >= 6) {
    const distinct = new Set(numeric).size;
    meta.numericDistinct = distinct;

    if (distinct === 1) flags.push("STRAIGHTLINING_ALL_SAME");

    // variance-like metric
    const mean = numeric.reduce((a,b)=>a+b,0) / numeric.length;
    const varN = numeric.reduce((a,b)=>a + Math.pow(b-mean,2),0) / numeric.length;
    meta.numericVar = round3(varN);

    if (distinct <= 2 && varN < 0.35) flags.push("LOW_VARIANCE_STICKY");

    // extreme skew
    const minCount = numeric.filter(n => n === scaleMin).length;
    const maxCount = numeric.filter(n => n === scaleMax).length;
    const extremeRatio = (minCount + maxCount) / numeric.length;
    meta.extremeRatio = round3(extremeRatio);

    if (extremeRatio >= 0.85) flags.push("EXTREME_SKEW");
    else if (extremeRatio >= 0.7) flags.push("HIGH_EXTREME_SKEW");
  } else if (numeric.length > 0 && numeric.length < 6) {
    flags.push("LOW_NUMERIC_SAMPLE");
  }

  // Text answers: short / suspicious
  const textVals: string[] = [];
  for (const k of keys) {
    const v = answers[k];
    if (typeof v === "string") {
      const s = v.trim();
      if (s.length > 0) textVals.push(s);
    }
  }
  meta.textAnswered = textVals.length;

  if (textVals.length >= 1) {
    const tooShort = textVals.filter(s => s.length < 6).length / textVals.length;
    meta.textTooShortRatio = round3(tooShort);
    if (tooShort >= 0.6) flags.push("TEXT_TOO_SHORT");

    // repeated identical text
    if (new Set(textVals.map(s => s.toLowerCase())).size === 1 && textVals.length >= 2) {
      flags.push("TEXT_REPEATED");
    }
  }

  // Coverage fallback if expected count not provided:
  // penalize tiny responses overall
  if (expected === undefined) {
    if (answeredCount < 6) flags.push("VERY_LOW_ANSWER_COUNT");
    else if (answeredCount < 12) flags.push("LOW_ANSWER_COUNT");
  }

  // Score synthesis (0..1): start at 1 and subtract penalties
  let score = 1;

  const penalty = (flag: string, amt: number) => {
    if (flags.includes(flag)) score -= amt;
  };

  penalty("LOW_COVERAGE", 0.35);
  penalty("MED_COVERAGE", 0.18);
  penalty("VERY_LOW_ANSWER_COUNT", 0.35);
  penalty("LOW_ANSWER_COUNT", 0.15);
  penalty("LOW_NUMERIC_SAMPLE", 0.10);
  penalty("STRAIGHTLINING_ALL_SAME", 0.30);
  penalty("LOW_VARIANCE_STICKY", 0.18);
  penalty("EXTREME_SKEW", 0.18);
  penalty("HIGH_EXTREME_SKEW", 0.10);
  penalty("TEXT_TOO_SHORT", 0.12);
  penalty("TEXT_REPEATED", 0.12);

  // Bound + round
  score = clamp01(score);
  score = round3(score);

  return { score, flags, meta };
}
