import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_VERSION,
  type ProductTextQuestionDefinition,
  type ProductUtilityDefinition,
} from "@/lib/productUtilityRegistry";
import { DEFAULT_VERTICAL_ID, resolveCurrentVertical, type ResolveVerticalOptions } from "./context";
import { isVerticalPacksEnabled } from "./flag";

/**
 * The pack-declared product-utility question bank (W3,
 * VERTICAL-READINESS-AUDIT-2026-08 §3.1, §5.5).
 *
 * ## The key
 *
 * Audit §5.5 raised that `2026-08-product-utility-v3` encodes no vertical, so
 * two verticals could not both version their banks. The ruling is that the
 * version string stays UNQUALIFIED exactly as it is today, and the identity of
 * a bank is the PAIR:
 *
 *     (verticalId, versionId)
 *
 * `verticalId` comes from the W5 column — one source of truth — and never from
 * parsing a compound string. There is deliberately no slash-joined form of this
 * key anywhere in the codebase: a joined id would be a second spelling of the
 * same fact, it would have to be parsed back apart to be useful, and every
 * accounting row and question id would have to change to adopt it. Accounting's
 * question ids stay byte-identical precisely because the version half of the
 * pair is untouched.
 *
 * The store is therefore a MAP OF MAPS — vertical → version → bundle — rather
 * than a flat map under a composed string key. The nesting is the point: there
 * is no string to build and no string to split.
 *
 * ## The freeze rule
 *
 * Audit §5.4 froze pack ids because stored rows reference them. The same
 * reasoning covers BOTH halves of this pair: a stored response id embeds the
 * version, and a stored row's `verticalId` names the vertical. Renaming either
 * one orphans the rows that reference it, silently, because both columns keep
 * holding valid-looking strings. {@link FROZEN_REGISTRY_KEYS} makes a
 * config-only rename of either half fail in CI.
 */

/**
 * The two text modules a bank carries. Narrower than
 * `ProductQuestionModuleDefinition` on purpose: both of these are text-only, and
 * the general module's questions carry `fieldKey`, which the scored variant of
 * the union does not have.
 */
export type ProductTextModuleDefinition = {
  key: string;
  title: string;
  description: string;
  questions: ProductTextQuestionDefinition[];
};

export type ProductUtilityRegistryBundle = {
  /** The vertical half of the key — the W5 column's value, never parsed out of a string. */
  verticalId: string;
  /** The version half — unqualified, exactly as it is stored in question ids today. */
  versionId: string;
  utilities: ProductUtilityDefinition[];
  generalModule: ProductTextModuleDefinition;
  openEndedModule: ProductTextModuleDefinition;
};

/**
 * Accounting's bank, from the in-code registry.
 *
 * Flag off, `lib/vendorProductQuestionBank.ts` resolves to exactly this — the
 * same object graph the module-level `import { PRODUCT_UTILITY_REGISTRY }`
 * always produced, with no pack load and no filesystem access. That is what
 * "flag-off imports PRODUCT_UTILITY_REGISTRY as today" means structurally, and
 * it is why the eval goldens do not move.
 */
export const ACCOUNTING_PRODUCT_UTILITY_REGISTRY: ProductUtilityRegistryBundle = Object.freeze({
  verticalId: DEFAULT_VERTICAL_ID,
  versionId: PRODUCT_UTILITY_REGISTRY_VERSION,
  utilities: PRODUCT_UTILITY_REGISTRY,
  generalModule: PRODUCT_GENERAL_MODULE,
  openEndedModule: PRODUCT_OPEN_ENDED_MODULE,
});

/** One frozen (vertical, version) pair per bank that stored rows reference. */
export type FrozenRegistryKey = { verticalId: string; versionId: string };

/**
 * Both halves of every key that stored data points at. Frozen for the same
 * reason `FROZEN_VERTICAL_IDS` is: a rename here is a data migration over
 * question ids and `verticalId` columns, never a config edit.
 */
export const FROZEN_REGISTRY_KEYS: readonly FrozenRegistryKey[] = Object.freeze([
  Object.freeze({
    verticalId: DEFAULT_VERTICAL_ID,
    versionId: PRODUCT_UTILITY_REGISTRY_VERSION,
  }),
]);

/**
 * NOTE — no `node:fs` / `node:path` in this file, and no import of `./loader`.
 *
 * This module is reachable from client components (a product-assessment client
 * imports `lib/vendorPat.ts`, which imports the bank builders, which import
 * this). A Node builtin anywhere in that graph fails the client bundle outright,
 * even behind a dynamic `import()` — webpack still resolves it. The
 * filesystem-touching half therefore lives in `./questionBankPackLoader.ts`,
 * which only server code imports. Same rule as the client lexicon: resolution
 * and loading are server-side, the resolved values travel.
 */

// vertical → version → bundle. Nested, so the composite key never becomes a string.
const registered = new Map<string, Map<string, ProductUtilityRegistryBundle>>();

/** Register a loaded bank under its (vertical, version) pair. */
export function registerProductUtilityRegistry(
  bundle: ProductUtilityRegistryBundle
): ProductUtilityRegistryBundle {
  const byVersion = registered.get(bundle.verticalId) ?? new Map<string, ProductUtilityRegistryBundle>();
  byVersion.set(bundle.versionId, bundle);
  registered.set(bundle.verticalId, byVersion);
  return bundle;
}

/**
 * The (vertical, version)-keyed lookup. Every registry lookup that was keyed by
 * version alone resolves through this.
 */
export function getProductUtilityRegistry(
  verticalId: string,
  versionId: string
): ProductUtilityRegistryBundle | null {
  return registered.get(verticalId)?.get(versionId) ?? null;
}

/** Every version registered for one vertical, sorted. Never crosses verticals. */
export function listRegisteredVersions(verticalId: string): string[] {
  return [...(registered.get(verticalId)?.keys() ?? [])].sort();
}

/** Test/teardown helper — drops every registered bank. */
export function clearProductUtilityRegistries(): void {
  registered.clear();
}

/**
 * Validate a bank payload against the pack that declares it.
 *
 * Exported and pure so the rules below are tested for what they are, rather than
 * inferred from a missing-file error: a validator only reachable through the
 * filesystem is a validator whose branches are never actually exercised.
 */
export function validateProductUtilityRegistryPayload(
  verticalId: string,
  payload: unknown
): ProductUtilityRegistryBundle {
  const parsed = (payload ?? {}) as Partial<ProductUtilityRegistryBundle>;

  // The pair must be asserted, not inferred. A bank whose manifest says one
  // vertical and whose payload says another would register under a key nothing
  // looks it up by.
  if (parsed.verticalId !== verticalId) {
    throw new Error(
      `Vertical Pack "${verticalId}" declares a product-utility registry whose verticalId is ` +
        `"${parsed.verticalId}". The pair (verticalId, versionId) is the bank's identity; ` +
        "its halves cannot disagree with the pack that declares it."
    );
  }
  if (typeof parsed.versionId !== "string" || parsed.versionId.trim().length === 0) {
    throw new Error(`Vertical Pack "${verticalId}" product-utility registry has no versionId.`);
  }
  if (parsed.versionId.includes("/")) {
    // Guarding the ruling itself: the version half stays unqualified. A
    // slash-joined id would be a second spelling of the vertical, parsed apart
    // at every read, and would change every stored question id.
    throw new Error(
      `Vertical Pack "${verticalId}" product-utility registry versionId "${parsed.versionId}" ` +
        "is vertical-qualified. The version id stays unqualified — the vertical half of the " +
        "key comes from the verticalId column, not from parsing a compound string."
    );
  }
  if (!Array.isArray(parsed.utilities) || !parsed.generalModule || !parsed.openEndedModule) {
    throw new Error(
      `Vertical Pack "${verticalId}" product-utility registry is missing utilities, ` +
        "generalModule or openEndedModule."
    );
  }

  return parsed as ProductUtilityRegistryBundle;
}

/**
 * The bank for the current request.
 *
 * Flag off: the in-code accounting bundle, returned before any resolution and
 * before any pack load — the §3.3 short-circuit, identical in shape to the one
 * in `resolveLexicon()` and `verticalFilter()`.
 *
 * Flag on: the resolved vertical's registered bank. Accounting falls back to
 * the in-code bundle because accounting's bank IS in-code truth (and the
 * contract test pins the pack copy to it). Any OTHER vertical throws rather
 * than falling back: serving accounting's utilities inside another vertical's
 * assessment reads as correct and is not — the same failure mode, and the same
 * ruling, as a partially-primed lexicon.
 */
export function resolveProductUtilityRegistry(
  options: ResolveVerticalOptions = {}
): ProductUtilityRegistryBundle {
  if (!isVerticalPacksEnabled(options.env ?? process.env)) {
    return ACCOUNTING_PRODUCT_UTILITY_REGISTRY;
  }

  const verticalId = resolveCurrentVertical(options);
  const versions = registered.get(verticalId);
  if (versions && versions.size > 0) {
    // One registered bank per vertical in practice; if several versions are
    // registered, the newest by id wins deterministically.
    const newest = [...versions.keys()].sort().at(-1)!;
    return versions.get(newest)!;
  }

  if (verticalId === DEFAULT_VERTICAL_ID) {
    return ACCOUNTING_PRODUCT_UTILITY_REGISTRY;
  }

  throw new Error(
    `Vertical "${verticalId}" has no registered product-utility bank. Call ` +
      "loadPackProductUtilityRegistry() at the request/job boundary before building a " +
      "product assessment for it. Falling back to accounting's utilities would render " +
      "one vertical's question bank inside another vertical's assessment."
  );
}
