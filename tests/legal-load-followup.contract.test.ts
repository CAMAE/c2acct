import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QuestionInputType } from "@prisma/client";
import { decorateFollowUpMcQuestions } from "@/lib/assessment/followUpMcRuntime";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  FIRM_FOLLOWUP_MULTI_QUESTION_KEYS,
  applyFollowUpPick,
  getFirmFollowUpQuestion,
  getFirmFollowUpQuestions,
  isFollowUpMcAnswerComplete,
  validateFollowUpMcAnswer,
} from "@/lib/assessment/firmFollowUpOptions";
import { LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS } from "@/lib/assessment/legalFirmFollowUpOptions";
import { VERTICAL_READER_WORDS, verticalReaderWord } from "@/lib/lexicon";
import { customerCopyFiles } from "./helpers/copyScan";

/**
 * legal-load (R64, delta 2 and delta 8). The legal option sets are generated from the
 * Mythos file; this test re-parses the file with the file's own line grammar and compares,
 * so the registry can only ever say what the file says (the contract Leslie's accounting
 * file carries). Then the per-vertical lookup: a legal tenant reads legal, accounting reads
 * what it always read, and the two never meet in one lookup.
 */

const ROOT = path.resolve(__dirname, "..");
const SOURCE = readFileSync(path.join(ROOT, "docs/assessment/firm-followup-mc-options-legal-2026-10-11.md"), "utf8");

const SECTION_BY_HEADER: Record<string, { sectionKey: string; prefix: string }> = {
  "Operating Model and Workflow Discipline (ops)": { sectionKey: "operating-model", prefix: "ops" },
  "Automation and AI Readiness (auto)": { sectionKey: "automation-ai", prefix: "auto" },
  "Integration and Data Flow Maturity (int)": { sectionKey: "data-flow", prefix: "int" },
  "Governance, Controls and Vendor Risk (gov)": { sectionKey: "governance", prefix: "gov" },
  "Strategy, Change Readiness and Market Alignment (strat)": { sectionKey: "strategy", prefix: "strat" },
};

type Parsed = { questionKey: string; prefix: string; index: number; mode: "SINGLE" | "MULTI"; stem: string; options: Array<{ letter: string; label: string; consequence: string | null }> };

/** The file's grammar: "## <module> (<prefix>)", "N. <stem> (MODE)", "a. <label>: <consequence>". */
function parseMythos(source: string): Parsed[] {
  const out: Parsed[] = [];
  let section: { sectionKey: string; prefix: string } | null = null;
  let current: Parsed | null = null;
  for (const line of source.split("\n")) {
    const header = /^## (.+)$/.exec(line);
    if (header) {
      section = SECTION_BY_HEADER[header[1].trim()] ?? null;
      current = null;
      continue;
    }
    if (!section) continue;
    const stem = /^([1-5])\. (.+?) \((SINGLE|MULTI)\)$/.exec(line);
    if (stem) {
      current = { questionKey: `${section.sectionKey}_open_${stem[1]}`, prefix: section.prefix, index: Number(stem[1]), mode: stem[3] as "SINGLE" | "MULTI", stem: stem[2].trim(), options: [] };
      out.push(current);
      continue;
    }
    const option = /^([a-f])\. (.+)$/.exec(line);
    if (option && current) {
      const text = option[2].trim();
      const split = text.indexOf(": ");
      current.options.push(
        split === -1
          ? { letter: option[1], label: text, consequence: null }
          : { letter: option[1], label: text.slice(0, split).trim(), consequence: text.slice(split + 2).trim() || null }
      );
    }
  }
  return out;
}

const parsed = parseMythos(SOURCE);
const legalByKey = new Map(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => [question.questionKey, question]));

describe("the legal registry says exactly what the Mythos file says", () => {
  it("25 questions, 5 per module, in the file's order, each stem verbatim", () => {
    expect(parsed).toHaveLength(25);
    expect(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS).toHaveLength(25);
    expect(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS.map((question) => question.questionKey)).toEqual(parsed.map((question) => question.questionKey));
    for (const entry of parsed) {
      const question = legalByKey.get(entry.questionKey)!;
      expect(question.stem, entry.questionKey).toBe(entry.stem);
      expect(question.selectionMode, entry.questionKey).toBe(entry.mode);
      expect(question.index).toBe(entry.index);
      expect(question.hint).toBeNull();
    }
  });

  it("every choice label and consequence clause is verbatim; keys are <prefix>.q<n>.<a-f>, .none, .other", () => {
    for (const entry of parsed) {
      const question = legalByKey.get(entry.questionKey)!;
      const choices = question.options.filter((option) => option.kind === "choice");
      expect(choices.map((option) => option.letter)).toEqual(["a", "b", "c", "d", "e", "f"]);
      expect(choices.map((option) => ({ letter: option.letter, label: option.label, consequence: option.consequence }))).toEqual(entry.options);
      for (const option of choices) expect(option.key).toBe(`${entry.prefix}.q${entry.index}.${option.letter}`);
      const none = question.options.find((option) => option.kind === "not_significant")!;
      const other = question.options.find((option) => option.kind === "other")!;
      expect(none).toEqual({ key: `${entry.prefix}.q${entry.index}.none`, letter: "g", kind: "not_significant", label: "Not a significant issue here", consequence: null });
      expect(other).toEqual({ key: `${entry.prefix}.q${entry.index}.other`, letter: "h", kind: "other", label: "Other (short answer)", consequence: null });
    }
    expect(new Set(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS.flatMap((question) => question.options.map((option) => option.key))).size).toBe(200);
  });

  it("MULTI for the same six keys as accounting, SINGLE for the other nineteen", () => {
    const multi = LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS.filter((question) => question.selectionMode === "MULTI").map((question) => question.questionKey);
    expect(multi).toEqual([...FIRM_FOLLOWUP_MULTI_QUESTION_KEYS]);
    expect(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS.filter((question) => question.selectionMode === "SINGLE")).toHaveLength(19);
  });

  it("carries the same module keys and pillars as the accounting registry, question for question", () => {
    for (const accounting of FIRM_FOLLOWUP_MC_QUESTIONS) {
      const legal = legalByKey.get(accounting.questionKey)!;
      expect(legal.moduleKey).toBe(accounting.moduleKey);
      expect(legal.moduleSectionKey).toBe(accounting.moduleSectionKey);
      expect(legal.pillar).toBe(accounting.pillar);
      expect(legal.selectionMode).toBe(accounting.selectionMode);
    }
  });

  it("no em dash and no vendor name anywhere in the legal sets", () => {
    const text = JSON.stringify(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS);
    expect(text).not.toContain("—");
    for (const banned of ["Clio", "Westlaw", "Lexis", "Relativity", "NetDocuments", "iManage", "Smokeball", "MyCase", "PracticePanther", "CosmoLex", "Litera", "Harvey", "CoCounsel", "QuickBooks", "DocuSign"]) {
      expect(text, banned).not.toContain(banned);
    }
    // legal copy sits inside the reader-words and retired-names scans
    expect(customerCopyFiles()).toEqual(expect.arrayContaining(["lib/assessment/legalFirmFollowUpOptions.ts", "lib/verticals/packs/legalFirmModules.ts"]));
  });
});

describe("the runtime picks the registry by the tenant's vertical", () => {
  it("legal reads legal; accounting and no-vertical read the accounting sets unchanged", () => {
    expect(getFirmFollowUpQuestions("legal")).toBe(LEGAL_FIRM_FOLLOWUP_MC_QUESTIONS);
    expect(getFirmFollowUpQuestions("accounting")).toBe(FIRM_FOLLOWUP_MC_QUESTIONS);
    expect(getFirmFollowUpQuestions()).toBe(FIRM_FOLLOWUP_MC_QUESTIONS);
    const legal = getFirmFollowUpQuestion("operating-model_open_1", "legal")!;
    const accounting = getFirmFollowUpQuestion("operating-model_open_1")!;
    expect(legal.stem).toBe("Where does a matter most often stall between intake and closing, and which practice group feels it most?");
    expect(accounting.stem).toBe("What is the biggest workflow bottleneck currently slowing execution in this area, and where does it show up most often?");
    // same key shape on both sides: the company's vertical, not the key, tells them apart
    expect(legal.options[0].key).toBe(accounting.options[0].key);
  });

  it("the decorator attaches the legal set under a legal tenant and the accounting set otherwise (flag on)", () => {
    const env = { PAT_ENABLE_FOLLOWUP_MC: "1" } as unknown as NodeJS.ProcessEnv;
    const questions = [
      { id: "q1", key: "governance_open_1", prompt: "x", inputType: QuestionInputType.TEXT, weight: 0, order: 21, required: true, meta: {} },
    ] as never[];
    const legal = decorateFollowUpMcQuestions(questions, "firm_alignment_governance_v1", { env, verticalId: "legal" }) as Array<{ followUpMc?: { stem: string } }>;
    const accounting = decorateFollowUpMcQuestions(questions, "firm_alignment_governance_v1", { env, verticalId: "accounting" }) as Array<{ followUpMc?: { stem: string } }>;
    const bare = decorateFollowUpMcQuestions(questions, "firm_alignment_governance_v1", env) as Array<{ followUpMc?: { stem: string } }>;
    expect(legal[0].followUpMc?.stem).toBe("Which approval or review step slows work most while returning the least risk reduction?");
    expect(accounting[0].followUpMc?.stem).toBe(getFirmFollowUpQuestion("governance_open_1")!.stem);
    expect(bare[0].followUpMc?.stem).toBe(accounting[0].followUpMc?.stem);
  });

  it("the shared pick, completeness and validation rules apply to a legal question unchanged", () => {
    const question = getFirmFollowUpQuestion("automation-ai_open_3", "legal")!; // MULTI
    const a = applyFollowUpPick(question, { optionKeys: [], otherText: null }, "auto.q3.a");
    const ab = applyFollowUpPick(question, a, "auto.q3.b");
    expect(ab.optionKeys).toEqual(["auto.q3.a", "auto.q3.b"]);
    const none = applyFollowUpPick(question, ab, "auto.q3.none");
    expect(none.optionKeys).toEqual(["auto.q3.none"]);
    expect(isFollowUpMcAnswerComplete(question, ab)).toBe(true);
    expect(validateFollowUpMcAnswer(question, { optionKeys: ["auto.q3.other"], otherText: "" }, true).ok).toBe(false);
    const single = getFirmFollowUpQuestion("strategy_open_1", "legal")!;
    expect(validateFollowUpMcAnswer(single, { optionKeys: ["strat.q1.a", "strat.q1.b"], otherText: null }, true).ok).toBe(false);
  });
});

describe("delta 8 — legal reader words live in lib/lexicon.ts under the legal vertical", () => {
  it("the seven legal nouns the box names are present in English, with Spanish and French beside them", () => {
    const legal = VERTICAL_READER_WORDS.legal.en;
    expect(Object.values(legal)).toEqual(expect.arrayContaining(["matter", "engagement letter", "docketing", "trust account", "conflicts", "responsible attorney", "practice group"]));
    for (const locale of ["en", "es", "fr"] as const) {
      expect(Object.keys(VERTICAL_READER_WORDS.legal[locale]).sort()).toEqual(Object.keys(VERTICAL_READER_WORDS.accounting[locale]).sort());
    }
    expect(verticalReaderWord("legal", "deadlineSystem")).toBe("docketing");
    expect(verticalReaderWord("legal", "responsiblePerson", "fr")).toBe("avocat responsable");
    expect(verticalReaderWord("accounting", "clientFunds")).toBe("client funds");
    expect(verticalReaderWord("nope", "team")).toBe(VERTICAL_READER_WORDS.accounting.en.team);
    // "consultant" stays Guide: no channel word may reintroduce it
    expect(JSON.stringify(VERTICAL_READER_WORDS)).not.toMatch(/consultant/i);
  });
});
