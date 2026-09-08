import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  FIRM_FOLLOWUP_MC_VERSION,
  FIRM_FOLLOWUP_MULTI_QUESTION_KEYS,
  FIRM_FOLLOWUP_OTHER_MAX_LENGTH,
  aggregateFollowUpOptionCounts,
  applyFollowUpPick,
  getFirmFollowUpQuestion,
  isFollowUpMcAnswerComplete,
  validateFollowUpMcAnswer,
} from "@/lib/assessment/firmFollowUpOptions";
import { isFollowUpMcEnabled, PAT_FOLLOWUP_MC_FLAG_ENV } from "@/lib/followUpMc";

/**
 * MC redesign box (queue item 6). The registry is generated from Leslie's file;
 * these pins hold it to the file and to Mythos's 2026-09-07 rulings.
 */
const ROOT = path.resolve(__dirname, "..");
const LESLIE = readFileSync(path.join(ROOT, "docs/assessment/firm-followup-mc-options-2026-09-04.md"), "utf8");

const SECTION_BY_MODULE: Record<string, string> = {
  Operations: "operating-model",
  Automation: "automation-ai",
  Integration: "data-flow",
  Governance: "governance",
  Strategy: "strategy",
};

type ParsedOption = { letter: string; label: string; consequence: string | null };
type ParsedQuestion = { questionKey: string; stem: string; options: ParsedOption[] };

/** Same line algorithm the generator used: module header → numbered stem → lettered options, wrapped lines appended. */
function parseLeslie(source: string): ParsedQuestion[] {
  const clean = (value: string) => value.replace(/\s+/g, " ").trim();
  const questions: ParsedQuestion[] = [];
  let section: string | null = null;
  let current: { n: number; stem: string; options: { letter: string; text: string }[] } | null = null;
  let mode: "stem" | "opt" | null = null;
  for (const raw of source.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("Notes for the multiple-choice conversion")) break;
    const header = line.match(/^\*\*\[(Operations|Automation|Integration|Governance|Strategy) \(/);
    if (header) {
      section = SECTION_BY_MODULE[header[1]];
      current = null;
      mode = null;
      continue;
    }
    if (!section) continue;
    const stem = line.match(/^\s*([1-5])(?:\\\.|\.)\s+(.+)$/);
    if (stem) {
      current = { n: Number(stem[1]), stem: stem[2].trim(), options: [] };
      questions.push({ questionKey: `${section}_open_${current.n}`, stem: "", options: [] });
      (questions[questions.length - 1] as ParsedQuestion & { raw?: typeof current }).raw = current;
      mode = "stem";
      continue;
    }
    const option = line.match(/^\s*([a-h])\.\s+(.+)$/);
    if (option && current) {
      current.options.push({ letter: option[1], text: option[2].trim() });
      mode = "opt";
      continue;
    }
    if (line.trim() === "" || !current) continue;
    const cont = line.replace(/^\s*>?\s*/, "");
    if (mode === "stem") current.stem += ` ${cont}`;
    else if (mode === "opt") current.options[current.options.length - 1].text += ` ${cont}`;
  }
  for (const entry of questions as (ParsedQuestion & { raw?: { stem: string; options: { letter: string; text: string }[] } })[]) {
    const raw = entry.raw!;
    let stem = clean(raw.stem);
    stem = stem.replace(/\(hint:.*\)$/, "").trim();
    stem = clean(stem.replace(/~~.*?~~\s*/g, "")); // struck text dropped (Strategy Q5 amendment)
    entry.stem = stem;
    entry.options = raw.options.map((option) => {
      const text = clean(option.text).replace("** **", " ").replace("**---**", "---");
      const match = text.match(/^\*\*(.+?)\*\*\s*(?:---|—)?\s*(.*)$/);
      const label = match ? clean(match[1]) : text.replace(/\*\*/g, "");
      let consequence = match ? clean(match[2]).replace(/\*\*/g, "") : "";
      if (consequence.startsWith("--- ")) consequence = consequence.slice(4);
      return { letter: option.letter, label, consequence: consequence || null };
    });
    delete entry.raw;
  }
  return questions;
}

const parsed = parseLeslie(LESLIE);
const byKey = new Map(FIRM_FOLLOWUP_MC_QUESTIONS.map((q) => [q.questionKey, q]));

describe("registry shape — 25 questions × 8 options, versioned, keys are stable slugs", () => {
  it("has 25 questions, 5 per module, each with 6 choices + not_significant + other", () => {
    expect(FIRM_FOLLOWUP_MC_VERSION).toBe(1);
    expect(FIRM_FOLLOWUP_MC_QUESTIONS).toHaveLength(25);
    for (const section of Object.values(SECTION_BY_MODULE)) {
      const inModule = FIRM_FOLLOWUP_MC_QUESTIONS.filter((q) => q.moduleSectionKey === section);
      expect(inModule.map((q) => q.index)).toEqual([1, 2, 3, 4, 5]);
      expect(inModule.map((q) => q.questionKey)).toEqual([1, 2, 3, 4, 5].map((n) => `${section}_open_${n}`));
    }
    for (const question of FIRM_FOLLOWUP_MC_QUESTIONS) {
      expect(question.options).toHaveLength(8);
      expect(question.options.filter((o) => o.kind === "choice").map((o) => o.letter)).toEqual(["a", "b", "c", "d", "e", "f"]);
      const none = question.options.find((o) => o.kind === "not_significant");
      const other = question.options.find((o) => o.kind === "other");
      expect(none?.label).toBe("Not a significant issue here");
      expect(none?.key).toMatch(/^(ops|auto|int|gov|strat)\.q[1-5]\.none$/);
      expect(other?.label).toBe("Other (short answer)");
      expect(other?.key).toMatch(/^(ops|auto|int|gov|strat)\.q[1-5]\.other$/);
      for (const option of question.options.filter((o) => o.kind === "choice")) {
        expect(option.key).toMatch(/^(ops|auto|int|gov|strat)\.q[1-5]\.[a-f]$/);
        expect(option.label.length).toBeGreaterThan(0);
      }
    }
    const allKeys = FIRM_FOLLOWUP_MC_QUESTIONS.flatMap((q) => q.options.map((o) => o.key));
    expect(new Set(allKeys).size).toBe(200);
  });

  it("questionKey matches the stored open-ended SurveyQuestion keys and the canonical module keys", () => {
    expect(byKey.get("operating-model_open_1")?.moduleKey).toBe("firm_alignment_operating_model_v1");
    expect(byKey.get("automation-ai_open_1")?.moduleKey).toBe("firm_alignment_automation_ai_v1");
    expect(byKey.get("data-flow_open_1")?.moduleKey).toBe("firm_alignment_data_flow_v1");
    expect(byKey.get("governance_open_1")?.moduleKey).toBe("firm_alignment_governance_v1");
    expect(byKey.get("strategy_open_1")?.moduleKey).toBe("firm_alignment_strategy_v1");
    expect(getFirmFollowUpQuestion("nope")).toBeNull();
  });
});

describe("ruling 1 — selection mode: MULTI for exactly six, SINGLE for the other nineteen", () => {
  it("the six MULTI keys are exactly as ruled", () => {
    expect([...FIRM_FOLLOWUP_MULTI_QUESTION_KEYS]).toEqual([
      "operating-model_open_2",
      "operating-model_open_5",
      "automation-ai_open_3",
      "automation-ai_open_4",
      "data-flow_open_2",
      "governance_open_3",
    ]);
    const multi = FIRM_FOLLOWUP_MC_QUESTIONS.filter((q) => q.selectionMode === "MULTI").map((q) => q.questionKey);
    expect(multi).toEqual([...FIRM_FOLLOWUP_MULTI_QUESTION_KEYS]);
    expect(FIRM_FOLLOWUP_MC_QUESTIONS.filter((q) => q.selectionMode === "SINGLE")).toHaveLength(19);
  });
});

describe("copy — verbatim from Leslie's file, with only the ruled exceptions", () => {
  it("the file parses to the same 25 keys", () => {
    expect(parsed.map((q) => q.questionKey)).toEqual(FIRM_FOLLOWUP_MC_QUESTIONS.map((q) => q.questionKey));
  });

  it("every stem is verbatim (Strategy Q5 = the amended stem, struck text gone)", () => {
    for (const source of parsed) {
      expect(byKey.get(source.questionKey)?.stem, source.questionKey).toBe(source.stem);
    }
    const strategyQ5 = byKey.get("strategy_open_5")!;
    expect(strategyQ5.stem).toBe(
      "What signal would tell you this area is ready for a more advanced intelligence layer, broader change, or faster execution?"
    );
    expect(strategyQ5.stem).not.toContain("deeper PAT insight use");
  });

  it("every option label and consequence is verbatim, except Governance Q1 (ruling 2)", () => {
    for (const source of parsed) {
      const target = byKey.get(source.questionKey)!;
      for (const [index, sourceOption] of source.options.entries()) {
        const targetOption = target.options[index];
        expect(targetOption.letter).toBe(sourceOption.letter);
        if (source.questionKey === "governance_open_1" && targetOption.kind === "choice") continue;
        expect(targetOption.label, `${source.questionKey} ${sourceOption.letter} label`).toBe(sourceOption.label);
        expect(targetOption.consequence, `${source.questionKey} ${sourceOption.letter} consequence`).toBe(
          targetOption.kind === "choice" ? sourceOption.consequence : null
        );
      }
    }
  });

  it("ruling 2 — Governance Q1 carries the neutral labels; clauses name cost only", () => {
    const gov1 = byKey.get("governance_open_1")!;
    expect(gov1.options.filter((o) => o.kind === "choice").map((o) => o.label)).toEqual([
      "Partner sign-off queue",
      "Manager review step",
      "Second-preparer verification",
      "Document re-verification at intake",
      "Compliance checklist pass",
      "Cross-team handoff review",
    ]);
    for (const option of gov1.options) {
      const text = `${option.label} ${option.consequence ?? ""}`;
      expect(text).not.toMatch(/low[- ]value|redundant|marginal|duplicative|rarely|limited protection|only against/i);
      if (option.kind === "choice") expect(option.consequence).toMatch(/time|queue|wait|pass of effort/);
    }
  });

  it("ruling 3 — options that repeat across questions stay as written (no dedupe)", () => {
    const labelCounts = new Map<string, number>();
    for (const question of FIRM_FOLLOWUP_MC_QUESTIONS) {
      for (const option of question.options.filter((o) => o.kind === "choice")) {
        labelCounts.set(option.label, (labelCounts.get(option.label) ?? 0) + 1);
      }
    }
    expect(labelCounts.get("Document classification and extraction")).toBe(2);
    expect(labelCounts.get("Integration‑API instability")).toBe(2);
  });

  it("Automation Q4 option f is label-only in the file and stays label-only", () => {
    const option = byKey.get("automation-ai_open_4")!.options[5];
    expect(option.label).toBe("Resistance to long‑standing workflow changes");
    expect(option.consequence).toBeNull();
  });
});

describe("exclusivity and 'Other' rules (applyFollowUpPick / validateFollowUpMcAnswer)", () => {
  const single = byKey.get("operating-model_open_1")!;
  const multi = byKey.get("operating-model_open_2")!;

  it("SINGLE: a pick replaces; re-picking clears", () => {
    let answer = applyFollowUpPick(single, null, "ops.q1.a");
    expect(answer.optionKeys).toEqual(["ops.q1.a"]);
    answer = applyFollowUpPick(single, answer, "ops.q1.c");
    expect(answer.optionKeys).toEqual(["ops.q1.c"]);
    answer = applyFollowUpPick(single, answer, "ops.q1.c");
    expect(answer.optionKeys).toEqual([]);
  });

  it("MULTI: picks toggle and accumulate; Other may combine", () => {
    let answer = applyFollowUpPick(multi, null, "ops.q2.a");
    answer = applyFollowUpPick(multi, answer, "ops.q2.d");
    answer = applyFollowUpPick(multi, answer, "ops.q2.other");
    expect(answer.optionKeys).toEqual(["ops.q2.a", "ops.q2.d", "ops.q2.other"]);
    answer = applyFollowUpPick(multi, answer, "ops.q2.a");
    expect(answer.optionKeys).toEqual(["ops.q2.d", "ops.q2.other"]);
  });

  it("'Not a significant issue here' is exclusive in both modes", () => {
    let answer = applyFollowUpPick(multi, { optionKeys: ["ops.q2.a", "ops.q2.other"], otherText: "x" }, "ops.q2.none");
    expect(answer).toEqual({ optionKeys: ["ops.q2.none"], otherText: null });
    answer = applyFollowUpPick(multi, answer, "ops.q2.b");
    expect(answer.optionKeys).toEqual(["ops.q2.b"]);
    const singleAnswer = applyFollowUpPick(single, { optionKeys: ["ops.q1.b"], otherText: null }, "ops.q1.none");
    expect(singleAnswer.optionKeys).toEqual(["ops.q1.none"]);
    expect(validateFollowUpMcAnswer(multi, { optionKeys: ["ops.q2.none", "ops.q2.a"] }, true)).toMatchObject({ ok: false });
  });

  it("'Other' requires a non-empty short answer (<= 280 chars); text is dropped when Other is deselected", () => {
    expect(FIRM_FOLLOWUP_OTHER_MAX_LENGTH).toBe(280);
    expect(isFollowUpMcAnswerComplete(single, { optionKeys: ["ops.q1.other"], otherText: "" })).toBe(false);
    expect(isFollowUpMcAnswerComplete(single, { optionKeys: ["ops.q1.other"], otherText: "  " })).toBe(false);
    expect(isFollowUpMcAnswerComplete(single, { optionKeys: ["ops.q1.other"], otherText: "Intake queue" })).toBe(true);
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["ops.q1.other"], otherText: "" }, true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["ops.q1.other"], otherText: "x".repeat(281) }, true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["ops.q1.other"], otherText: " Intake queue " }, true)).toEqual({
      ok: true,
      value: { optionKeys: ["ops.q1.other"], otherText: "Intake queue" },
    });
    const dropped = applyFollowUpPick(single, { optionKeys: ["ops.q1.other"], otherText: "Intake queue" }, "ops.q1.a");
    expect(dropped).toEqual({ optionKeys: ["ops.q1.a"], otherText: null });
  });

  it("server validation rejects unknown keys, SINGLE multi-picks, and non-objects; normalises to registry order", () => {
    expect(validateFollowUpMcAnswer(single, "free text", true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["ops.q1.z"] }, true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["ops.q1.a", "ops.q1.b"] }, true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: [] }, true)).toMatchObject({ ok: false });
    expect(validateFollowUpMcAnswer(single, { optionKeys: [] }, false)).toEqual({ ok: true, value: { optionKeys: [], otherText: null } });
    expect(validateFollowUpMcAnswer(multi, { optionKeys: ["ops.q2.d", "ops.q2.a", "ops.q2.a"], otherText: "ignored" }, true)).toEqual({
      ok: true,
      value: { optionKeys: ["ops.q2.a", "ops.q2.d"], otherText: null },
    });
  });
});

describe("aggregate exclusion — 'Not a significant issue here' and 'Other' never enter insight/divergence/benchmark math", () => {
  it("counts only the six named choices; none/other/null/unknown are excluded and reported", () => {
    const rows = [
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.c" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.none" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.other" },
      { questionKey: "operating-model_open_1", optionKey: null }, // legacy text / scored row
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.zz" },
      { questionKey: "operating-model_open_2", optionKey: "ops.q2.none" },
      { questionKey: "not-a-question", optionKey: "x" },
    ];
    const aggregate = aggregateFollowUpOptionCounts(rows);
    expect(aggregate["operating-model_open_1"]).toEqual({
      counts: { "ops.q1.a": 2, "ops.q1.c": 1 },
      includedPicks: 3,
      excludedPicks: 4,
    });
    expect(aggregate["operating-model_open_2"]).toEqual({ counts: {}, includedPicks: 0, excludedPicks: 1 });
    expect(aggregate["not-a-question"]).toBeUndefined();
    for (const bucket of Object.values(aggregate)) {
      for (const key of Object.keys(bucket.counts)) {
        expect(key).not.toMatch(/\.(none|other)$/);
      }
    }
  });
});

const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

describe("flag — PAT_ENABLE_FOLLOWUP_MC, strictly \"1\", fails closed", () => {
  it("is off unless exactly \"1\"", () => {
    expect(PAT_FOLLOWUP_MC_FLAG_ENV).toBe("PAT_ENABLE_FOLLOWUP_MC");
    expect(isFollowUpMcEnabled(env({}))).toBe(false);
    expect(isFollowUpMcEnabled(env({ PAT_ENABLE_FOLLOWUP_MC: "true" }))).toBe(false);
    expect(isFollowUpMcEnabled(env({ PAT_ENABLE_FOLLOWUP_MC: "0" }))).toBe(false);
    expect(isFollowUpMcEnabled(env({ PAT_ENABLE_FOLLOWUP_MC: "1" }))).toBe(true);
  });
});
