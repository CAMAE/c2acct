/**
 * Vertical Pack resolution (stub). Phase 0 carries a single `vertical_id` of
 * "accounting" everywhere; this is the seam where the cross-industry Vertical
 * Pack lookup (taxonomy, prompts, compliance policy, eval set) lands later.
 * See Blueprint §6.
 */
export const DEFAULT_VERTICAL_ID = "accounting";

export function resolveVerticalId(config: { vertical_id?: string }): string {
  return config.vertical_id ?? DEFAULT_VERTICAL_ID;
}
