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

export interface VerticalPackCompliance {
  audit_retention_days: number;
  data_residency: string;
}

export interface VerticalPack {
  id: string;
  name: string;
  version: number;
  description?: string;
  taxonomy: VerticalPackTaxonomy;
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
