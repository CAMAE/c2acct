import { isVerticalPacksEnabled, type VerticalEnv } from "./flag";

/**
 * Resolve the "current vertical" for a request
 * (VERTICAL-READINESS-AUDIT-2026-08 §3.2).
 *
 * Resolution order, first hit wins:
 *   1. explicit argument   — an operator or job naming a vertical outright
 *   2. tenant              — `Company.verticalId` for the signed-in company
 *   3. PAT_DEFAULT_VERTICAL — env override
 *   4. the `"accounting"` constant
 *
 * With PAT_ENABLE_VERTICAL_PACKS off (the default) this short-circuits to the
 * constant at step 0 — the explicit argument, the tenant column and the env
 * override are all ignored, and no pack is loaded. That is the whole point: a
 * flag-off tenant cannot be reached by a pack bug, a mis-seeded
 * `Company.verticalId`, or a stray env var.
 */
export const DEFAULT_VERTICAL_ID = "accounting";

/**
 * Pack ids referenced by stored rows are FROZEN (audit §5.4). Every one of the
 * fourteen verticalized models defaults its `verticalId` to `"accounting"`, and
 * those defaults were written before any vertical existed. Renaming the pack
 * would silently orphan every one of those rows — the column would keep saying
 * `"accounting"` while no such pack existed to resolve it. Renames are a data
 * migration, never a config edit.
 *
 * Enforced by `tests/vertical-resolver.contract.test.ts`.
 */
export const FROZEN_VERTICAL_IDS: readonly string[] = Object.freeze([DEFAULT_VERTICAL_ID]);

/**
 * The tenant half of the resolution order. Structurally minimal on purpose: the
 * resolver needs `Company.verticalId` and nothing else, so any caller holding a
 * company row (or a projection of one) can satisfy it without importing Prisma
 * types or widening this seam into a session dependency.
 */
export type VerticalSession = {
  company?: { verticalId?: string | null } | null;
} | null;

export type ResolveVerticalOptions = {
  /** Step 1 — an operator or job naming a vertical outright. */
  verticalId?: string | null;
  /** Step 2 — the signed-in company, carrying its `verticalId`. */
  session?: VerticalSession;
  env?: VerticalEnv;
};

/** Which step of the order produced the answer. Useful for tests and logs. */
export type VerticalResolutionSource = "flag-off" | "explicit" | "tenant" | "env" | "constant";

export type VerticalResolution = {
  verticalId: string;
  source: VerticalResolutionSource;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * The resolution order with its provenance attached. `resolveCurrentVertical()`
 * is the string-returning form callers want; this is the form the contract test
 * wants, because "returned accounting" and "short-circuited to accounting" are
 * the same string and very much not the same guarantee.
 */
export function resolveCurrentVerticalWithSource(
  options: ResolveVerticalOptions = {}
): VerticalResolution {
  const env = options.env ?? process.env;

  // Step 0 — flag off: the constant, before any pack load. Not "load the
  // accounting pack": return the constant.
  if (!isVerticalPacksEnabled(env)) {
    return { verticalId: DEFAULT_VERTICAL_ID, source: "flag-off" };
  }

  const explicit = clean(options.verticalId);
  if (explicit) {
    return { verticalId: explicit, source: "explicit" };
  }

  const tenant = clean(options.session?.company?.verticalId);
  if (tenant) {
    return { verticalId: tenant, source: "tenant" };
  }

  const override = clean(env.PAT_DEFAULT_VERTICAL);
  if (override) {
    return { verticalId: override, source: "env" };
  }

  return { verticalId: DEFAULT_VERTICAL_ID, source: "constant" };
}

export function resolveCurrentVertical(options: ResolveVerticalOptions = {}): string {
  return resolveCurrentVerticalWithSource(options).verticalId;
}
