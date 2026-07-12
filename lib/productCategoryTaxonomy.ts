import { PRODUCT_UTILITY_REGISTRY } from "@/lib/productUtilityRegistry";

/**
 * Canonical product categories (Block 10a, Cam's 2026-07-12 ruling).
 *
 * The V1 Category Position benchmark needs >= MIN_CONTRIBUTORS (5) DISTINCT
 * vendors per category. Deriving the category from each product's raw
 * utilityKeys[0] fragmented the demo into ~51 categories (almost all < 5
 * vendors → "insufficient peer data" everywhere). This collapses the 14 registry
 * function buckets into SEVEN human canonical categories, so every vendor's
 * products land in the same shared set and each category clears the floor.
 *
 * The utility -> function-bucket mapping stays single-source in the registry
 * (taxonomyBucketKeys); this only groups those buckets into the customer-facing
 * category names.
 */

export const CANONICAL_PRODUCT_CATEGORIES = [
  "Ledger & Close",
  "Payments & Billing",
  "Tax & Compliance",
  "Reporting & Advisory",
  "Workflow & Practice Ops",
  "Client & Documents",
  "Payroll & Workforce",
] as const;

export type CanonicalProductCategory = (typeof CANONICAL_PRODUCT_CATEGORIES)[number];

/** function-bucket key -> canonical category. */
const BUCKET_TO_CATEGORY: Record<string, CanonicalProductCategory> = {
  "function-erp-gl": "Ledger & Close",
  "function-cas": "Ledger & Close",
  "function-payments": "Payments & Billing",
  "function-billing": "Payments & Billing",
  "function-tax": "Tax & Compliance",
  "function-compliance": "Tax & Compliance",
  "function-audit": "Tax & Compliance",
  "function-analytics": "Reporting & Advisory",
  "function-advisory": "Reporting & Advisory",
  "function-workflow": "Workflow & Practice Ops",
  "function-practice-management": "Workflow & Practice Ops",
  "function-client-management": "Client & Documents",
  "function-document-management": "Client & Documents",
  "function-payroll": "Payroll & Workforce",
};

const DEFAULT_CATEGORY: CanonicalProductCategory = "Workflow & Practice Ops";

const UTILITY_BY_KEY = new Map(PRODUCT_UTILITY_REGISTRY.map((u) => [u.key, u]));

/**
 * The canonical category for a product, from its primary utility. Uses the
 * utility's first `function-*` taxonomy bucket; falls back to Workflow &
 * Practice Ops for anything unmapped (never fragments).
 */
export function canonicalCategoryForUtility(utilityKey: string | undefined): CanonicalProductCategory {
  if (!utilityKey) return DEFAULT_CATEGORY;
  const utility = UTILITY_BY_KEY.get(utilityKey);
  if (!utility) {
    // Not in the registry — try to map the raw key's own function-ish shape,
    // else default. (Demo catalogs occasionally carry bespoke keys.)
    return DEFAULT_CATEGORY;
  }
  const functionBucket = utility.taxonomyBucketKeys.find((b) => b.startsWith("function-"));
  return (functionBucket && BUCKET_TO_CATEGORY[functionBucket]) || DEFAULT_CATEGORY;
}

/** Canonical category from an ordered list of a product's utility keys. */
export function canonicalCategoryForProduct(utilityKeys: readonly string[]): CanonicalProductCategory {
  return canonicalCategoryForUtility(utilityKeys[0]);
}
