import { QuestionInputType } from "@prisma/client";
import type { AssessmentQuestionRuntime } from "@/lib/assessmentRuntime";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_OPEN_ENDED_PROMPTS } from "@/lib/firmPat";
import { DEFAULT_VERTICAL_ID, resolveCurrentVertical, type ResolveVerticalOptions } from "./context";
import { isVerticalPacksEnabled } from "./flag";
import { LEGAL_FIRM_MODULES } from "./packs/legalFirmModules";

/**
 * Firm module words per vertical (legal-load, R64; audit section 12 item 1).
 *
 * The firm assessment's STRUCTURE is shared by every channel: five modules, the
 * twenty scored stems, five open-ended follow-ups per module. What a pack may
 * change is the meaning of "this area" (description, summary) and the five
 * follow-up prompts with their placeholders. This module is the one place those
 * words resolve.
 *
 * Flag off, every reader gets {@link ACCOUNTING_FIRM_MODULES}: the literal
 * description, summary and prompts that lib/firmPat.ts has always carried, the
 * same object graph, before any pack is consulted. Flag on, an accounting tenant
 * still reads the in-code truth; any other vertical reads the pack's
 * `firmModules` block primed at the request boundary, and an unprimed foreign
 * vertical throws rather than printing accounting words on its surfaces (the
 * same rule as the lexicon and the product-utility registry).
 */

export type FirmModuleSectionKey = (typeof FIRM_MODULE_DEFINITIONS)[number]["sectionKey"];

export type FirmModuleOpenEnded = Readonly<{ prompt: string; placeholder: string }>;

export type FirmModuleContent = Readonly<{
  description: string;
  summary: string;
  openEnded: readonly FirmModuleOpenEnded[];
}>;

export type FirmModulesContent = Readonly<Record<FirmModuleSectionKey, FirmModuleContent>>;

export function firmModuleSectionKeys(): readonly FirmModuleSectionKey[] {
  return FIRM_MODULE_DEFINITIONS.map((definition) => definition.sectionKey);
}

export const FIRM_MODULE_OPEN_ENDED_COUNT = 5;

/**
 * Accounting's words ARE the in-code literals. Nothing is reworded here. Built
 * on first access rather than at module load: lib/firmPat.ts imports this module
 * and this module imports lib/firmPat.ts, and a lazy build keeps that cycle
 * harmless (neither side touches the other's exports while evaluating).
 */
let accountingFirmModules: FirmModulesContent | null = null;
export function ACCOUNTING_FIRM_MODULES_(): FirmModulesContent {
  if (accountingFirmModules) return accountingFirmModules;
  accountingFirmModules = Object.freeze(
    Object.fromEntries(
      FIRM_MODULE_DEFINITIONS.map((definition) => [
        definition.sectionKey,
        Object.freeze({
          description: definition.description,
          summary: definition.summary,
          openEnded: FIRM_MODULE_OPEN_ENDED_PROMPTS[definition.sectionKey].map((entry) =>
            Object.freeze({ prompt: entry.prompt, placeholder: entry.placeholder })
          ),
        }),
      ])
    ) as unknown as Record<FirmModuleSectionKey, FirmModuleContent>
  );
  return accountingFirmModules;
}
export { ACCOUNTING_FIRM_MODULES_ as accountingFirmModules };

/**
 * Per-vertical content, in code and filesystem-free, so the reader paths that a
 * client bundle can reach (lib/firmPat.ts) never import a pack loader. A pack's
 * `firmModules:` block in pack.yaml stays the source; its in-code mirror is
 * pinned to it by tests/legal-load.contract.test.ts, the same way the accounting
 * lexicon is pinned to verticals/accounting/pack.yaml.
 */
const primed = new Map<string, FirmModulesContent>();

/** Every module present with five prompts, or a loud error naming what is missing. */
export function assertCompleteFirmModules(verticalId: string, values: unknown): FirmModulesContent {
  const record = (values ?? {}) as Record<string, Partial<FirmModuleContent> | undefined>;
  const missing: string[] = [];
  const resolved: Partial<Record<FirmModuleSectionKey, FirmModuleContent>> = {};
  for (const sectionKey of firmModuleSectionKeys()) {
    const entry = record[sectionKey];
    const openEnded = Array.isArray(entry?.openEnded) ? entry.openEnded : [];
    const complete =
      typeof entry?.description === "string" &&
      entry.description.trim().length > 0 &&
      typeof entry.summary === "string" &&
      entry.summary.trim().length > 0 &&
      openEnded.length === FIRM_MODULE_OPEN_ENDED_COUNT &&
      openEnded.every(
        (item) =>
          typeof item?.prompt === "string" &&
          item.prompt.trim().length > 0 &&
          typeof item.placeholder === "string" &&
          item.placeholder.trim().length > 0
      );
    if (!complete) {
      missing.push(sectionKey);
      continue;
    }
    resolved[sectionKey] = Object.freeze({
      description: entry.description as string,
      summary: entry.summary as string,
      openEnded: openEnded.map((item) => Object.freeze({ prompt: item.prompt, placeholder: item.placeholder })),
    });
  }
  if (missing.length > 0) {
    throw new Error(
      `Vertical Pack "${verticalId}" firmModules is missing or incomplete for: ${missing.join(", ")}. ` +
        "Each module needs a description, a summary and exactly five open-ended prompts with placeholders; " +
        "a partial block would print another vertical's words on this vertical's modules."
    );
  }
  return Object.freeze(resolved as Record<FirmModuleSectionKey, FirmModuleContent>);
}

/** Register a vertical's firm module words (a pack's in-code mirror, or a loaded pack's block). */
export function primeVerticalFirmModules(verticalId: string, values: unknown): FirmModulesContent {
  const complete = assertCompleteFirmModules(verticalId, values);
  primed.set(verticalId, complete);
  return complete;
}
export { primeVerticalFirmModules as registerVerticalFirmModules };

/** Test/teardown helper. */
export function clearPrimedFirmModules(): void {
  primed.clear();
}

export function getPrimedFirmModules(verticalId: string): FirmModulesContent | null {
  return primed.get(verticalId) ?? null;
}

/** The whole block for the current vertical, under the same rules as lexicon(). */
export function resolveFirmModules(options: ResolveVerticalOptions = {}): FirmModulesContent {
  if (!isVerticalPacksEnabled(options.env ?? process.env)) {
    return ACCOUNTING_FIRM_MODULES_();
  }
  const verticalId = resolveCurrentVertical(options);
  const pack = primed.get(verticalId) ?? PACK_FIRM_MODULE_MIRRORS.get(verticalId)?.();
  if (pack) return pack;
  if (verticalId === DEFAULT_VERTICAL_ID) return ACCOUNTING_FIRM_MODULES_();
  throw new Error(
    `Vertical "${verticalId}" has no firm module words. Register the pack's in-code mirror ` +
      "(lib/verticals/packs/) or prime its firmModules block at the request boundary before rendering its modules."
  );
}

/**
 * In-code mirrors of each pack's `firmModules:` block, built lazily. A mirror is
 * registered here when its pack lands; the contract test pins each mirror to its
 * pack.yaml so the two cannot drift.
 */
const PACK_FIRM_MODULE_MIRRORS = new Map<string, () => FirmModulesContent>();
export function registerFirmModuleMirror(verticalId: string, build: () => FirmModulesContent): void {
  let built: FirmModulesContent | null = null;
  PACK_FIRM_MODULE_MIRRORS.set(verticalId, () => (built ??= assertCompleteFirmModules(verticalId, build())));
}

// The legal pack's mirror (legal-load, R64). Pinned to verticals/legal/pack.yaml by test.
registerFirmModuleMirror("legal", () => LEGAL_FIRM_MODULES);

export function resolveFirmModuleContent(
  sectionKey: FirmModuleSectionKey,
  options: ResolveVerticalOptions = {}
): FirmModuleContent {
  return resolveFirmModules(options)[sectionKey];
}

// Built on first use: this module and lib/firmPat.ts import each other, and nothing
// here may touch firmPat's exports while the modules are still evaluating.
let definitionByKey: Map<string, (typeof FIRM_MODULE_DEFINITIONS)[number]> | null = null;
function definitionFor(moduleKey: string) {
  definitionByKey ??= new Map(FIRM_MODULE_DEFINITIONS.map((definition) => [definition.key, definition]));
  return definitionByKey.get(moduleKey);
}

/**
 * Rewrite a firm module's five TEXT follow-up prompts to the vertical's words.
 *
 * The SurveyQuestion rows are shared by every tenant and carry accounting's
 * prompt (`<module title>: <prompt>`) and placeholder; a legal tenant's module
 * reads the pack's prompt in the same shape. Returns the SAME array instance when
 * the content is accounting's, so the flag-off payload is the object built before
 * this seam existed.
 */
export function applyVerticalFirmModulePrompts<T extends AssessmentQuestionRuntime>(
  questions: T[],
  moduleKey: string,
  content: FirmModulesContent
): T[] {
  if (content === ACCOUNTING_FIRM_MODULES_()) return questions;
  const definition = definitionFor(moduleKey);
  if (!definition) return questions;
  const moduleContent = content[definition.sectionKey];
  let changed = false;
  const next = questions.map((question) => {
    if (question.inputType !== QuestionInputType.TEXT) return question;
    const match = /^(.+)_open_([1-5])$/.exec(question.key);
    if (!match || match[1] !== definition.sectionKey) return question;
    const entry = moduleContent.openEnded[Number(match[2]) - 1];
    if (!entry) return question;
    changed = true;
    return {
      ...question,
      prompt: `${definition.title}: ${entry.prompt}`,
      meta: { ...question.meta, placeholder: entry.placeholder },
    };
  });
  return changed ? next : questions;
}
