import type { AssessmentQuestionRuntime, NormalizedAnswer } from "@/lib/assessmentRuntime";

export const COMPANY_CAPABILITY_SCORE_VERSION = 1;

export type CapabilityQuestionMapping = {
  questionId: string;
  questionKey: string;
  nodeId: string;
  weight: number;
};

export type CapabilityScoreResult = {
  nodeId: string;
  score: number;
  answeredQuestionCount: number;
  totalWeight: number;
};

export type CapabilityScoringDiagnostics = {
  unmappedQuestionIds: string[];
  unmappedQuestionKeys: string[];
  unansweredQuestionIds: string[];
  questionsMissingScale: string[];
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getAssessmentScoreScale(questions: AssessmentQuestionRuntime[]) {
  const sliderQuestions = questions.filter(
    (question) => question.inputType === "SLIDER" && question.validation.slider
  );

  if (sliderQuestions.length > 0) {
    return {
      min: Math.min(...sliderQuestions.map((question) => question.validation.slider!.min)),
      max: Math.max(...sliderQuestions.map((question) => question.validation.slider!.max)),
    };
  }

  return { min: 1, max: 5 };
}

function getQuestionScale(question: AssessmentQuestionRuntime) {
  if (question.inputType === "SLIDER" && question.validation.slider) {
    return {
      min: question.validation.slider.min,
      max: question.validation.slider.max,
    };
  }

  if (
    question.inputType === "NUMBER" &&
    typeof question.validation.number?.min === "number" &&
    typeof question.validation.number?.max === "number"
  ) {
    return {
      min: question.validation.number.min,
      max: question.validation.number.max,
    };
  }

  return null;
}

function normalizeAnswerToPercent(
  value: number,
  scale: { min: number; max: number }
) {
  const denominator = scale.max - scale.min;
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  const normalized = ((value - scale.min) / denominator) * 100;
  return Math.max(0, Math.min(100, normalized));
}

export function computeCapabilityScores(input: {
  questions: AssessmentQuestionRuntime[];
  answers: Record<string, NormalizedAnswer>;
  mappings: CapabilityQuestionMapping[];
}) {
  const mappingByQuestionId = new Map<string, CapabilityQuestionMapping[]>();
  for (const mapping of input.mappings) {
    const existing = mappingByQuestionId.get(mapping.questionId) ?? [];
    existing.push(mapping);
    mappingByQuestionId.set(mapping.questionId, existing);
  }

  const diagnostics: CapabilityScoringDiagnostics = {
    unmappedQuestionIds: [],
    unmappedQuestionKeys: [],
    unansweredQuestionIds: [],
    questionsMissingScale: [],
  };

  const accumulation = new Map<
    string,
    {
      weightedScoreTotal: number;
      totalWeight: number;
      answeredQuestionIds: Set<string>;
    }
  >();

  for (const question of input.questions) {
    const answer = input.answers[question.id];
    if (typeof answer !== "number" || !Number.isFinite(answer)) {
      diagnostics.unansweredQuestionIds.push(question.id);
      continue;
    }

    const questionMappings = mappingByQuestionId.get(question.id) ?? [];
    if (questionMappings.length === 0) {
      diagnostics.unmappedQuestionIds.push(question.id);
      diagnostics.unmappedQuestionKeys.push(question.key);
      continue;
    }

    const scale = getQuestionScale(question);
    if (!scale) {
      diagnostics.questionsMissingScale.push(question.key);
      continue;
    }

    const normalizedScore = normalizeAnswerToPercent(answer, scale);
    if (normalizedScore === null) {
      diagnostics.questionsMissingScale.push(question.key);
      continue;
    }

    for (const mapping of questionMappings) {
      const next = accumulation.get(mapping.nodeId) ?? {
        weightedScoreTotal: 0,
        totalWeight: 0,
        answeredQuestionIds: new Set<string>(),
      };

      const effectiveWeight = question.weight * mapping.weight;
      next.weightedScoreTotal += normalizedScore * effectiveWeight;
      next.totalWeight += effectiveWeight;
      next.answeredQuestionIds.add(question.id);
      accumulation.set(mapping.nodeId, next);
    }
  }

  const scores: CapabilityScoreResult[] = Array.from(accumulation.entries())
    .map(([nodeId, entry]) => ({
      nodeId,
      score: round2(entry.weightedScoreTotal / entry.totalWeight),
      answeredQuestionCount: entry.answeredQuestionIds.size,
      totalWeight: round2(entry.totalWeight),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.totalWeight > 0)
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId));

  return {
    scores,
    diagnostics,
  };
}
