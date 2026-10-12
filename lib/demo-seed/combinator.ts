import { readFileSync } from "node:fs";
import path from "node:path";

import { MembershipPlan, MembershipStatus, ProductDeploymentModel } from "@prisma/client";
import { canonicalCategoryForProduct, type ProductCategoryVertical } from "@/lib/productCategoryTaxonomy";
import { loadDemoSeedFlavor, type DemoSeedFlavor } from "@/lib/demo-seed/flavor";

import type {
  DemoFirmInput,
  DemoMembershipInput,
  DemoProductInput,
  DemoVendorInput,
} from "@/data/demoPatEcosystem";

/**
 * Day-13 demo benchmark combinator.
 *
 * Pure transformer: reads the four curated JSON banks under data/demo-seed/
 * and produces row-shaped plans that the Day-13 seed script (scripts/seed-
 * demo-benchmark.ts) hands to existing seed helpers in lib/demoPatEcosystemSeed.ts.
 *
 * Determinism: a fixed string seed (DEMO_BENCHMARK_SEED) drives a Mulberry32
 * PRNG. Re-running planEcosystems() in a fresh process produces byte-identical
 * output. Avoids the seedrandom dependency.
 */

export const DEMO_BENCHMARK_SEED = "pat-5.7-demo-benchmark-v1";
const DEMO_SEED_ROOT = path.resolve(process.cwd(), "data", "demo-seed");

// ---------- Curated JSON shapes ----------

export type VendorBankProduct = {
  id: string;
  name: string;
  utilityKeys: string[];
  selfReportedScoreSeed: number;
  narrativeTone: "confident" | "measured" | "boastful" | "candid";
};

export type VendorBankEntry = {
  id: string;
  name: string;
  tagline: string;
  archetype: "large-incumbent" | "mid-market-specialist" | "modern-fast-mover" | "niche-depth";
  products: VendorBankProduct[];
};

export type FirmRosterEntry = {
  name: string;
  /** A size key the channel's flavor maps to a band line (accounting: small | mid | large; legal: the pack's band keys). */
  size: string;
  archetype: FirmArchetypeKey;
  regionalFlavor: "northeast" | "southeast" | "midwest" | "west" | "national";
  userCountSeed: number;
};

export type FirmArchetypeKey =
  | "high-performing"
  | "mid-tier"
  | "struggling"
  | "compliance-heavy"
  | "tech-forward"
  | "sample-thin";

export type FirmArchetypeProfile = {
  archetype: FirmArchetypeKey;
  moduleScoreRanges: Record<string, [number, number]>;
  completionRate: number;
  moduleAnswerProfile: Record<string, { skewToHigh: number; consistencyVariance: number }>;
  productReviewCoverage: number;
  openEndedTone: string;
};

export type OpenEndedTemplate = {
  category: "positive" | "mixed" | "pain-point" | "future-looking";
  tone: string;
  template: string;
  applicableArchetypes: FirmArchetypeKey[] | string[];
};

// ---------- Plan shapes (consumed by the seed script) ----------

/** Mapped to one Ecosystem + its single ConsultantAssignment. */
export type DemoBenchmarkEcosystemPlan = {
  ecosystemId: string;
  ecosystemName: string;
  consultant: DemoBenchmarkConsultantPlan;
  vendor: DemoBenchmarkVendorPlan;
  firms: DemoBenchmarkFirmPlan[];
};

export type DemoBenchmarkConsultantPlan = {
  userId: string;
  profileId: string;
  email: string;
  name: string;
};

export type DemoBenchmarkVendorPlan = {
  bankEntry: VendorBankEntry;
  /** DemoVendorInput shape so the existing ensureVendor helper accepts it directly. */
  demoVendorInput: DemoVendorInput;
};

export type DemoBenchmarkFirmPlan = {
  bankEntry: FirmRosterEntry;
  archetypeProfile: FirmArchetypeProfile;
  /** Per-firm module score targets (0-100), one per FIRM_MODULE_DEFINITIONS module key. */
  moduleScoreTargets: Record<string, number>;
  /** Vendor product IDs (subset of the ecosystem vendor's products) the firm will review. */
  productReviewIds: string[];
  /** Number of linked User rows to create. */
  userCount: number;
  /** DemoFirmInput shape so the existing ensureFirm helper accepts it directly. */
  demoFirmInput: DemoFirmInput;
  /** Pre-rendered open-ended quotes per reviewed product (productId -> quote). */
  openEndedQuotes: Record<string, string>;
};

// ---------- Mulberry32 PRNG (deterministic from a string seed) ----------

function stringToSeedNumber(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createMulberry32(seedString: string) {
  let state = stringToSeedNumber(seedString);
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }
  return result;
}

function pickInRange(rng: () => number, [low, high]: [number, number]): number {
  return Math.round(low + rng() * (high - low));
}

// ---------- JSON loaders ----------

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function loadVendorCatalog(): VendorBankEntry[] {
  return readJson<{ vendors: VendorBankEntry[] }>(
    path.join(DEMO_SEED_ROOT, "vendor-catalog.json")
  ).vendors;
}

export function loadFirmRoster(): FirmRosterEntry[] {
  return readJson<{ firms: FirmRosterEntry[] }>(
    path.join(DEMO_SEED_ROOT, "firm-roster.json")
  ).firms;
}

export function loadFirmArchetypes(): Record<FirmArchetypeKey, FirmArchetypeProfile> {
  const archetypes = readJson<{ archetypes: FirmArchetypeProfile[] }>(
    path.join(DEMO_SEED_ROOT, "firm-archetypes.json")
  ).archetypes;
  const map: Partial<Record<FirmArchetypeKey, FirmArchetypeProfile>> = {};
  for (const profile of archetypes) {
    map[profile.archetype] = profile;
  }
  return map as Record<FirmArchetypeKey, FirmArchetypeProfile>;
}

export function loadOpenEndedTemplates(): OpenEndedTemplate[] {
  return readJson<{ templates: OpenEndedTemplate[] }>(
    path.join(DEMO_SEED_ROOT, "open-ended-templates.json")
  ).templates;
}

// ---------- Mapping helpers (JSON bank -> existing DemoFirmInput / DemoVendorInput shape) ----------

const PRO_ACTIVE: DemoMembershipInput = {
  plan: MembershipPlan.PRO,
  status: MembershipStatus.ACTIVE,
};
const ELITE_ACTIVE: DemoMembershipInput = {
  plan: MembershipPlan.ELITE,
  status: MembershipStatus.ACTIVE,
};

/**
 * legal-load (R64; section 12 item 13): the channel's demo words come from data
 * (lib/demo-seed/flavor.ts). Accounting's flavor file carries the literals this
 * module used to hold, so the accounting planners stay byte-identical (pinned by
 * tests/legal-load-demo-seed.contract.test.ts).
 */
function accountingFlavor(): DemoSeedFlavor {
  return loadDemoSeedFlavor("accounting");
}

const ARCHETYPE_TO_MATURITY: Record<FirmArchetypeKey, string> = {
  "high-performing": "Scaled",
  "mid-tier": "Established",
  "struggling": "Foundational",
  "compliance-heavy": "Compliance-led",
  "tech-forward": "Modern automation-led",
  "sample-thin": "Onboarding",
};

const VENDOR_ARCHETYPE_TO_SIZE_BAND: Record<VendorBankEntry["archetype"], string> = {
  "large-incumbent": "1000+ employees",
  "mid-market-specialist": "100-500 employees",
  "modern-fast-mover": "100-500 employees",
  "niche-depth": "25-100 employees",
};

const VENDOR_ARCHETYPE_TO_MATURITY: Record<VendorBankEntry["archetype"], string> = {
  "large-incumbent": "Mature platform",
  "mid-market-specialist": "Scaled specialist",
  "modern-fast-mover": "High-growth modern",
  "niche-depth": "Depth-first",
};

/** The 14 function-* utility keys, used to derive readable feature labels. */
function utilityKeyToLabel(key: string): string {
  return key
    .replace(/^function-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function vendorIntegrationNeeds(vendor: VendorBankEntry): string[] {
  const allKeys = new Set<string>();
  for (const product of vendor.products) {
    for (const key of product.utilityKeys) {
      allKeys.add(utilityKeyToLabel(key));
    }
  }
  return Array.from(allKeys).slice(0, 4);
}

function vendorRiskFlags(vendor: VendorBankEntry): string[] {
  const arch = vendor.archetype;
  if (arch === "large-incumbent") {
    return ["legacy migration paths slow rollouts", "feature breadth dilutes per-product depth"];
  }
  if (arch === "mid-market-specialist") {
    return ["upmarket pull risks under-serving small-firm tier"];
  }
  if (arch === "modern-fast-mover") {
    return ["aggressive ship cadence creates short-term breakage", "documentation lags release pace"];
  }
  return ["narrow product line limits expansion", "category depth hard for non-specialists to evaluate"];
}

function firmIntegrationNeeds(firm: FirmRosterEntry, flavor: DemoSeedFlavor): string[] {
  const needs = flavor.firmIntegrationNeeds[firm.archetype] ?? flavor.firmIntegrationNeeds["mid-tier"];
  if (!needs) throw new Error(`demo seed flavor ${flavor.verticalId} names no integration needs for archetype "${firm.archetype}"`);
  return [...needs];
}

function firmRiskFlags(firm: FirmRosterEntry, flavor: DemoSeedFlavor): string[] {
  const flags = flavor.firmRiskFlags[firm.archetype] ?? flavor.firmRiskFlags["mid-tier"];
  if (!flags) throw new Error(`demo seed flavor ${flavor.verticalId} names no risk flags for archetype "${firm.archetype}"`);
  return [...flags];
}

function firmSizeBand(firm: FirmRosterEntry, flavor: DemoSeedFlavor): string {
  const band = flavor.sizeBands[firm.size];
  if (!band) throw new Error(`demo seed flavor ${flavor.verticalId} maps no size band for roster size "${firm.size}"`);
  return band;
}

function firmMembership(firm: FirmRosterEntry): DemoMembershipInput {
  return firm.archetype === "high-performing" || firm.archetype === "tech-forward"
    ? ELITE_ACTIVE
    : PRO_ACTIVE;
}

function vendorMembership(vendor: VendorBankEntry): DemoMembershipInput {
  return vendor.archetype === "large-incumbent" || vendor.archetype === "modern-fast-mover"
    ? ELITE_ACTIVE
    : PRO_ACTIVE;
}

/** Map (0-100) module score target to the assessment's 1-5 raw scoreTarget axis. */
function scoreTargetFromPercent(scorePct: number): number {
  return Math.max(1, Math.min(5, 1 + (scorePct / 100) * 4));
}

function averageOfRanges(ranges: Record<string, [number, number]>): number {
  const values = Object.values(ranges);
  if (values.length === 0) return 65;
  return Math.round(values.reduce((acc, [low, high]) => acc + (low + high) / 2, 0) / values.length);
}

export type DemoChannelOptions = {
  /** The channel's demo words; accounting's by default (the literals this module used to carry). */
  flavor?: DemoSeedFlavor;
  /** The vertical and bank that resolve a product's canonical category; accounting's map by default. */
  categoryVertical?: ProductCategoryVertical;
  /** Replaces the `demo-bench-` id prefix when deriving slugs for another channel's catalog. */
  idPrefix?: string;
};

export function buildVendorPlan(vendor: VendorBankEntry, options: DemoChannelOptions = {}): DemoBenchmarkVendorPlan {
  const flavor = options.flavor ?? accountingFlavor();
  const vendorSlug = (id: string) => id.replace(options.idPrefix ? new RegExp(`^${options.idPrefix}vendor-`) : /^demo-bench-vendor-/, "");
  const productSlug = (id: string) => id.replace(options.idPrefix ? new RegExp(`^${options.idPrefix}product-`) : /^demo-bench-product-/, "");
  const productInputs: DemoProductInput[] = vendor.products.map((product) => ({
    key: product.id,
    name: product.name,
    // Block 10a: category is one of the 7 shared canonical categories (not the
    // raw utility label) so every vendor's products land in the same set and
    // each category clears the >=5-vendor benchmark floor. legal-load: another
    // channel resolves through its own category map (lib/productCategoryTaxonomy).
    category: canonicalCategoryForProduct(product.utilityKeys, options.categoryVertical),
    websitePath: `/products/${productSlug(product.id)}`,
    summary: `${product.name} is ${vendor.name}'s ${utilityKeyToLabel(
      product.utilityKeys[0] ?? "function-practice-management"
    ).toLowerCase()} module.`,
    deploymentModel: ProductDeploymentModel.CLOUD,
    utilityKeys: product.utilityKeys,
    scoreTarget: scoreTargetFromPercent(product.selfReportedScoreSeed),
    profile: {
      positioning: `${product.name} for ${utilityKeyToLabel(product.utilityKeys[0] ?? "function-practice-management").toLowerCase()}-led practices`,
      targetCustomer: VENDOR_ARCHETYPE_TO_SIZE_BAND[vendor.archetype],
      targetUseContext: flavor.vendorTargetUseContext,
      implementationStyle: vendor.archetype === "modern-fast-mover" ? "Self-serve with optional onboarding" : "Guided onboarding with CS partner",
      operatingModelFit: vendor.archetype === "niche-depth" ? "Specialist depth" : "Multi-team coverage",
      primaryBuyer: vendor.archetype === "large-incumbent" ? "Operations partner" : "Managing partner",
      integrationPosture: "API + SSO standard",
    },
    riskFlags: vendorRiskFlags(vendor),
  }));

  const demoVendorInput: DemoVendorInput = {
    key: vendor.id,
    displayName: vendor.name,
    website: `https://${vendorSlug(vendor.id)}.demo.pat.local`,
    industryFocus: vendor.tagline,
    sizeBand: VENDOR_ARCHETYPE_TO_SIZE_BAND[vendor.archetype],
    maturityLevel: VENDOR_ARCHETYPE_TO_MATURITY[vendor.archetype],
    integrationNeeds: vendorIntegrationNeeds(vendor),
    riskFlags: vendorRiskFlags(vendor),
    membership: vendorMembership(vendor),
    products: productInputs,
  };

  return { bankEntry: vendor, demoVendorInput };
}

export function buildFirmPlan(input: {
  firm: FirmRosterEntry;
  ecosystemIndex: number;
  firmIndex: number;
  archetypeProfile: FirmArchetypeProfile;
  vendorPlan: DemoBenchmarkVendorPlan;
  templates: OpenEndedTemplate[];
  rng: () => number;
  /**
   * Firm key namespace. Defaults to the canonical benchmark prefix so
   * planEcosystems() output stays byte-identical. The expansion planner
   * (lib/demo-seed/expansion.ts) passes "demo-expand-firm-" so its rows can
   * never collide with — or be mistaken for — the canonical demo cohort.
   */
  firmKeyPrefix?: string;
  /** legal-load: the channel's demo words; accounting's by default. */
  flavor?: DemoSeedFlavor;
}): DemoBenchmarkFirmPlan {
  const { firm, archetypeProfile, vendorPlan, templates, rng } = input;
  const flavor = input.flavor ?? accountingFlavor();

  // Per-module score target, drawn from the archetype's per-module range.
  const moduleScoreTargets: Record<string, number> = {};
  for (const [moduleKey, range] of Object.entries(archetypeProfile.moduleScoreRanges)) {
    moduleScoreTargets[moduleKey] = pickInRange(rng, range);
  }
  // Block 10a de-clump: firms sharing an archetype otherwise share a weakest
  // module, so every Sales-Card firm card names the SAME gap area. Rotate a
  // depressed module per firm (index-based, coprime step) so the weakest module —
  // and therefore the gap-area line — varies across a vendor's firm cards. Bounded
  // dip keeps scores plausible; the average is barely moved.
  const moduleKeysOrdered = Object.keys(moduleScoreTargets);
  if (moduleKeysOrdered.length > 0) {
    const weakIndex = (input.firmIndex * 3 + input.ecosystemIndex) % moduleKeysOrdered.length;
    const weakKey = moduleKeysOrdered[weakIndex]!;
    moduleScoreTargets[weakKey] = Math.max(24, Math.min(moduleScoreTargets[weakKey]! - 14, 100));
  }
  const avgScorePct = averageOfRanges(archetypeProfile.moduleScoreRanges);

  // Subset of vendor products this firm reviews.
  const reviewCount = Math.max(
    1,
    Math.round(vendorPlan.bankEntry.products.length * archetypeProfile.productReviewCoverage)
  );
  const productReviewIds = shuffle(vendorPlan.bankEntry.products, rng)
    .slice(0, reviewCount)
    .map((product) => product.id);

  // userCount perturbed +/- 3 from seed.
  const perturbation = Math.floor(rng() * 7) - 3;
  const userCount = Math.max(2, firm.userCountSeed + perturbation);

  const firmKeyPrefix = input.firmKeyPrefix ?? "demo-bench-firm-";
  const firmKey = `${firmKeyPrefix}${slugifyFirmName(firm.name)}-${input.ecosystemIndex}-${input.firmIndex}`;
  const demoFirmInput: DemoFirmInput = {
    key: firmKey,
    displayName: firm.name,
    industry: flavor.industry,
    sizeBand: firmSizeBand(firm, flavor),
    maturityLevel: ARCHETYPE_TO_MATURITY[firm.archetype],
    integrationNeeds: firmIntegrationNeeds(firm, flavor),
    riskFlags: firmRiskFlags(firm, flavor),
    scoreTarget: scoreTargetFromPercent(avgScorePct),
    membership: firmMembership(firm),
  };

  // Pre-render open-ended quotes per reviewed product.
  const openEndedQuotes: Record<string, string> = {};
  for (const productId of productReviewIds) {
    const product = vendorPlan.bankEntry.products.find((entry) => entry.id === productId);
    if (!product) continue;
    openEndedQuotes[productId] = renderOpenEndedQuote({
      firm,
      archetypeProfile,
      vendor: vendorPlan.bankEntry,
      product,
      templates,
      rng,
      phraseBanks: flavor.phraseBanks,
    });
  }

  return {
    bankEntry: firm,
    archetypeProfile,
    moduleScoreTargets,
    productReviewIds,
    userCount,
    demoFirmInput,
    openEndedQuotes,
  };
}

function slugifyFirmName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------- Open-ended quote renderer ----------

// The phrase banks the quote templates interpolate live in the channel's flavor file
// (data/demo-seed/flavor.json for accounting, the literals this block used to hold).

function pickFromBank(rng: () => number, bank: string[]): string {
  const idx = Math.floor(rng() * bank.length);
  return bank[idx] ?? bank[0] ?? "";
}

function renderOpenEndedQuote(input: {
  firm: FirmRosterEntry;
  archetypeProfile: FirmArchetypeProfile;
  vendor: VendorBankEntry;
  product: VendorBankProduct;
  templates: OpenEndedTemplate[];
  rng: () => number;
  phraseBanks: Record<string, string[]>;
}): string {
  const { archetypeProfile, vendor, product, templates, rng } = input;
  const candidates = templates.filter((template) => {
    if (template.tone !== archetypeProfile.openEndedTone) return false;
    const archetypes = template.applicableArchetypes;
    if (typeof archetypes === "string") return archetypes === "all";
    return archetypes.length === 0 || archetypes.includes(input.firm.archetype);
  });
  const pool = candidates.length > 0 ? candidates : templates;
  const template = pool[Math.floor(rng() * pool.length)] ?? templates[0];
  if (!template) return "";

  const context: Record<string, string> = {
    vendor: vendor.name,
    product: product.name,
  };
  for (const [slot, bank] of Object.entries(input.phraseBanks)) {
    context[slot] = pickFromBank(rng, bank);
  }

  return template.template.replace(/\{\{(\w+)\}\}/g, (_match, slot: string) => context[slot] ?? `{{${slot}}}`);
}

// ---------- Main planner ----------

export function planEcosystems(): DemoBenchmarkEcosystemPlan[] {
  const rng = createMulberry32(DEMO_BENCHMARK_SEED);
  const vendorBank = loadVendorCatalog();
  const firmRoster = loadFirmRoster();
  const archetypeMap = loadFirmArchetypes();
  const templates = loadOpenEndedTemplates();

  if (vendorBank.length < 4) {
    throw new Error(`Day-13 demo benchmark expects 4 vendors in vendor-catalog.json; got ${vendorBank.length}`);
  }

  const ecosystemSizes = [11, 13, 14, 9];
  const totalFirmsRequested = ecosystemSizes.reduce((sum, size) => sum + size, 0);
  if (firmRoster.length < totalFirmsRequested) {
    throw new Error(
      `Day-13 firm roster has ${firmRoster.length} entries; planner needs ${totalFirmsRequested}`
    );
  }

  const shuffledRoster = shuffle(firmRoster, rng);

  const plans: DemoBenchmarkEcosystemPlan[] = [];
  let rosterCursor = 0;

  for (let ecosystemIndex = 0; ecosystemIndex < 4; ecosystemIndex += 1) {
    const vendor = vendorBank[ecosystemIndex]!;
    const ecosystemFirmCount = ecosystemSizes[ecosystemIndex]!;
    const firmsForEcosystem = shuffledRoster.slice(rosterCursor, rosterCursor + ecosystemFirmCount);
    rosterCursor += ecosystemFirmCount;

    const vendorPlan = buildVendorPlan(vendor);
    const ecosystemSlug = vendor.id.replace(/^demo-bench-vendor-/, "");
    const ecosystemId = `demo-bench-ecosystem-${ecosystemSlug}`;

    const consultantSlug = ecosystemSlug;
    const consultant: DemoBenchmarkConsultantPlan = {
      userId: `demo-bench-user-consultant-${consultantSlug}`,
      profileId: `demo-bench-consultant-profile-${consultantSlug}`,
      email: `review.consultant+${consultantSlug}@pat.local`,
      name: `Consultant ${vendor.name}`,
    };

    const firmPlans: DemoBenchmarkFirmPlan[] = firmsForEcosystem.map((firm, firmIndex) => {
      const archetypeProfile = archetypeMap[firm.archetype];
      if (!archetypeProfile) {
        throw new Error(`Unknown firm archetype "${firm.archetype}" — not in firm-archetypes.json`);
      }
      return buildFirmPlan({
        firm,
        ecosystemIndex,
        firmIndex,
        archetypeProfile,
        vendorPlan,
        templates,
        rng,
      });
    });

    plans.push({
      ecosystemId,
      ecosystemName: `${vendor.name} Ecosystem`,
      consultant,
      vendor: vendorPlan,
      firms: firmPlans,
    });
  }

  return plans;
}
