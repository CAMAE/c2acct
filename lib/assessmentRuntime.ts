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
  questionIds: string[];
};

export type AssessmentModulePayload = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
  sections: AssessmentSection[];
  questions: AssessmentQuestionRuntime[];
  stagedFeatures: {
    branching: boolean;
    roleVariants: boolean;
  };
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
};

export function parseQuestionMeta(meta: Prisma.JsonValue | null | undefined): AssessmentQuestionMeta {
  const parsed = questionMetaSchema.safeParse(meta ?? {});
  return parsed.success ? parsed.data : {};
}

export function normalizeQuestionRuntime(question: QuestionRecord): AssessmentQuestionRuntime {
  const meta = parseQuestionMeta(question.meta);
  const validation: AssessmentQuestionRuntime["validation"] = {};
  let status: AssessmentQuestionRuntime["status"] = "ready";

  if (question.inputType === QuestionInputType.SLIDER) {
    const min = meta.slider?.min ?? 1;
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

export function buildAssessmentModulePayload(module: {
  id: string;
  key: string;
  title: string;
  description: string | null;
  scope: string;
  version: number;
}, questions: QuestionRecord[]): AssessmentModulePayload {
  const runtimeQuestions = questions
    .map(normalizeQuestionRuntime)
    .sort((left, right) => left.order - right.order);

  const sectionMap = new Map<string, AssessmentSection>();
  const orderedSections: AssessmentSection[] = [];

  for (const question of runtimeQuestions) {
    const sectionKey = question.meta.section?.key ?? "core";
    const existing = sectionMap.get(sectionKey);
    if (existing) {
      existing.questionIds.push(question.id);
      continue;
    }

    const section: AssessmentSection = {
      key: sectionKey,
      title: question.meta.section?.title ?? "Core Assessment",
      description: question.meta.section?.description,
      questionIds: [question.id],
    };
    sectionMap.set(sectionKey, section);
    orderedSections.push(section);
  }

  return {
    id: module.id,
    key: module.key,
    title: module.title,
    description: module.description,
    scope: module.scope,
    version: module.version,
    sections: orderedSections,
    questions: runtimeQuestions,
    stagedFeatures: {
      branching: runtimeQuestions.some((question) => Boolean(question.meta.branching)),
      roleVariants: runtimeQuestions.some((question) => Boolean(question.meta.roleVariants)),
    },
  };
}

export function getDefaultAnswer(question: AssessmentQuestionRuntime): NormalizedAnswer | undefined {
  if (question.inputType === QuestionInputType.SLIDER && question.validation.slider) {
    return question.validation.slider.min;
  }

  if (question.inputType === QuestionInputType.BOOLEAN) {
    return false;
  }

  if (question.inputType === QuestionInputType.MULTISELECT) {
    return [];
  }

  return undefined;
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
