export type ProductDimensionKey =
  | "positioningClarity"
  | "workflowFit"
  | "integrationReadiness"
  | "supportConfidence";

export type ProductDimensionScores = Record<ProductDimensionKey, number | null>;

const SCALE_MIN = 1;
const SCALE_MAX = 5;

const DIMENSION_TO_QUESTION_KEY: Record<ProductDimensionKey, string> = {
  positioningClarity: "product_fit_q1",
  workflowFit: "product_fit_q2",
  integrationReadiness: "product_fit_q3",
  supportConfidence: "product_fit_q4",
};

function normalizeTo100(rawValue: number): number {
  const normalized = ((rawValue - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
  return Math.round(normalized);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

export function computeVendorProductDimensionScores(params: {
  answers: unknown;
  questionKeyById: Map<string, string>;
}): ProductDimensionScores {
  const { answers, questionKeyById } = params;

  const base: ProductDimensionScores = {
    positioningClarity: null,
    workflowFit: null,
    integrationReadiness: null,
    supportConfidence: null,
  };

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return base;
  }

  const rawAnswers = answers as Record<string, unknown>;

  for (const [dimensionKey, questionKey] of Object.entries(DIMENSION_TO_QUESTION_KEY) as Array<
    [ProductDimensionKey, string]
  >) {
    const matchingQuestionId = Array.from(questionKeyById.entries()).find(([, key]) => key === questionKey)?.[0] ?? null;
    if (!matchingQuestionId) {
      continue;
    }

    const rawValue = toFiniteNumber(rawAnswers[matchingQuestionId]);
    if (rawValue === null) {
      continue;
    }

    if (rawValue < SCALE_MIN || rawValue > SCALE_MAX) {
      continue;
    }

    base[dimensionKey] = normalizeTo100(rawValue);
  }

  return base;
}
