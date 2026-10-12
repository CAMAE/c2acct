import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFirmPlan,
  buildVendorPlan,
  createMulberry32,
  loadOpenEndedTemplates,
  shuffle,
  type DemoBenchmarkConsultantPlan,
  type DemoBenchmarkEcosystemPlan,
  type DemoBenchmarkFirmPlan,
  type FirmArchetypeKey,
  type FirmArchetypeProfile,
  type FirmRosterEntry,
  type VendorBankEntry,
} from "@/lib/demo-seed/combinator";
import { loadDemoSeedFlavor } from "@/lib/demo-seed/flavor";
import type { ProductCategoryVertical } from "@/lib/productCategoryTaxonomy";

/**
 * Legal demo planner (legal-load, R64; audit section 12 items 11 and 13, delta 6).
 *
 * A pure sibling of combinator.ts:planEcosystems() and expansion.ts: it reads the
 * legal demo bank under data/demo-seed/legal/ and produces the same
 * DemoBenchmarkEcosystemPlan[] shape, so scripts/demo/seed-legal-demo.ts hands the
 * plans to the same idempotent ensure* helpers with a DemoSeedChannel.
 *
 * Boundary (verified by the script, not just asserted here):
 *   - vendor keys are demo-legal-vendor-* (the catalog ids)
 *   - firm keys are demo-legal-firm-* (firmKeyPrefix passed to buildFirmPlan)
 *   - ecosystem ids are demo-legal-ecosystem-*
 *   - consultant ids/emails are demo-legal-* / review.consultant+legal-*
 * Every Company id these produce starts with "demo-", which lib/dataBoundaryBackfill
 * classifies DEMO. A distinct PRNG seed keeps the output independent of the
 * accounting planners.
 */

export const LEGAL_DEMO_SEED = "pat-legal-demo-v1";
export const LEGAL_DEMO_PREFIX = "demo-legal-";
export const LEGAL_VENDOR_PREFIX = `${LEGAL_DEMO_PREFIX}vendor-`;
export const LEGAL_FIRM_PREFIX = `${LEGAL_DEMO_PREFIX}firm-`;
export const LEGAL_ECOSYSTEM_PREFIX = `${LEGAL_DEMO_PREFIX}ecosystem-`;
export const LEGAL_VERTICAL_ID = "legal";

const LEGAL_SEED_ROOT = path.resolve(process.cwd(), "data", "demo-seed", "legal");
const LEGAL_REGISTRY_FILE = path.resolve(process.cwd(), "verticals", "legal", "registry", "product-utility-v1.json");

/** One ecosystem per legal demo vendor; the five sizes sum to the 40-firm roster. */
export const LEGAL_ECOSYSTEM_SIZES = [9, 8, 7, 9, 7];

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function loadLegalVendorCatalog(): VendorBankEntry[] {
  return readJson<{ vendors: VendorBankEntry[] }>(path.join(LEGAL_SEED_ROOT, "vendor-catalog.json")).vendors;
}

export function loadLegalFirmRoster(): FirmRosterEntry[] {
  return readJson<{ firms: FirmRosterEntry[] }>(path.join(LEGAL_SEED_ROOT, "firm-roster.json")).firms;
}

export function loadLegalFirmArchetypes(): Record<FirmArchetypeKey, FirmArchetypeProfile> {
  const archetypes = readJson<{ archetypes: FirmArchetypeProfile[] }>(path.join(LEGAL_SEED_ROOT, "firm-archetypes.json")).archetypes;
  const map: Partial<Record<FirmArchetypeKey, FirmArchetypeProfile>> = {};
  for (const profile of archetypes) map[profile.archetype] = profile;
  return map as Record<FirmArchetypeKey, FirmArchetypeProfile>;
}

/** The legal bank's utilities, for the per-vertical canonical category map (no registry resolution, no flag read). */
export function loadLegalCategoryVertical(): ProductCategoryVertical {
  const registry = readJson<{ verticalId: string; utilities: Array<{ key: string; taxonomyBucketKeys: string[] }> }>(LEGAL_REGISTRY_FILE);
  if (registry.verticalId !== LEGAL_VERTICAL_ID) {
    throw new Error(`legal registry at ${LEGAL_REGISTRY_FILE} says verticalId "${registry.verticalId}"`);
  }
  return { verticalId: LEGAL_VERTICAL_ID, utilities: registry.utilities };
}

export function planLegalEcosystems(): DemoBenchmarkEcosystemPlan[] {
  const rng = createMulberry32(LEGAL_DEMO_SEED);
  const vendors = loadLegalVendorCatalog();
  const roster = loadLegalFirmRoster();
  const archetypeMap = loadLegalFirmArchetypes();
  const templates = loadOpenEndedTemplates();
  const flavor = loadDemoSeedFlavor(LEGAL_VERTICAL_ID);
  const categoryVertical = loadLegalCategoryVertical();

  if (vendors.length !== LEGAL_ECOSYSTEM_SIZES.length) {
    throw new Error(`legal demo expects ${LEGAL_ECOSYSTEM_SIZES.length} vendors in vendor-catalog.json; got ${vendors.length}`);
  }
  const requested = LEGAL_ECOSYSTEM_SIZES.reduce((sum, size) => sum + size, 0);
  if (roster.length < requested) {
    throw new Error(`legal demo roster has ${roster.length} firms; the ecosystem sizes need ${requested}`);
  }
  for (const vendor of vendors) {
    if (!vendor.id.startsWith(LEGAL_VENDOR_PREFIX)) {
      throw new Error(`legal vendor id "${vendor.id}" must start with ${LEGAL_VENDOR_PREFIX}`);
    }
  }

  const shuffledRoster = shuffle(roster, rng);
  const plans: DemoBenchmarkEcosystemPlan[] = [];
  let cursor = 0;

  for (const [ecosystemIndex, vendor] of vendors.entries()) {
    const count = LEGAL_ECOSYSTEM_SIZES[ecosystemIndex]!;
    const firms = shuffledRoster.slice(cursor, cursor + count);
    cursor += count;

    const vendorPlan = buildVendorPlan(vendor, { flavor, categoryVertical, idPrefix: LEGAL_DEMO_PREFIX });
    const slug = vendor.id.replace(LEGAL_VENDOR_PREFIX, "");
    const consultant: DemoBenchmarkConsultantPlan = {
      userId: `${LEGAL_DEMO_PREFIX}user-consultant-${slug}`,
      profileId: `${LEGAL_DEMO_PREFIX}consultant-profile-${slug}`,
      email: `review.consultant+legal-${slug}@pat.local`,
      name: `Guide ${vendor.name}`,
    };

    const firmPlans: DemoBenchmarkFirmPlan[] = firms.map((firm, firmIndex) => {
      const archetypeProfile = archetypeMap[firm.archetype];
      if (!archetypeProfile) {
        throw new Error(`Unknown legal firm archetype "${firm.archetype}" — not in data/demo-seed/legal/firm-archetypes.json`);
      }
      return buildFirmPlan({
        firm,
        ecosystemIndex,
        firmIndex,
        archetypeProfile,
        vendorPlan,
        templates,
        rng,
        firmKeyPrefix: LEGAL_FIRM_PREFIX,
        flavor,
      });
    });

    plans.push({
      ecosystemId: `${LEGAL_ECOSYSTEM_PREFIX}${slug}`,
      ecosystemName: `${vendor.name} Ecosystem`,
      consultant,
      vendor: vendorPlan,
      firms: firmPlans,
    });
  }

  return plans;
}
