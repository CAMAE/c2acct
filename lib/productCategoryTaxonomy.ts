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
 * legal-load (R64; audit addendum WORK 1i, register row 19): canonical categories
 * are PER VERTICAL. Accounting's seven and its bucket map above are unchanged and
 * are what every caller gets without a vertical. The legal channel groups its 24
 * function buckets into eight categories a law firm would name; a legal utility
 * resolved through the accounting map would otherwise collapse into one default
 * category and break the per-category floor.
 */
export const LEGAL_PRODUCT_CATEGORIES = [
  "Matters & Practice Management",
  "Billing, Payments & Trust",
  "Intake, Clients & Portal",
  "Documents & Knowledge",
  "Research, Analytics & AI",
  "Discovery, Litigation & Holds",
  "Docketing, Conflicts & Records",
  "Security, Integration & Projects",
] as const;

export type LegalProductCategory = (typeof LEGAL_PRODUCT_CATEGORIES)[number];

const LEGAL_BUCKET_TO_CATEGORY: Record<string, LegalProductCategory> = {
  "function-practice-matter-management": "Matters & Practice Management",
  "function-legal-project-management": "Security, Integration & Projects",
  "function-time-billing": "Billing, Payments & Trust",
  "function-trust-accounting": "Billing, Payments & Trust",
  "function-payments": "Billing, Payments & Trust",
  "function-intake-crm": "Intake, Clients & Portal",
  "function-client-portal": "Intake, Clients & Portal",
  "function-document-management": "Documents & Knowledge",
  "function-document-automation": "Documents & Knowledge",
  "function-knowledge-management": "Documents & Knowledge",
  "function-contract-lifecycle": "Documents & Knowledge",
  "function-esignature": "Documents & Knowledge",
  "function-legal-research": "Research, Analytics & AI",
  "function-legal-analytics": "Research, Analytics & AI",
  "function-generative-ai": "Research, Analytics & AI",
  "function-ediscovery": "Discovery, Litigation & Holds",
  "function-litigation-support": "Discovery, Litigation & Holds",
  "function-legal-hold": "Discovery, Litigation & Holds",
  "function-efiling-docketing": "Docketing, Conflicts & Records",
  "function-calendaring-deadlines": "Docketing, Conflicts & Records",
  "function-conflicts": "Docketing, Conflicts & Records",
  "function-records-governance": "Docketing, Conflicts & Records",
  "function-integration-platform": "Security, Integration & Projects",
  "function-identity-security": "Security, Integration & Projects",
};
const LEGAL_DEFAULT_CATEGORY: LegalProductCategory = "Matters & Practice Management";

export type ProductCategoryVertical = {
  verticalId: string;
  utilities: ReadonlyArray<{ key: string; taxonomyBucketKeys: readonly string[] }>;
};

type CategoryMap = { map: Record<string, string>; fallback: string };
const CATEGORY_MAPS: Record<string, CategoryMap> = {
  accounting: { map: BUCKET_TO_CATEGORY, fallback: DEFAULT_CATEGORY },
  legal: { map: LEGAL_BUCKET_TO_CATEGORY, fallback: LEGAL_DEFAULT_CATEGORY },
};

export function canonicalCategoriesForVertical(verticalId: string): readonly string[] {
  return verticalId === "legal" ? LEGAL_PRODUCT_CATEGORIES : CANONICAL_PRODUCT_CATEGORIES;
}

/**
 * The canonical category for a product, from its primary utility. Uses the
 * utility's first `function-*` taxonomy bucket; falls back to the vertical's
 * default category for anything unmapped (never fragments). Without a vertical
 * this is accounting's map over the in-code registry, exactly as before.
 */
export function canonicalCategoryForUtility(utilityKey: string | undefined, vertical?: ProductCategoryVertical): string {
  const categories = CATEGORY_MAPS[vertical?.verticalId ?? "accounting"] ?? CATEGORY_MAPS.accounting;
  if (!utilityKey) return categories.fallback;
  const utility = vertical
    ? vertical.utilities.find((entry) => entry.key === utilityKey)
    : UTILITY_BY_KEY.get(utilityKey);
  if (!utility) {
    // Not in the registry — try to map the raw key's own function-ish shape,
    // else default. (Demo catalogs occasionally carry bespoke keys.)
    return categories.fallback;
  }
  const functionBucket = utility.taxonomyBucketKeys.find((b) => b.startsWith("function-"));
  return (functionBucket && categories.map[functionBucket]) || categories.fallback;
}

/** Canonical category from an ordered list of a product's utility keys. */
export function canonicalCategoryForProduct(utilityKeys: readonly string[], vertical?: ProductCategoryVertical): string {
  return canonicalCategoryForUtility(utilityKeys[0], vertical);
}
