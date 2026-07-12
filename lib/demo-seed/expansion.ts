import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildFirmPlan,
  buildVendorPlan,
  createMulberry32,
  loadFirmArchetypes,
  loadOpenEndedTemplates,
  shuffle,
  type DemoBenchmarkConsultantPlan,
  type DemoBenchmarkEcosystemPlan,
  type DemoBenchmarkFirmPlan,
  type FirmRosterEntry,
  type VendorBankEntry,
} from "@/lib/demo-seed/combinator";

/**
 * Demo-ecosystem EXPANSION planner (2026-07-08).
 *
 * A pure sibling of combinator.ts:planEcosystems(). It reads the separate
 * expansion bank (data/demo-seed/expansion-catalog.json) and produces the same
 * DemoBenchmarkEcosystemPlan[] shape, so scripts/demo/expand-demo-ecosystem.ts
 * can hand the plans to the exact same idempotent ensure* helpers that
 * seed-demo-benchmark.ts uses.
 *
 * Boundary guarantee (verified by the script, not just asserted here):
 *   - vendor keys are demo-expand-vendor-* (straight from the bank ids)
 *   - firm keys are demo-expand-firm-* (firmKeyPrefix passed to buildFirmPlan)
 *   - ecosystem ids are demo-expand-ecosystem-*
 *   - consultant ids/emails are demo-expand-* / review.consultant+expand-*
 * Nothing this planner emits can collide with the canonical demo-bench-* cohort
 * or the pilot cohort. A distinct PRNG seed keeps its output independent of and
 * stable against the canonical planner.
 */

export const DEMO_EXPANSION_SEED = "pat-demo-expansion-v1";
export const EXPANSION_VENDOR_PREFIX = "demo-expand-vendor-";
export const EXPANSION_FIRM_PREFIX = "demo-expand-firm-";
export const EXPANSION_ECOSYSTEM_PREFIX = "demo-expand-ecosystem-";

const DEMO_SEED_ROOT = path.resolve(process.cwd(), "data", "demo-seed");

type ExpansionBank = {
  schemaVersion: number;
  ecosystemSizes: number[];
  vendors: VendorBankEntry[];
  firms: FirmRosterEntry[];
};

/**
 * Block 10a: scale the demo up ~4× (Cam's ~176 firms / ~32 vendors target) WITHOUT
 * hand-authoring a bigger bank. PAT_DEMO_EXPAND_SCALE (default 1) replicates every
 * vendor and firm N times with unique ids/names and per-replica score variety, so
 * each of the 7 canonical categories comfortably clears the ≥5-vendor benchmark
 * floor and both vendor accounts land a mixed strong/good/weak fit distribution.
 * Replication keeps writes serial in the caller — no fan-out (Day-16 pool lesson).
 */
// Block 11 N1: every replica (including r0) carries a distinct region tag so no
// two replicas of the same base firm read as one firm — the pre-fix "" on r0
// meant "Montrose Partners" and "Montrose Partners · Central" looked like the
// same firm ranked both #1-strong and #6-weak. Ids still use "" for r0 (stable
// base ids); only the display name gets the region tag.
const REPLICA_REGION = [" · National", " · East", " · Central", " · West", " · South", " · Pacific"] as const;

function expandScale(): number {
  const raw = Number(process.env.PAT_DEMO_EXPAND_SCALE ?? "1");
  return Number.isFinite(raw) && raw >= 1 ? Math.min(6, Math.floor(raw)) : 1;
}

/** Deterministic per-replica score nudge (keeps seeds in a plausible band). */
function nudgeScore(seed: number, replica: number): number {
  const deltas = [0, -9, 6, -4, 11, -7];
  return Math.max(28, Math.min(96, Math.round(seed + (deltas[replica] ?? 0))));
}

function replicateBank(bank: ExpansionBank, scale: number): ExpansionBank {
  if (scale <= 1) return bank;
  const vendors: VendorBankEntry[] = [];
  const ecosystemSizes: number[] = [];
  for (let r = 0; r < scale; r += 1) {
    bank.vendors.forEach((vendor, vendorIndex) => {
      const suffix = r === 0 ? "" : `-r${r}`;
      vendors.push({
        ...vendor,
        id: `${vendor.id}${suffix}`,
        name: `${vendor.name}${REPLICA_REGION[r] ?? ` ${r + 1}`}`,
        products: vendor.products.map((product) => ({
          ...product,
          id: `${product.id}${suffix}`,
          selfReportedScoreSeed: nudgeScore(product.selfReportedScoreSeed, r),
        })),
      });
      ecosystemSizes.push(bank.ecosystemSizes[vendorIndex]!);
    });
  }
  const firms: FirmRosterEntry[] = [];
  for (let r = 0; r < scale; r += 1) {
    bank.firms.forEach((firm) => {
      firms.push({ ...firm, name: `${firm.name}${REPLICA_REGION[r] ?? ` ${r + 1}`}` });
    });
  }
  return { ...bank, vendors, ecosystemSizes, firms };
}

export function loadExpansionBank(): ExpansionBank {
  const parsed = JSON.parse(
    readFileSync(path.join(DEMO_SEED_ROOT, "expansion-catalog.json"), "utf8")
  ) as ExpansionBank;
  const bank = replicateBank(parsed, expandScale());

  if (!Array.isArray(bank.vendors) || bank.vendors.length === 0) {
    throw new Error("expansion-catalog.json: no vendors");
  }
  if (!Array.isArray(bank.ecosystemSizes) || bank.ecosystemSizes.length !== bank.vendors.length) {
    throw new Error(
      `expansion-catalog.json: ecosystemSizes (${bank.ecosystemSizes?.length ?? 0}) must have one entry per vendor (${bank.vendors.length})`
    );
  }
  for (const vendor of bank.vendors) {
    if (!vendor.id.startsWith(EXPANSION_VENDOR_PREFIX)) {
      throw new Error(
        `expansion-catalog.json: vendor id "${vendor.id}" must start with ${EXPANSION_VENDOR_PREFIX} to stay in the demo-expand boundary`
      );
    }
  }
  const totalFirmsRequested = bank.ecosystemSizes.reduce((sum, size) => sum + size, 0);
  if (bank.firms.length < totalFirmsRequested) {
    throw new Error(
      `expansion-catalog.json: roster has ${bank.firms.length} firms; ecosystemSizes need ${totalFirmsRequested}`
    );
  }
  return bank;
}

export function planExpansionEcosystems(): DemoBenchmarkEcosystemPlan[] {
  const rng = createMulberry32(DEMO_EXPANSION_SEED);
  const bank = loadExpansionBank();
  const archetypeMap = loadFirmArchetypes();
  const templates = loadOpenEndedTemplates();

  const shuffledRoster = shuffle(bank.firms, rng);

  const plans: DemoBenchmarkEcosystemPlan[] = [];
  let rosterCursor = 0;

  for (let ecosystemIndex = 0; ecosystemIndex < bank.vendors.length; ecosystemIndex += 1) {
    const vendor = bank.vendors[ecosystemIndex]!;
    const ecosystemFirmCount = bank.ecosystemSizes[ecosystemIndex]!;
    const firmsForEcosystem = shuffledRoster.slice(rosterCursor, rosterCursor + ecosystemFirmCount);
    rosterCursor += ecosystemFirmCount;

    const vendorPlan = buildVendorPlan(vendor);
    const ecosystemSlug = vendor.id.replace(EXPANSION_VENDOR_PREFIX, "");
    const ecosystemId = `${EXPANSION_ECOSYSTEM_PREFIX}${ecosystemSlug}`;

    const consultant: DemoBenchmarkConsultantPlan = {
      userId: `demo-expand-user-consultant-${ecosystemSlug}`,
      profileId: `demo-expand-consultant-profile-${ecosystemSlug}`,
      email: `review.consultant+expand-${ecosystemSlug}@pat.local`,
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
        firmKeyPrefix: EXPANSION_FIRM_PREFIX,
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
