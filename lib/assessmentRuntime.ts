import { QuestionInputType, type Prisma } from "@prisma/client";
import { z } from "zod";

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
});

const questionMetaSchema = z.object({
  helpText: z.string().min(1).optional(),
  placeholder: z.string().min(1).optional(),
  groupKey: z.string().min(1).optional(),
  section: z
    .object({
      key: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1).optional(),
      order: z.number().int().positive().optional(),
      utilityFamily: z.string().min(1).optional(),
      utilityKey: z.string().min(1).optional(),
      utilityLabel: z.string().min(1).optional(),
      subcategoryKey: z.string().min(1).optional(),
      subcategoryTitle: z.string().min(1).optional(),
      basisKey: z.string().min(1).optional(),
    })
    .optional(),
  slider: z
    .object({
      min: z.number().int().optional(),
      max: z.number().int().optional(),
      step: z.number().positive().optional(),
      labels: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
  number: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().positive().optional(),
    })
    .optional(),
  text: z
    .object({
      multiline: z.boolean().optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().optional(),
    })
    .optional(),
  options: z.array(optionSchema).optional(),
  branching: z
    .object({
      mode: z.literal("phase_2").default("phase_2"),
      visibleWhen: z
        .object({
          questionKey: z.string().min(1),
          equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
          includesAny: z.array(z.string().min(1)).min(1).optional(),
        })
        .optional(),
    })
    .optional(),
  roleVariants: z
    .object({
      audiences: z.array(z.string().min(1)).min(1).optional(),
      variantKey: z.string().min(1).optional(),
    })
    .optional(),
});

export type AssessmentOption = z.infer<typeof optionSchema>;
export type AssessmentQuestionMeta = z.infer<typeof questionMetaSchema>;

export type AssessmentQuestionRuntime = {
  id: string;
  key: string;
  prompt: string;
  inputType: QuestionInputType;
  weight: number;
  order: number;
  required: boolean;
  meta: AssessmentQuestionMeta;
  status: "ready" | "unsupported";
  validation: {
    slider?: {
      min: number;
      max: number;
      step: number;
      labels?: Record<string, string>;
    };
    number?: {
      min?: number;
      max?: number;
      step?: number;
    };
    text?: {
      multiline: boolean;
      minLength?: number;
      maxLength?: number;
    };
    options?: AssessmentOption[];
  };
};

export type AssessmentSection = {
  key: string;
  title: string;
  description?: string;
  order: number;
  utilityFamily?: string;
  utilityKey?: string;
  utilityLabel?: string;
  subcategoryKey?: string;
  subcategoryTitle?: string;
  basisKey?: string;
  questionIds: string[];
};

export type AssessmentPage = {
  key: string;
  title: string;
  description?: string;
  order: number;
  questionIds: string[];
  questionCount: number;
  sectionKeys: string[];
  startQuestionNumber: number;
  endQuestionNumber: number;
};

export type AssessmentRollup = {
  key: string;
  title: string;
  score: number | null;
  answeredCount: number;
  questionCount: number;
  questionIds: string[];
  utilityFamily?: string;
  utilityKey?: string;
  utilityLabel?: string;
  subcategoryKey?: string;
  subcategoryTitle?: string;
  basisKey?: string;
};

export type AssessmentModulePayload = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
  sections: AssessmentSection[];
  pages: AssessmentPage[];
  questions: AssessmentQuestionRuntime[];
  stagedFeatures: {
    branching: boolean;
    roleVariants: boolean;
  };
  draft?: {
    answers: Record<string, NormalizedAnswer>;
    currentStep: number;
    updatedAt: string;
  } | null;
};

export type NormalizedAnswer =
  | number
  | boolean
  | string
  | string[]
  | null;

type QuestionRecord = {
  id: string;
  key: string;
  prompt: string;
  inputType: QuestionInputType;
  weight: number;
  order: number;
  required: boolean;
  meta: Prisma.JsonValue | null;
  sectionId?: string | null;
  SurveySection?: PersistedSectionRecord | null;
};

type PersistedSectionRecord = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  order: number;
  utilityFamily: string | null;
  utilityKey: string | null;
  utilityLabel: string | null;
  subcategoryKey: string | null;
  subcategoryTitle: string | null;
  basisKey: string | null;
};

export function parseQuestionMeta(meta: Prisma.JsonValue | null | undefined): AssessmentQuestionMeta {
  const parsed = questionMetaSchema.safeParse(meta ?? {});
  return parsed.success ? parsed.data : {};
}

function mergeSectionMeta(
  meta: AssessmentQuestionMeta,
  section: PersistedSectionRecord | null | undefined
): AssessmentQuestionMeta {
  if (!section) {
    return meta;
  }

  return {
    ...meta,
    section: {
      key: section.key,
      title: section.title,
      description: section.description ?? meta.section?.description,
      order: section.order,
      utilityFamily: section.utilityFamily ?? meta.section?.utilityFamily,
      utilityKey: section.utilityKey ?? meta.section?.utilityKey,
      utilityLabel: section.utilityLabel ?? meta.section?.utilityLabel,
      subcategoryKey: section.subcategoryKey ?? meta.section?.subcategoryKey,
      subcategoryTitle: section.subcategoryTitle ?? meta.section?.subcategoryTitle,
      basisKey: section.basisKey ?? meta.section?.basisKey,
    },
  };
}

export function normalizeQuestionRuntime(question: QuestionRecord): AssessmentQuestionRuntime {
  const meta = mergeSectionMeta(parseQuestionMeta(question.meta), question.SurveySection);
  const validation: AssessmentQuestionRuntime["validation"] = {};
  let status: AssessmentQuestionRuntime["status"] = "ready";

  if (question.inputType === QuestionInputType.SLIDER) {
    const min = meta.slider?.min ?? 0;
    const max = meta.slider?.max ?? 5;
    validation.slider = {
      min,
      max,
      step: meta.slider?.step ?? 1,
      labels: meta.slider?.labels,
    };
  } else if (question.inputType === QuestionInputType.NUMBER) {
    validation.number = {
      min: meta.number?.min,
      max: meta.number?.max,
      step: meta.number?.step ?? 1,
    };
  } else if (question.inputType === QuestionInputType.TEXT) {
    validation.text = {
      multiline: meta.text?.multiline ?? true,
      minLength: meta.text?.minLength,
      maxLength: meta.text?.maxLength,
    };
  } else if (
    question.inputType === QuestionInputType.SELECT ||
    question.inputType === QuestionInputType.MULTISELECT
  ) {
    validation.options = meta.options ?? [];
    if (validation.options.length === 0) {
      status = "unsupported";
    }
  }

  return {
    id: question.id,
    key: question.key,
    prompt: question.prompt,
    inputType: question.inputType,
    weight: question.weight,
    order: question.order,
    required: question.required,
    meta,
    status,
    validation,
  };
}

function buildSectionsFromQuestions(
  runtimeQuestions: AssessmentQuestionRuntime[],
  persistedSections: PersistedSectionRecord[] = []
) {
  const sectionMap = new Map<string, AssessmentSection>();

  for (const persistedSection of persistedSections) {
    sectionMap.set(persistedSection.key, {
      key: persistedSection.key,
      title: persistedSection.title,
      description: persistedSection.description ?? undefined,
      order: persistedSection.order,
      utilityFamily: persistedSection.utilityFamily ?? undefined,
      utilityKey: persistedSection.utilityKey ?? undefined,
      utilityLabel: persistedSection.utilityLabel ?? undefined,
      subcategoryKey: persistedSection.subcategoryKey ?? undefined,
      subcategoryTitle: persistedSection.subcategoryTitle ?? undefined,
      basisKey: persistedSection.basisKey ?? undefined,
      questionIds: [],
    });
  }

  for (const question of runtimeQuestions) {
    const sectionKey = question.meta.section?.key ?? "core";
    const existing = sectionMap.get(sectionKey);
    if (existing) {
      existing.questionIds.push(question.id);
      continue;
    }

    sectionMap.set(sectionKey, {
      key: sectionKey,
      title: question.meta.section?.title ?? "Core Assessment",
      description: question.meta.section?.description,
      order: question.meta.section?.order ?? sectionMap.size + 1,
      utilityFamily: question.meta.section?.utilityFamily,
      utilityKey: question.meta.section?.utilityKey,
      utilityLabel: question.meta.section?.utilityLabel,
      subcategoryKey: question.meta.section?.subcategoryKey,
      subcategoryTitle: question.meta.section?.subcategoryTitle,
      basisKey: question.meta.section?.basisKey,
      questionIds: [question.id],
    });
  }

  return Array.from(sectionMap.values())
    .filter((section) => section.questionIds.length > 0)
    .sort((left, right) => left.order - right.order);
}

export function buildAssessmentPages(
  runtimeQuestions: AssessmentQuestionRuntime[],
  sections: AssessmentSection[],
  pageSize = 10
) {
  const safePageSize = Math.max(1, pageSize);
  const pages: AssessmentPage[] = [];
  const sectionByKey = new Map(sections.map((section) => [section.key, section]));

  for (let index = 0; index < runtimeQuestions.length; index += safePageSize) {
    const pageQuestions = runtimeQuestions.slice(index, index + safePageSize);
    const startQuestionNumber = index + 1;
    const endQuestionNumber = index + pageQuestions.length;
    const sectionKeys = Array.from(
      new Set(pageQuestions.map((question) => question.meta.section?.key ?? "core"))
    );
    const sectionTitles = sectionKeys.map(
      (sectionKey) => sectionByKey.get(sectionKey)?.title ?? "Core assessment"
    );
    const description =
      sectionKeys.length === 1
        ? sectionByKey.get(sectionKeys[0])?.description ??
          `PAT keeps this page focused on ${sectionTitles[0]}.`
        : `PAT keeps this page to 10 questions while preserving section scoring across ${sectionTitles.join(" and ")}.`;

    pages.push({
      key: `page-${pages.length + 1}`,
      title: `Questions ${startQuestionNumber}-${endQuestionNumber}`,
      description,
      order: pages.length + 1,
      questionIds: pageQuestions.map((question) => question.id),
      questionCount: pageQuestions.length,
      sectionKeys,
      startQuestionNumber,
      endQuestionNumber,
    });
  }

  return pages;
}

export function normalizeAssessmentStep(step: number, totalSteps: number) {
  if (!Number.isFinite(step)) {
    return 1;
  }

  return Math.min(Math.max(step, 1), Math.max(totalSteps, 1));
}

export function buildAssessmentModulePayload(module: {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
}, questions: QuestionRecord[], sections: PersistedSectionRecord[] = []): AssessmentModulePayload {
  const runtimeQuestions = questions
    .map(normalizeQuestionRuntime)
    .sort((left, right) => left.order - right.order);
  const builtSections = buildSectionsFromQuestions(runtimeQuestions, sections);

  return {
    id: module.id,
    key: module.key,
    title: module.title,
    description: module.description,
    scope: module.scope,
    version: module.version,
    sections: builtSections,
    pages: buildAssessmentPages(runtimeQuestions, builtSections),
    questions: runtimeQuestions,
    stagedFeatures: {
      branching: runtimeQuestions.some((question) => Boolean(question.meta.branching)),
      roleVariants: runtimeQuestions.some((question) => Boolean(question.meta.roleVariants)),
    },
  };
}

export function getDefaultAnswer(question: AssessmentQuestionRuntime): NormalizedAnswer | undefined {
  if (question.inputType === QuestionInputType.BOOLEAN) {
    return false;
  }

  if (question.inputType === QuestionInputType.MULTISELECT) {
    return [];
  }

  return undefined;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function normalizeAnswerToPercent(
  question: AssessmentQuestionRuntime,
  answer: NormalizedAnswer | undefined
) {
  if (typeof answer !== "number" || !Number.isFinite(answer)) {
    return null;
  }

  if (question.inputType === QuestionInputType.SLIDER && question.validation.slider) {
    const denominator = question.validation.slider.max - question.validation.slider.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.slider.min) / denominator) * 100);
  }

  if (
    question.inputType === QuestionInputType.NUMBER &&
    typeof question.validation.number?.min === "number" &&
    typeof question.validation.number?.max === "number"
  ) {
    const denominator = question.validation.number.max - question.validation.number.min;
    if (denominator <= 0) {
      return null;
    }
    return round1(((answer - question.validation.number.min) / denominator) * 100);
  }

  return null;
}

export function buildAssessmentRollups(
  questions: AssessmentQuestionRuntime[],
  answers: Record<string, NormalizedAnswer>
) {
  const sections = buildSectionsFromQuestions(questions);
  const questionById = new Map(questions.map((question) => [question.id, question]));

  const sectionRollups: AssessmentRollup[] = sections.map((section) => {
    const sectionQuestions = section.questionIds
      .map((questionId) => questionById.get(questionId))
      .filter((question): question is AssessmentQuestionRuntime => Boolean(question));
    const normalizedScores = sectionQuestions
      .map((question) => normalizeAnswerToPercent(question, answers[question.id]))
      .filter((score): score is number => typeof score === "number");

    return {
      key: section.key,
      title: section.title,
      score:
        normalizedScores.length > 0
          ? round1(normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length)
          : null,
      answeredCount: normalizedScores.length,
      questionCount: section.questionIds.length,
      questionIds: section.questionIds,
      utilityFamily: section.utilityFamily,
      utilityKey: section.utilityKey,
      utilityLabel: section.utilityLabel,
      subcategoryKey: section.subcategoryKey,
      subcategoryTitle: section.subcategoryTitle,
      basisKey: section.basisKey,
    };
  });

  const utilityMap = new Map<string, AssessmentRollup>();
  for (const section of sectionRollups) {
    if (!section.utilityKey) {
      continue;
    }

    const existing = utilityMap.get(section.utilityKey) ?? {
      key: section.utilityKey,
      title: section.utilityLabel ?? section.utilityKey,
      score: null,
      answeredCount: 0,
      questionCount: 0,
      questionIds: [],
      utilityFamily: section.utilityFamily,
      utilityKey: section.utilityKey,
      utilityLabel: section.utilityLabel,
    };

    if (typeof section.score === "number") {
      const cumulativeScore = (existing.score ?? 0) * existing.answeredCount + section.score * section.answeredCount;
      existing.answeredCount += section.answeredCount;
      existing.score = existing.answeredCount > 0 ? round1(cumulativeScore / existing.answeredCount) : null;
    }
    existing.questionCount += section.questionCount;
    existing.questionIds.push(...section.questionIds);
    utilityMap.set(section.utilityKey, existing);
  }

  return {
    sections: sectionRollups,
    utilities: Array.from(utilityMap.values()).sort((left, right) => left.title.localeCompare(right.title)),
  };
}

export function isAnswerPresent(answer: NormalizedAnswer | undefined): boolean {
  if (answer === null || answer === undefined) {
    return false;
  }

  if (typeof answer === "string") {
    return answer.trim().length > 0;
  }

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }

  return true;
}

export function validateAnswer(
  question: AssessmentQuestionRuntime,
  rawValue: unknown
): { ok: true; value: NormalizedAnswer } | { ok: false; error: string } {
  if (rawValue === null || rawValue === undefined) {
    return question.required
      ? { ok: false, error: "Required answer is missing" }
      : { ok: true, value: null };
  }

  if (question.status === "unsupported") {
    return { ok: false, error: "Question type is not enabled for this module runtime" };
  }

  if (question.inputType === QuestionInputType.SLIDER) {
    const value = typeof rawValue === "number" ? rawValue : Number.NaN;
    const slider = question.validation.slider;
    if (!slider || !Number.isFinite(value) || !Number.isInteger(value)) {
      return { ok: false, error: "Expected an integer slider response" };
    }
    if (value < slider.min || value > slider.max) {
      return { ok: false, error: `Expected slider value ${slider.min}-${slider.max}` };
    }
    return { ok: true, value };
  }

  if (question.inputType === QuestionInputType.BOOLEAN) {
    if (typeof rawValue !== "boolean") {
      return { ok: false, error: "Expected a boolean response" };
    }
    return { ok: true, value: rawValue };
  }

  if (question.inputType === QuestionInputType.NUMBER) {
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
      return { ok: false, error: "Expected a numeric response" };
    }
    const numberMeta = question.validation.number;
    if (numberMeta?.min !== undefined && rawValue < numberMeta.min) {
      return { ok: false, error: `Expected number >= ${numberMeta.min}` };
    }
    if (numberMeta?.max !== undefined && rawValue > numberMeta.max) {
      return { ok: false, error: `Expected number <= ${numberMeta.max}` };
    }
    return { ok: true, value: rawValue };
  }

  if (question.inputType === QuestionInputType.TEXT) {
    if (typeof rawValue !== "string") {
      return { ok: false, error: "Expected a text response" };
    }
    const value = rawValue.trim();
    if (question.required && value.length === 0) {
      return { ok: false, error: "Required text response is missing" };
    }
    const textMeta = question.validation.text;
    if (textMeta?.minLength !== undefined && value.length < textMeta.minLength) {
      return { ok: false, error: `Expected at least ${textMeta.minLength} characters` };
    }
    if (textMeta?.maxLength !== undefined && value.length > textMeta.maxLength) {
      return { ok: false, error: `Expected at most ${textMeta.maxLength} characters` };
    }
    return { ok: true, value };
  }

  if (question.inputType === QuestionInputType.SELECT) {
    if (typeof rawValue !== "string") {
      return { ok: false, error: "Expected a single option value" };
    }
    const options = question.validation.options ?? [];
    if (!options.some((option) => option.value === rawValue)) {
      return { ok: false, error: "Expected a valid option value" };
    }
    return { ok: true, value: rawValue };
  }

  if (question.inputType === QuestionInputType.MULTISELECT) {
    if (!Array.isArray(rawValue) || !rawValue.every((value) => typeof value === "string")) {
      return { ok: false, error: "Expected an array of option values" };
    }
    const options = new Set((question.validation.options ?? []).map((option) => option.value));
    if (rawValue.some((value) => !options.has(value))) {
      return { ok: false, error: "Expected valid option values" };
    }
    return { ok: true, value: [...new Set(rawValue)] };
  }

  return { ok: false, error: "Question type is not supported" };
}

export function extractNumericAnswers(
  questions: AssessmentQuestionRuntime[],
  answers: Record<string, NormalizedAnswer>
): Record<string, number> {
  const numericAnswers: Record<string, number> = {};

  for (const question of questions) {
    const answer = answers[question.id];
    if (
      (question.inputType === QuestionInputType.SLIDER || question.inputType === QuestionInputType.NUMBER) &&
      typeof answer === "number" &&
      Number.isFinite(answer)
    ) {
      numericAnswers[question.id] = answer;
    }
  }

  return numericAnswers;
}
