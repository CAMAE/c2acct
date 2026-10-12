import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Demo seed words per channel (legal-load, R64; audit section 12 item 13).
 *
 * The combinator used to carry accounting's demo literals in code: the industry
 * line, the three size bands, the integration needs and risk flags per archetype,
 * the phrase banks the open-ended quotes interpolate, the vendor use context. A
 * legal demo firm would have printed "Public accounting" and "QuickBooks Online".
 * Those words now live in data: data/demo-seed/flavor.json carries accounting's
 * literals verbatim (planEcosystems() stays byte-identical, pinned by test) and
 * data/demo-seed/<vertical>/flavor.json carries another channel's.
 */
export type DemoSeedFlavor = {
  schemaVersion: number;
  verticalId: string;
  industry: string;
  /** Roster size key → the sizeBand line a demo firm carries. */
  sizeBands: Record<string, string>;
  firmIntegrationNeeds: Record<string, string[]>;
  firmRiskFlags: Record<string, string[]>;
  phraseBanks: Record<string, string[]>;
  vendorTargetUseContext: string;
};

const DEMO_SEED_ROOT = path.resolve(process.cwd(), "data", "demo-seed");

const cache = new Map<string, DemoSeedFlavor>();

export function loadDemoSeedFlavor(verticalId: string = "accounting"): DemoSeedFlavor {
  const cached = cache.get(verticalId);
  if (cached) return cached;
  const file =
    verticalId === "accounting"
      ? path.join(DEMO_SEED_ROOT, "flavor.json")
      : path.join(DEMO_SEED_ROOT, verticalId, "flavor.json");
  const parsed = JSON.parse(readFileSync(file, "utf8")) as DemoSeedFlavor;
  if (parsed.verticalId !== verticalId) {
    throw new Error(`demo seed flavor at ${file} says verticalId "${parsed.verticalId}", expected "${verticalId}"`);
  }
  for (const key of ["industry", "sizeBands", "firmIntegrationNeeds", "firmRiskFlags", "phraseBanks", "vendorTargetUseContext"] as const) {
    if (parsed[key] === undefined || parsed[key] === null) {
      throw new Error(`demo seed flavor at ${file} is missing ${key}`);
    }
  }
  cache.set(verticalId, parsed);
  return parsed;
}

/** Test helper. */
export function clearDemoSeedFlavorCache(): void {
  cache.clear();
}
