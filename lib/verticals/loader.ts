import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { parseYaml } from "@/lib/agents/yaml";
import type { VerticalPack } from "./types";

export const VERTICALS_DIR = "verticals";

/**
 * License tiers a pack may assert for a question-bank source authority. Mirrors
 * the Prisma `ModuleSourceLicense` enum, spelled out as literals so the manifest
 * loader stays free of a Prisma import (it is also used from non-DB contexts).
 * `tests/qbank-source-authorities.contract.test.ts` pins the two to each other.
 */
export const SOURCE_AUTHORITY_LICENSES = ["PUBLIC_DOMAIN", "CITED", "LICENSED"] as const;

const sourceAuthoritySchema = z.object({
  /** Attribution org recorded on every ModuleSource row this authority matches. */
  org: z.string().min(1),
  /** Case-insensitive substrings; any hit classifies the citation. */
  match: z.array(z.string().min(1)).min(1),
  license: z.enum(SOURCE_AUTHORITY_LICENSES),
});

/**
 * legal-load (R64, section 12 item 1): the firm-side module content a pack may
 * supply — the meaning of "this area" per module and the five open-ended prompts
 * with their placeholders. Structure stays in code (five modules, twenty shared
 * stems, five follow-ups); a pack supplies words. Absent, the in-code accounting
 * values serve (lib/verticals/firmModules.ts), byte-identical flag off.
 */
const firmModuleOpenEndedSchema = z.object({
  prompt: z.string().min(1),
  placeholder: z.string().min(1),
});
const firmModuleContentSchema = z.object({
  description: z.string().min(1),
  summary: z.string().min(1),
  openEnded: z.array(firmModuleOpenEndedSchema).length(5),
});
export const FIRM_MODULE_SECTION_KEYS = ["operating-model", "automation-ai", "data-flow", "governance", "strategy"] as const;
const firmModulesSchema = z.object({
  "operating-model": firmModuleContentSchema,
  "automation-ai": firmModuleContentSchema,
  "data-flow": firmModuleContentSchema,
  governance: firmModuleContentSchema,
  strategy: firmModuleContentSchema,
});

/**
 * legal-load (R64, delta 4): size bands a pack declares for its firms. Schema
 * only in this box: the band a firm belongs to is a cohort DIMENSION the readers
 * accept (lib/verticals/sizeBands.ts), published by vertical alone until a band
 * has MIN_CONTRIBUTORS firms (the roll-up rule). No Prisma column is added.
 */
const sizeBandSchema = z.object({
  /** Stable key, e.g. "solo-small". */
  key: z.string().min(1),
  /** Reader-facing label, e.g. "solo and small (1 to 5 attorneys)". */
  label: z.string().min(1),
  /** Inclusive lower bound on the pack's size unit (attorneys for legal). */
  min: z.number().int().nonnegative(),
  /** Inclusive upper bound; null for the open top band. */
  max: z.number().int().positive().nullable(),
});

const packSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  description: z.string().optional(),
  /** Class (d) display-layer terms — see lib/verticals/lexicon.ts. */
  lexicon: z.record(z.string(), z.string()).default({}),
  taxonomy: z.object({
    source: z.enum(["db", "file"]).default("db"),
    filter: z.record(z.string(), z.string()).optional(),
  }),
  /**
   * Class (b) question-bank payload. `sourceAuthorities` replaces the hardcoded
   * citation classifier that used to live in lib/modules/qbankParser.ts.
   * ORDER IS SIGNIFICANT: a citation matching several authorities yields one
   * source ref per match, in manifest order.
   */
  questionBank: z
    .object({
      sourceAuthorities: z.array(sourceAuthoritySchema).default([]),
      /**
       * W3 — the pack-declared product-utility bank, a path relative to the
       * pack dir. The bank's identity is the PAIR (verticalId, versionId): the
       * vertical half is this pack's id (and the W5 column on stored rows), the
       * version half stays unqualified inside the payload. There is no
       * slash-joined form of the key; see lib/verticals/questionBankRegistry.ts.
       */
      utilityRegistry: z.string().min(1).optional(),
    })
    .default({ sourceAuthorities: [] }),
  workflows: z.array(z.string()).default([]),
  agent_prompts: z.record(z.string(), z.string()).default({}),
  compliance: z.object({
    audit_retention_days: z.number().int().nonnegative(),
    data_residency: z.string().min(1),
  }),
  reference_signals: z.string().optional(),
  eval_set: z.string().optional(),
  firmModules: firmModulesSchema.optional(),
  sizeBands: z.array(sizeBandSchema).min(1).optional(),
});

export type VerticalPackFirmModuleContent = z.infer<typeof firmModuleContentSchema>;
export type VerticalPackFirmModules = z.infer<typeof firmModulesSchema>;
export type VerticalPackSizeBand = z.infer<typeof sizeBandSchema>;

export type VerticalPackManifest = z.infer<typeof packSchema>;

/**
 * Load + validate a Vertical Pack manifest from verticals/<verticalId>/pack.yaml.
 * Throws a clean error if the pack is missing or the manifest is invalid.
 */
export async function loadVerticalPack(verticalId: string, baseDir = VERTICALS_DIR): Promise<VerticalPack> {
  const dir = path.resolve(baseDir, verticalId);
  const file = path.join(dir, "pack.yaml");

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    throw new Error(`Vertical Pack "${verticalId}" not found (expected manifest at ${file}).`);
  }

  const result = packSchema.safeParse(parseYaml(raw));
  if (!result.success) {
    throw new Error(`Invalid Vertical Pack "${verticalId}": ${result.error.message}`);
  }
  if (result.data.id !== verticalId) {
    throw new Error(
      `Vertical Pack id "${result.data.id}" does not match its directory "${verticalId}".`
    );
  }

  return { ...result.data, dir };
}
