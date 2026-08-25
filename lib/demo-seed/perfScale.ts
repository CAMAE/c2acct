import {
  buildFirmPlan,
  buildVendorPlan,
  createMulberry32,
  loadFirmArchetypes,
  loadOpenEndedTemplates,
  type DemoBenchmarkEcosystemPlan,
  type DemoBenchmarkFirmPlan,
  type FirmArchetypeKey,
  type FirmRosterEntry,
  type VendorBankEntry,
} from "@/lib/demo-seed/combinator";

/**
 * PERF-SCALE ecosystem planner (charter scale).
 *
 * Builds ONE ecosystem with an arbitrary firm count — 47 by default — for
 * performance measurement. The 12-ecosystem local seed tops out around 15 firms
 * per ecosystem, which under-loads every per-firm fan-out question we ask, not
 * just the AUDIT-WS9-001 one: an O(N) pattern and an O(1) pattern look the same
 * at N=15 because the per-firm work dominates the fan-out overhead.
 *
 * SYNTHETIC BY CONSTRUCTION. The firm roster is generated deterministically
 * rather than hand-authored, so the count is a parameter and nobody has to
 * invent 47 firm names. Everything lands in the `perf-scale-*` namespace, is
 * boundary-asserted before a row is written, and is classified as non-production
 * so it can never reach a published benchmark.
 *
 * Deterministic: same firmCount in, same plan out, byte for byte.
 */

export const PERF_SCALE_SEED = "pat-perf-scale-v1";
export const PERF_SCALE_VENDOR_PREFIX = "perf-scale-vendor-";
export const PERF_SCALE_FIRM_PREFIX = "perf-scale-firm-";
export const PERF_SCALE_ECOSYSTEM_PREFIX = "perf-scale-ecosystem-";
/**
 * Consultant sign-in goes through the existing pilot-password-hash path, which
 * is keyed to the canonical @pat.local domain (same as the demo-bench
 * consultants, e.g. review.consultant+sentinel@pat.local). A bespoke domain
 * cannot authenticate, so the perf consultant keeps the canonical domain and
 * carries its namespace in the +perf-scale address tag instead.
 */
export const PERF_SCALE_EMAIL_DOMAIN = "pat.local";
export const PERF_SCALE_CONSULTANT_EMAIL = `review.consultant+perf-scale@${PERF_SCALE_EMAIL_DOMAIN}`;
/** Firm/user logins stay on a dedicated domain — they never need to sign in. */
export const PERF_SCALE_FIRM_EMAIL_DOMAIN = "perf-scale.pat.local";

/** Charter scale: the firm count AUDIT-WS9-001 cites for the benchmark cohort. */
export const DEFAULT_PERF_SCALE_FIRM_COUNT = 47;

/**
 * Per-firm DEPTH, expressed as the vendor's product-catalog size.
 *
 * Measured composition of the demo cohort (2026-08-24): 41.9 survey
 * submissions per firm = 5 alignment modules + 36.9 product reviews, and those
 * reviews are 37 DISTINCT firm-product pairs with one submission each — demo
 * firms review ~37 different products, they do not carry review history.
 *
 * So matching demo density means giving the perf vendor a comparable catalog
 * and having every firm review all of it: 37 products + 5 alignment modules
 * = 42 submissions/firm, against demo's 41.9. Catalog size is the lever;
 * `--depth` sets it.
 */
export const DEFAULT_PERF_SCALE_PRODUCT_COUNT = 5;
export const DEMO_DENSITY_PRODUCT_COUNT = 37;

/** Rotated so the cohort spans the full archetype space, not one flat profile. */
const ARCHETYPE_CYCLE: FirmArchetypeKey[] = [
  "high-performing",
  "mid-tier",
  "tech-forward",
  "compliance-heavy",
  "struggling",
  "mid-tier",
  "sample-thin",
];

const REGION_CYCLE: FirmRosterEntry["regionalFlavor"][] = [
  "northeast",
  "southeast",
  "midwest",
  "west",
  "national",
];

const SIZE_CYCLE: FirmRosterEntry["size"][] = ["small", "mid", "large", "mid"];

/** Name parts kept boring and obviously synthetic — these must never read as real firms. */
const NAME_STEMS = [
  "Alpha", "Bravo", "Cedar", "Delta", "Ember", "Foxglove", "Granite", "Harbor",
  "Indigo", "Juniper", "Kestrel", "Lantern", "Meridian", "Nimbus", "Onyx",
  "Pinnacle", "Quarry", "Ridgeline", "Summit", "Tidewater", "Umber", "Verdant",
  "Willow", "Xenon", "Yarrow", "Zephyr",
];
const NAME_SUFFIXES = ["Advisory", "CPAs", "Partners", "Accounting", "Group"];

/** Utility keys cycled across the generated catalog, straight from the registry. */
const CATALOG_UTILITY_KEYS = [
  "erp_gl_core_ledger",
  "close_reconciliation_consolidation",
  "workflow_practice_operations_task_routing",
  "reporting_analytics_fpa",
  "integration_interoperability_data_sync",
  "ap_payables_spend",
  "ar_billing_collections",
  "tax_workflow_compliance",
  "audit_workflow_workpapers_evidence",
  "document_capture_management_esignature",
  "client_collaboration_portal_requests",
  "expense_management",
  "forecasting_planning",
  "payroll_workforce_support",
  "controls_compliance_audit_trail_approvals",
];

const CATALOG_NAMES = [
  "Ledger", "Close", "Flow", "Insight", "Connect", "Payables", "Receivables",
  "Tax", "Audit", "Docs", "Portal", "Expense", "Forecast", "Payroll", "Controls",
  "Vault", "Bridge", "Pulse", "Atlas Core", "Signal",
];

/**
 * The vendor at the centre of the perf ecosystem, with a catalog sized by
 * `productCount`. Generated rather than hand-authored so depth is a parameter.
 */
export function buildPerfScaleVendor(productCount: number): VendorBankEntry {
  if (!Number.isInteger(productCount) || productCount < 1) {
    throw new Error(`perf-scale productCount must be a positive integer (got ${productCount})`);
  }
  const products = Array.from({ length: productCount }, (_, index) => {
    const name = CATALOG_NAMES[index % CATALOG_NAMES.length]!;
    const suffix = index >= CATALOG_NAMES.length ? ` ${Math.floor(index / CATALOG_NAMES.length) + 1}` : "";
    return {
      id: `perf-scale-product-atlas-${String(index + 1).padStart(2, "0")}`,
      name: `Atlas ${name}${suffix}`,
      utilityKeys: [CATALOG_UTILITY_KEYS[index % CATALOG_UTILITY_KEYS.length]!],
      // Spread self-reported seeds so divergence maths has something to chew on.
      selfReportedScoreSeed: 62 + ((index * 7) % 30),
      narrativeTone: index % 2 === 0 ? "confident" : "measured",
    };
  });

  return {
    id: `${PERF_SCALE_VENDOR_PREFIX}atlas`,
    name: "Atlas PerfScale",
    tagline: "Synthetic vendor used only for performance measurement.",
    archetype: "large-incumbent",
    products,
  } as VendorBankEntry;
}

/** Deterministic synthetic roster of `count` firms. */
export function buildPerfScaleRoster(count: number): FirmRosterEntry[] {
  const roster: FirmRosterEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const stem = NAME_STEMS[index % NAME_STEMS.length];
    const suffix = NAME_SUFFIXES[Math.floor(index / NAME_STEMS.length) % NAME_SUFFIXES.length];
    // The numeric suffix guarantees uniqueness past one full stem cycle.
    roster.push({
      name: `${stem} ${suffix} ${String(index + 1).padStart(2, "0")}`,
      size: SIZE_CYCLE[index % SIZE_CYCLE.length]!,
      archetype: ARCHETYPE_CYCLE[index % ARCHETYPE_CYCLE.length]!,
      regionalFlavor: REGION_CYCLE[index % REGION_CYCLE.length]!,
      userCountSeed: 2 + (index % 4),
    });
  }
  return roster;
}

export interface PerfScalePlanOptions {
  firmCount?: number;
  /** Vendor catalog size — the per-firm depth lever. See DEMO_DENSITY_PRODUCT_COUNT. */
  productCount?: number;
  /**
   * Force every firm to review the whole catalog. Archetype profiles otherwise
   * apply a per-archetype coverage fraction, which makes reviews/firm a
   * function of the archetype mix rather than of `productCount` — and depth
   * needs to be the thing being set, not a side effect of the mix.
   */
  fullCoverage?: boolean;
}

export function planPerfScaleEcosystem(
  options: PerfScalePlanOptions | number = {}
): DemoBenchmarkEcosystemPlan {
  // Back-compat: the first version took a bare firm count.
  const opts: PerfScalePlanOptions = typeof options === "number" ? { firmCount: options } : options;
  const firmCount = opts.firmCount ?? DEFAULT_PERF_SCALE_FIRM_COUNT;
  const productCount = opts.productCount ?? DEFAULT_PERF_SCALE_PRODUCT_COUNT;
  const fullCoverage = opts.fullCoverage ?? false;

  if (!Number.isInteger(firmCount) || firmCount < 1) {
    throw new Error(`perf-scale firmCount must be a positive integer (got ${firmCount})`);
  }

  const rng = createMulberry32(`${PERF_SCALE_SEED}-${firmCount}-${productCount}`);
  const archetypeMap = loadFirmArchetypes();
  const templates = loadOpenEndedTemplates();
  const roster = buildPerfScaleRoster(firmCount);
  const vendorPlan = buildVendorPlan(buildPerfScaleVendor(productCount));

  const firms: DemoBenchmarkFirmPlan[] = roster.map((firm, firmIndex) => {
    const baseProfile = archetypeMap[firm.archetype];
    if (!baseProfile) {
      throw new Error(`Unknown firm archetype "${firm.archetype}" — not in firm-archetypes.json`);
    }
    const archetypeProfile = fullCoverage
      ? { ...baseProfile, productReviewCoverage: 1 }
      : baseProfile;
    return buildFirmPlan({
      firm,
      ecosystemIndex: 0,
      firmIndex,
      archetypeProfile,
      vendorPlan,
      templates,
      rng,
      firmKeyPrefix: PERF_SCALE_FIRM_PREFIX,
    });
  });

  return {
    ecosystemId: `${PERF_SCALE_ECOSYSTEM_PREFIX}atlas`,
    ecosystemName: `Atlas PerfScale Ecosystem (${firmCount} firms × ${productCount} products)`,
    consultant: {
      userId: "perf-scale-user-consultant-atlas",
      profileId: "perf-scale-consultant-profile-atlas",
      email: PERF_SCALE_CONSULTANT_EMAIL,
      name: "Consultant Atlas PerfScale",
    },
    vendor: vendorPlan,
    firms,
  };
}

/**
 * Structural boundary wall: every id/key the plan will write must sit inside the
 * perf-scale-* namespace. This is what makes it impossible for a perf seed to
 * write into — or over — the pilot cohort, the canonical demo-bench cohort, or
 * the demo-expand cohort, however the generator is edited later.
 */
export function assertPerfScaleBoundary(plan: DemoBenchmarkEcosystemPlan): void {
  const violations: string[] = [];
  if (!plan.ecosystemId.startsWith(PERF_SCALE_ECOSYSTEM_PREFIX)) {
    violations.push(`ecosystem "${plan.ecosystemId}"`);
  }
  if (!plan.vendor.demoVendorInput.key.startsWith(PERF_SCALE_VENDOR_PREFIX)) {
    violations.push(`vendor "${plan.vendor.demoVendorInput.key}"`);
  }
  if (!plan.consultant.userId.startsWith("perf-scale-") || !plan.consultant.profileId.startsWith("perf-scale-")) {
    violations.push(`consultant "${plan.consultant.userId}"`);
  }
  if (plan.consultant.email !== PERF_SCALE_CONSULTANT_EMAIL) {
    violations.push(`consultant email "${plan.consultant.email}"`);
  }
  for (const firm of plan.firms) {
    if (!firm.demoFirmInput.key.startsWith(PERF_SCALE_FIRM_PREFIX)) {
      violations.push(`firm "${firm.demoFirmInput.key}"`);
    }
  }
  if (violations.length > 0) {
    throw new Error(
      `ABORT — perf-scale boundary violated (would write outside the perf-scale-* namespace): ${violations
        .slice(0, 10)
        .join(", ")}${violations.length > 10 ? ` …and ${violations.length - 10} more` : ""}`
    );
  }
}
