/**
 * Product-fit dimensions — the five evidence-backed axes of the Alignment
 * Sandbox radar (P0, 2026-07-09). Each dimension is a stable, honest rollup of
 * the product-review *basis sections* that actually carry stored review
 * evidence (`ProductQuestionBasisKey`, lib/productUtilityRegistry.ts). A product
 * swap genuinely moves these axes because they are computed from the product's
 * own per-section firm-review answers — no uniform decoration, no invented
 * per-firm-module projection.
 *
 * These are NOT the firm's five *assessment* modules (FIRM_MODULE_DEFINITIONS).
 * There is no stored crosswalk from a product to those firm modules yet; that
 * mapping is a separate CPA-founder-approvable content artifact tracked in
 * docs/elite-sprint/ROADMAP-PRODUCT-SECTION-TO-FIRM-MODULE-MAPPING.md. Until it
 * is blessed, the radar is labelled "Product-fit dimensions" so nobody confuses
 * it with the firm's module alignment radar.
 */

export type ProductFitDimensionKey =
  | "workflow"
  | "integration"
  | "implementation"
  | "support"
  | "value";

export type ProductFitDimensionDefinition = {
  key: ProductFitDimensionKey;
  title: string;
  /** Product-review basis sections that roll up into this dimension. */
  bases: string[];
};

/** Canonical order (radar axis order). */
export const PRODUCT_FIT_DIMENSIONS: readonly ProductFitDimensionDefinition[] = [
  { key: "workflow", title: "Workflow Fit", bases: ["workflow-fit", "adoption-ease"] },
  {
    key: "integration",
    title: "Integration & Data",
    bases: ["integration-readiness", "reporting-visibility"],
  },
  {
    key: "implementation",
    title: "Implementation",
    bases: ["implementation-friction", "configuration-depth", "training-onboarding"],
  },
  { key: "support", title: "Support & Trust", bases: ["support-trust", "operational-dependence"] },
  { key: "value", title: "Value Clarity", bases: ["value-clarity"] },
] as const;

/** Reverse index: basis section key → the dimension it rolls into. */
export const DIMENSION_KEY_BY_BASIS: Record<string, ProductFitDimensionKey> =
  PRODUCT_FIT_DIMENSIONS.reduce<Record<string, ProductFitDimensionKey>>((map, dimension) => {
    for (const basis of dimension.bases) {
      map[basis] = dimension.key;
    }
    return map;
  }, {});

/** One radar axis for a single product (or a stack mean). */
export type ProductFitDimensionScore = {
  key: ProductFitDimensionKey;
  title: string;
  /** 0–100 mean of the contributing normalized answers, or null when no signal. */
  score: number | null;
  /** How many normalized answers backed this axis (thin → confidence band). */
  sampleSize: number;
};
