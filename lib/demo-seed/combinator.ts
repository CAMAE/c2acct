import { readFileSync } from "node:fs";
import path from "node:path";

import { MembershipPlan, MembershipStatus, ProductDeploymentModel } from "@prisma/client";

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
  size: "small" | "mid" | "large";
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

function createMulberry32(seedString: string) {
  let state = stringToSeedNumber(seedString);
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
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

const SIZE_TO_BAND: Record<FirmRosterEntry["size"], string> = {
  small: "<25 employees",
  mid: "25-100 employees",
  large: "100+ employees",
};

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

function firmIntegrationNeeds(firm: FirmRosterEntry): string[] {
  const arch = firm.archetype;
  if (arch === "high-performing" || arch === "tech-forward") {
    return ["client portal", "QuickBooks Online", "secure document exchange", "automation orchestration"];
  }
  if (arch === "compliance-heavy") {
    return ["audit trail export", "regulatory filing", "evidence retention", "client portal"];
  }
  if (arch === "struggling" || arch === "sample-thin") {
    return ["QuickBooks Online", "spreadsheet import"];
  }
  return ["QuickBooks Online", "client portal", "document management"];
}

function firmRiskFlags(firm: FirmRosterEntry, archetypeProfile: FirmArchetypeProfile): string[] {
  void archetypeProfile;
  const arch = firm.archetype;
  if (arch === "struggling") {
    return ["staff churn slows process adoption", "key-person risk on tax season prep"];
  }
  if (arch === "sample-thin") {
    return ["evidence still accumulating across modules"];
  }
  if (arch === "compliance-heavy") {
    return ["regulator-driven roadmap dominates capacity planning"];
  }
  if (arch === "tech-forward") {
    return ["automation tooling outpacing process documentation"];
  }
  return ["growth straining cross-team communication"];
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

function buildVendorPlan(vendor: VendorBankEntry): DemoBenchmarkVendorPlan {
  const productInputs: DemoProductInput[] = vendor.products.map((product) => ({
    key: product.id,
    name: product.name,
    category: utilityKeyToLabel(product.utilityKeys[0] ?? "function-practice-management"),
    websitePath: `/products/${product.id.replace(/^demo-bench-product-/, "")}`,
    summary: `${product.name} is ${vendor.name}'s ${utilityKeyToLabel(
      product.utilityKeys[0] ?? "function-practice-management"
    ).toLowerCase()} module.`,
    deploymentModel: ProductDeploymentModel.CLOUD,
    utilityKeys: product.utilityKeys,
    scoreTarget: scoreTargetFromPercent(product.selfReportedScoreSeed),
    profile: {
      positioning: `${product.name} for ${utilityKeyToLabel(product.utilityKeys[0] ?? "function-practice-management").toLowerCase()}-led practices`,
      targetCustomer: VENDOR_ARCHETYPE_TO_SIZE_BAND[vendor.archetype],
      targetUseContext: "Recurring monthly engagements + ad-hoc client work",
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
    website: `https://${vendor.id.replace(/^demo-bench-vendor-/, "")}.demo.pat.local`,
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

function buildFirmPlan(input: {
  firm: FirmRosterEntry;
  ecosystemIndex: number;
  firmIndex: number;
  archetypeProfile: FirmArchetypeProfile;
  vendorPlan: DemoBenchmarkVendorPlan;
  templates: OpenEndedTemplate[];
  rng: () => number;
}): DemoBenchmarkFirmPlan {
  const { firm, archetypeProfile, vendorPlan, templates, rng } = input;

  // Per-module score target, drawn from the archetype's per-module range.
  const moduleScoreTargets: Record<string, number> = {};
  for (const [moduleKey, range] of Object.entries(archetypeProfile.moduleScoreRanges)) {
    moduleScoreTargets[moduleKey] = pickInRange(rng, range);
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

  const firmKey = `demo-bench-firm-${slugifyFirmName(firm.name)}-${input.ecosystemIndex}-${input.firmIndex}`;
  const demoFirmInput: DemoFirmInput = {
    key: firmKey,
    displayName: firm.name,
    industry: "Public accounting",
    sizeBand: SIZE_TO_BAND[firm.size],
    maturityLevel: ARCHETYPE_TO_MATURITY[firm.archetype],
    integrationNeeds: firmIntegrationNeeds(firm),
    riskFlags: firmRiskFlags(firm, archetypeProfile),
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

const PHRASE_BANKS: Record<string, string[]> = {
  duration: ["18 months", "two years", "the past three years", "since the 2024 tax season", "roughly a year"],
  feature_area: [
    "monthly close",
    "client onboarding",
    "tax workflow",
    "audit prep",
    "engagement letter generation",
    "billing reconciliation",
    "document collection",
  ],
  sentiment_modifier: [
    "consistently solid",
    "uneven",
    "noticeably improved",
    "still maturing",
    "best-in-class",
    "adequate",
  ],
  specific_callout: [
    "Our partners use it directly without staff translation.",
    "Onboarding new clients went from a week to two days.",
    "We've stopped getting end-of-month surprises.",
    "Year-over-year revenue per partner is up materially.",
  ],
  primary_use: [
    "tax",
    "audit",
    "CAS",
    "advisory",
    "client management",
    "monthly close",
    "compliance reporting",
  ],
  gap_area: [
    "complex multi-entity scenarios",
    "non-US tax compliance",
    "international subsidiary consolidations",
    "specialty industry verticals",
    "legacy ERP integrations",
  ],
  adjacent_system: [
    "QuickBooks Online",
    "NetSuite",
    "Xero",
    "DocuSign",
    "Bill.com",
    "our internal billing tool",
  ],
  promised_capability: [
    "AI-assisted reconciliation",
    "no-code workflow builder",
    "advanced reporting",
    "embedded e-signature",
    "client-side mobile app",
  ],
  capability_gap: [
    "deeper analytics",
    "configurable approval flows",
    "audit-trail granularity",
    "API-first integration",
    "multi-entity consolidation",
  ],
  growth_target: [
    "150 clients next year",
    "two new partner additions",
    "double the CAS book",
    "a second regional office",
  ],
};

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
  for (const [slot, bank] of Object.entries(PHRASE_BANKS)) {
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
