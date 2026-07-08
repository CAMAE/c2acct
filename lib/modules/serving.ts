import { ModuleReviewStatus } from "@prisma/client";

/**
 * Adaptive-module serving guards (Sprint 4 M1, 2026-07-08).
 *
 * The single enforcement point for the two hard rules from
 * PATALIGN-ADAPTIVE-MODULES-SPEC. Every code path that would surface a module
 * template or item to a customer MUST route through these predicates, so the
 * rules can never be bypassed by a forgotten check at a call site:
 *
 *   1. A module template serves ONLY when reviewStatus = APPROVED. Nothing
 *      draft / in-review / retired ever reaches a customer — the two-signature
 *      (CPA accuracy + clarity) publish gate is what flips it to APPROVED.
 *   2. A module item serves ONLY when it carries >= 1 ModuleSource row.
 *      "Tier C does not exist": no unsourced / scraped / unlicensed content.
 *
 * Pure + dependency-free (only the Prisma enum) so the contract test exercises
 * it exhaustively without a database.
 */

export const MODULE_SERVE_REVIEW_STATUS: ModuleReviewStatus = ModuleReviewStatus.APPROVED;

/** True only for the one review status that is allowed to reach customers. */
export function canServeTemplate(template: { reviewStatus: ModuleReviewStatus }): boolean {
  return template.reviewStatus === MODULE_SERVE_REVIEW_STATUS;
}

/** Structural shape — an item plus whatever source rows are attached to it. */
export type ServeItemInput = { sources: ReadonlyArray<unknown> };

/** True when the item has at least one attached ModuleSource. */
export function itemHasSource(item: ServeItemInput): boolean {
  return Array.isArray(item.sources) && item.sources.length > 0;
}

export type ItemServeVerdict = { servable: boolean; reason: string | null };

/**
 * Combined gate: an item is servable only if BOTH its template is approved and
 * it carries a source row. Returns the blocking reason for diagnostics.
 */
export function evaluateItemServe(
  item: ServeItemInput,
  template: { reviewStatus: ModuleReviewStatus }
): ItemServeVerdict {
  if (!canServeTemplate(template)) {
    return {
      servable: false,
      reason: `template not approved (reviewStatus=${template.reviewStatus})`,
    };
  }
  if (!itemHasSource(item)) {
    return {
      servable: false,
      reason: "item has no ModuleSource row (unsourced content cannot serve)",
    };
  }
  return { servable: true, reason: null };
}

/** Keep only the items that are safe to serve under the given template. */
export function filterServableItems<T extends ServeItemInput>(
  items: ReadonlyArray<T>,
  template: { reviewStatus: ModuleReviewStatus }
): T[] {
  return items.filter((item) => evaluateItemServe(item, template).servable);
}
