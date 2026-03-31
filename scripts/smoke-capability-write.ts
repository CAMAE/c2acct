import assert from "node:assert/strict";
import { QuestionInputType } from "@prisma/client";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  type CapabilityQuestionMapping,
} from "@/lib/capabilityScoring";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_QUESTION_STEMS } from "@/lib/firmPat";
import { getFirmQuestionCapabilityKeys } from "@/lib/firmCapabilities";
import type { AssessmentQuestionRuntime } from "@/lib/assessmentRuntime";

const moduleDefinition = FIRM_MODULE_DEFINITIONS[0];

const questions: AssessmentQuestionRuntime[] = FIRM_MODULE_QUESTION_STEMS.map((stem, index) => ({
  id: `question-${index + 1}`,
  key: `${moduleDefinition.sectionKey}_q${index + 1}`,
  prompt: `${moduleDefinition.title}: ${stem}`,
  inputType: QuestionInputType.SLIDER,
  weight: 1,
  order: index + 1,
  required: true,
  meta: {
    section: {
      key: moduleDefinition.sectionKey,
      title: moduleDefinition.title,
      description: moduleDefinition.summary,
    },
    slider: {
      min: 0,
      max: 5,
      step: 1,
    },
  },
  status: "ready",
  validation: {
    slider: {
      min: 0,
      max: 5,
      step: 1,
    },
  },
}));

const answers = Object.fromEntries(
  questions.map((question, index) => [question.id, index % 6])
);

const mappings: CapabilityQuestionMapping[] = questions.flatMap((question, index) =>
  getFirmQuestionCapabilityKeys(moduleDefinition.sectionKey, index).map((capabilityKey) => ({
    questionId: question.id,
    questionKey: question.key,
    nodeId: capabilityKey,
    weight: 1,
  }))
);

const scoring = computeCapabilityScores({
  questions,
  answers,
  mappings,
});

assert.equal(scoring.diagnostics.unmappedQuestionIds.length, 0, "Every PAT question should have a capability mapping.");
assert.equal(scoring.diagnostics.unansweredQuestionIds.length, 0, "All fixture questions should be answered.");
assert.equal(scoring.diagnostics.questionsMissingScale.length, 0, "Slider scale metadata should be complete.");
assert.ok(scoring.scores.length >= 2, "Expected capability outputs for domain and shared capability nodes.");
assert.ok(
  scoring.scores.every((entry) => entry.score >= 0 && entry.score <= 100),
  "Capability scores must normalize to the 0-100 range."
);

const persistedRows = scoring.scores.map((entry) => ({
  companyId: "company-fixture",
  nodeId: entry.nodeId,
  score: entry.score,
  scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
}));

assert.equal(
  persistedRows.length,
  new Set(persistedRows.map((entry) => entry.nodeId)).size,
  "Capability write payload should contain one upsert target per capability node."
);

console.log(
  "PASS smoke-capability-write: PAT question mappings produce deterministic CompanyCapabilityScore upsert payloads."
);
