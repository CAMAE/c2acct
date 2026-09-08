import { readFileSync } from "node:fs";
import path from "node:path";
import { QuestionInputType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { decorateFollowUpMcQuestions } from "@/lib/assessment/followUpMcRuntime";
import { isAnswerComplete, isAnswerPresent, validateAnswer, type AssessmentQuestionRuntime } from "@/lib/assessmentRuntime";

/**
 * MC redesign box — flag-off byte-identity, pinned at the source and the
 * function level (the rendered HTML / RSC / API-payload diff is run at commit time
 * against the standalone build).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const OFF = { PAT_ENABLE_FOLLOWUP_MC: "0" } as unknown as NodeJS.ProcessEnv;
const ON = { PAT_ENABLE_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv;

function textQuestion(key: string, id = key): AssessmentQuestionRuntime {
  return {
    id,
    key,
    prompt: `Operating Model and Workflow Discipline: ${key}`,
    inputType: QuestionInputType.TEXT,
    weight: 0,
    order: 21,
    required: true,
    meta: { helpText: "h", placeholder: "p", text: { multiline: true, maxLength: 2000 } },
    status: "ready",
    validation: { text: { multiline: true, maxLength: 2000 } },
  };
}

describe("decorateFollowUpMcQuestions — identity flag-off, decoration flag-on", () => {
  const questions = [textQuestion("operating-model_open_1"), textQuestion("operating-model_open_2"), textQuestion("something_else")];

  it("flag-off returns the SAME array instance with no followUpMc anywhere", () => {
    const result = decorateFollowUpMcQuestions(questions, "firm_alignment_operating_model_v1", OFF);
    expect(result).toBe(questions);
    expect(result.every((question) => !("followUpMc" in question))).toBe(true);
    expect(decorateFollowUpMcQuestions(questions, "firm_alignment_operating_model_v1", {} as NodeJS.ProcessEnv)).toBe(questions);
  });

  it("flag-on decorates only the registry follow-ups of THIS module; other questions are the same objects", () => {
    const result = decorateFollowUpMcQuestions(questions, "firm_alignment_operating_model_v1", ON);
    expect(result).not.toBe(questions);
    expect(result[0].followUpMc?.selectionMode).toBe("SINGLE");
    expect(result[0].followUpMc?.options).toHaveLength(8);
    expect(result[0].inputType).toBe(QuestionInputType.TEXT); // stored row untouched
    expect(result[1].followUpMc?.selectionMode).toBe("MULTI");
    expect(result[2]).toBe(questions[2]);
    // A follow-up key from another module is not decorated under this module.
    const cross = decorateFollowUpMcQuestions([textQuestion("strategy_open_5")], "firm_alignment_operating_model_v1", ON);
    expect(cross[0].followUpMc).toBeUndefined();
    // Non-firm modules are never decorated.
    expect(decorateFollowUpMcQuestions(questions, "user_alignment_v1", ON)).toBe(questions);
  });

  it("flag-on Strategy Q5 shows the amended stem while the stored prompt is untouched", () => {
    const [q] = decorateFollowUpMcQuestions([textQuestion("strategy_open_5")], "firm_alignment_strategy_v1", ON);
    expect(q.followUpMc?.stem).toContain("a more advanced intelligence layer");
    expect(q.prompt).toBe("Operating Model and Workflow Discipline: strategy_open_5");
  });
});

describe("validateAnswer / isAnswerComplete — TEXT path unchanged flag-off, selection path flag-on", () => {
  it("an undecorated TEXT follow-up validates exactly as before (string in, trimmed string out)", () => {
    const question = textQuestion("operating-model_open_1");
    expect(validateAnswer(question, "  Our intake queue  ")).toEqual({ ok: true, value: "Our intake queue" });
    expect(validateAnswer(question, { optionKeys: ["ops.q1.a"] })).toMatchObject({ ok: false, error: "Expected a text response" });
    expect(isAnswerPresent("x")).toBe(true);
    expect(isAnswerComplete(question, "x")).toBe(true);
    expect(isAnswerComplete(question, "")).toBe(false);
  });

  it("a decorated follow-up validates as a selection and rejects free text", () => {
    const [question] = decorateFollowUpMcQuestions([textQuestion("operating-model_open_1")], "firm_alignment_operating_model_v1", ON);
    expect(validateAnswer(question, { optionKeys: ["ops.q1.b"] })).toEqual({ ok: true, value: { optionKeys: ["ops.q1.b"], otherText: null } });
    expect(validateAnswer(question, "free text")).toMatchObject({ ok: false });
    expect(isAnswerComplete(question, { optionKeys: ["ops.q1.other"], otherText: "" })).toBe(false);
    expect(isAnswerComplete(question, { optionKeys: ["ops.q1.other"], otherText: "Intake" })).toBe(true);
    expect(isAnswerComplete(question, "free text")).toBe(false);
  });
});

describe("source pins — every flag-on path is behind the flag; option sets never live in JSX", () => {
  const moduleRoute = read("app/api/survey/module/[key]/route.ts");
  const draftRoute = read("app/api/survey/draft/route.ts");
  const submitRoute = read("app/api/survey/submit/route.ts");
  const client = read("app/components/assessment/AssessmentModuleClient.tsx");
  const runtime = read("lib/assessment/followUpMcRuntime.ts");

  it("the three survey routes decorate through the one runtime function", () => {
    for (const source of [moduleRoute, draftRoute, submitRoute]) {
      expect(source).toContain('from "@/lib/assessment/followUpMcRuntime"');
      expect((source.match(/decorateFollowUpMcQuestions\(/g) || []).length).toBe(1);
    }
    expect(runtime).toMatch(/if \(!isFollowUpMcEnabled\(env\) \|\| !isFirmAlignmentModuleKey\(moduleKey\)\) \{\s*return questions;/);
    // The module GET keeps the original payload object when decoration is the identity.
    expect(moduleRoute).toContain("decoratedQuestions === builtPayload.questions ? builtPayload :");
  });

  it("the dual-write to AssessmentItemResponse is flag-gated and inside the submit transaction", () => {
    expect(submitRoute).toMatch(/if \(isFollowUpMcEnabled\(\) && CANONICAL_FIRM_MODULE_KEYS\.has\(moduleKey\)\) \{[\s\S]{0,400}buildAssessmentItemResponseRows\(/);
    expect(submitRoute).toMatch(/tx\.assessmentItemResponse\.createMany/);
    expect((submitRoute.match(/assessmentItemResponse\./g) || []).length).toBe(1);
    // The submission JSON write itself is untouched: still `answers,` on the create.
    expect(submitRoute).toMatch(/moduleId: surveyModule\.id,\s*version: surveyModule\.version \?\? 1,\s*answers,/);
  });

  it("the client renders the option rows only for question.followUpMc and carries no option copy", () => {
    expect(client).toMatch(/if \(question\.followUpMc\) \{\s*return renderFollowUpMcInput\(question, value, setAnswer\);/);
    expect(client).not.toContain("Not a significant issue here");
    expect(client).not.toContain("Unclear ownership in handoffs");
    expect(client).toContain('from "@/lib/assessment/firmFollowUpOptions"');
    // Label first (bold), consequence muted beneath; radio for SINGLE, checkbox for MULTI.
    expect(client).toMatch(/type=\{single \? "radio" : "checkbox"\}/);
    expect(client).toMatch(/<span className="font-semibold text-\[var\(--shell-ink\)\]">\{option\.label\}<\/span>/);
    expect(client).toMatch(/text-\[var\(--shell-muted\)\]">\{option\.consequence\}/);
    expect(client).toMatch(/maxLength=\{FIRM_FOLLOWUP_OTHER_MAX_LENGTH\}/);
  });
});
