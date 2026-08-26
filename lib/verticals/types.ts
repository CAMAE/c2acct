/**
 * Vertical Pack types (Blueprint §6). A Vertical Pack bundles everything
 * industry-specific (taxonomy, prompts, workflows, compliance, signals, evals);
 * everything structural (Company/Product/Vendor/scores, agent runtime, scoring
 * math) stays shared. Accounting is V1; manufacturing/finance are future packs.
 */
export interface VerticalPackTaxonomy {
  /** "db" = taxonomy lives in TaxonomyBucket filtered by verticalId. */
  source: "db" | "file";
  filter?: Record<string, string>;
}

/** One question-bank citation authority declared by a pack (class b). */
export interface VerticalPackSourceAuthority {
  /** Attribution org recorded on the ModuleSource row. */
  org: string;
  /** Case-insensitive substrings; any hit classifies the citation. */
  match: string[];
  /** Mirrors Prisma's ModuleSourceLicense. */
  license: "PUBLIC_DOMAIN" | "CITED" | "LICENSED";
}

export interface VerticalPackQuestionBank {
  /** ORDER IS SIGNIFICANT — one source ref per match, in manifest order. */
  sourceAuthorities: VerticalPackSourceAuthority[];
  /**
   * Path (relative to the pack dir) to this vertical's product-utility bank.
   * Keyed by the pair (verticalId, versionId) — see
   * lib/verticals/questionBankRegistry.ts.
   */
  utilityRegistry?: string;
}

export interface VerticalPackCompliance {
  audit_retention_days: number;
  data_residency: string;
}

export interface VerticalPack {
  id: string;
  name: string;
  version: number;
  description?: string;
  /** Class (d) display-layer terms — see lib/verticals/lexicon.ts. */
  lexicon: Record<string, string>;
  taxonomy: VerticalPackTaxonomy;
  questionBank: VerticalPackQuestionBank;
  /** Workflow template paths, relative to the pack dir. */
  workflows: string[];
  /** prompt key → markdown path, relative to the pack dir. */
  agent_prompts: Record<string, string>;
  compliance: VerticalPackCompliance;
  reference_signals?: string;
  eval_set?: string;
  /** Absolute directory of the pack, for resolving the relative paths above. */
  dir: string;
}
