export type IntegrityMeta = {
  coverage?: number;
  numericAnswered?: number;
  numericDistinct?: number;
  numericVar?: number;
  extremeRatio?: number;
  textAnswered?: number;
  textTooShortRatio?: number;
};

export type IntegrityResult = {
  score: number;
  flags: string[];
  meta: IntegrityMeta;
};

type AnswerValue = number | boolean | string | string[] | null | undefined;
type Answers = Record<string, AnswerValue>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function hasAnswerValue(value: AnswerValue): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function evaluateSignalIntegrity(
  answers: Answers,
  opts?: {
    expectedQuestionCount?: number;
    scaleMin?: number;
    scaleMax?: number;
  }
): IntegrityResult {
  const flags: string[] = [];
  const meta: IntegrityMeta = {};

  const scaleMin = opts?.scaleMin ?? 1;
  const scaleMax = opts?.scaleMax ?? 5;
  const keys = Object.keys(answers ?? {});
  const answeredCount = keys.filter((key) => hasAnswerValue(answers[key])).length;

  const expected = opts?.expectedQuestionCount;
  const coverage = expected && expected > 0 ? answeredCount / expected : undefined;

  if (coverage !== undefined) {
    meta.coverage = round3(coverage);
    if (coverage < 0.6) {
      flags.push("LOW_COVERAGE");
    } else if (coverage < 0.8) {
      flags.push("MED_COVERAGE");
    }
  }

  const numeric: number[] = [];
  for (const key of keys) {
    const value = answers[key];
    if (isFiniteNumber(value)) {
      numeric.push(value);
    }
  }

  meta.numericAnswered = numeric.length;

  if (numeric.length >= 6) {
    const distinct = new Set(numeric).size;
    meta.numericDistinct = distinct;

    if (distinct === 1) {
      flags.push("STRAIGHTLINING_ALL_SAME");
    }

    const mean = numeric.reduce((left, right) => left + right, 0) / numeric.length;
    const variance = numeric.reduce((left, right) => left + Math.pow(right - mean, 2), 0) / numeric.length;
    meta.numericVar = round3(variance);

    if (distinct <= 2 && variance < 0.35) {
      flags.push("LOW_VARIANCE_STICKY");
    }

    const minCount = numeric.filter((value) => value === scaleMin).length;
    const maxCount = numeric.filter((value) => value === scaleMax).length;
    const extremeRatio = (minCount + maxCount) / numeric.length;
    meta.extremeRatio = round3(extremeRatio);

    if (extremeRatio >= 0.85) {
      flags.push("EXTREME_SKEW");
    } else if (extremeRatio >= 0.7) {
      flags.push("HIGH_EXTREME_SKEW");
    }
  } else if (numeric.length > 0) {
    flags.push("LOW_NUMERIC_SAMPLE");
  }

  const textValues: string[] = [];
  for (const key of keys) {
    const value = answers[key];
    if (typeof value === "string") {
      const normalized = value.trim();
      if (normalized.length > 0) {
        textValues.push(normalized);
      }
    }
  }

  meta.textAnswered = textValues.length;

  if (textValues.length >= 1) {
    const tooShortRatio = textValues.filter((value) => value.length < 6).length / textValues.length;
    meta.textTooShortRatio = round3(tooShortRatio);
    if (tooShortRatio >= 0.6) {
      flags.push("TEXT_TOO_SHORT");
    }

    if (new Set(textValues.map((value) => value.toLowerCase())).size === 1 && textValues.length >= 2) {
      flags.push("TEXT_REPEATED");
    }
  }

  if (expected === undefined) {
    if (answeredCount < 6) {
      flags.push("VERY_LOW_ANSWER_COUNT");
    } else if (answeredCount < 12) {
      flags.push("LOW_ANSWER_COUNT");
    }
  }

  let score = 1;
  const penalty = (flag: string, amount: number) => {
    if (flags.includes(flag)) {
      score -= amount;
    }
  };

  penalty("LOW_COVERAGE", 0.35);
  penalty("MED_COVERAGE", 0.18);
  penalty("VERY_LOW_ANSWER_COUNT", 0.35);
  penalty("LOW_ANSWER_COUNT", 0.15);
  penalty("LOW_NUMERIC_SAMPLE", 0.1);
  penalty("STRAIGHTLINING_ALL_SAME", 0.3);
  penalty("LOW_VARIANCE_STICKY", 0.18);
  penalty("EXTREME_SKEW", 0.18);
  penalty("HIGH_EXTREME_SKEW", 0.1);
  penalty("TEXT_TOO_SHORT", 0.12);
  penalty("TEXT_REPEATED", 0.12);

  return {
    score: round3(clamp01(score)),
    flags,
    meta,
  };
}
