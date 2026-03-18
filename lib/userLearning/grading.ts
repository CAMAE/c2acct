import type { LearningAssessment, LearningQuestion } from "@/lib/userLearning/types";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
}

function significantTokens(value: string) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length >= 4);
}

function gradeShortAnswer(expected: string, actual: string) {
  const expectedTokens = significantTokens(expected);
  const actualTokens = new Set(significantTokens(actual));
  if (expectedTokens.length === 0) {
    return normalize(expected) === normalize(actual);
  }

  const matched = expectedTokens.filter((token) => actualTokens.has(token)).length;
  return matched / expectedTokens.length >= 0.6;
}

export function gradeLearningQuestion(question: LearningQuestion, response: string) {
  const normalizedResponse = response.trim();
  if (!normalizedResponse) {
    return false;
  }

  if (question.kind === "SHORT_ANSWER") {
    return gradeShortAnswer(question.answer, normalizedResponse);
  }

  return normalize(question.answer) === normalize(normalizedResponse);
}

export function gradeLearningAssessment(assessment: LearningAssessment, responses: Record<string, string>) {
  const graded = assessment.questions.map((question) => {
    const response = responses[question.id] ?? "";
    const correct = gradeLearningQuestion(question, response);
    return {
      questionId: question.id,
      correct,
      response,
      question,
    };
  });

  const correctCount = graded.filter((entry) => entry.correct).length;
  const scorePercent = assessment.questions.length === 0 ? 0 : Math.round((correctCount / assessment.questions.length) * 100);
  const passThreshold = 80;

  return {
    totalQuestions: assessment.questions.length,
    correctCount,
    scorePercent,
    passed: scorePercent >= passThreshold,
    passThreshold,
    graded,
  };
}
