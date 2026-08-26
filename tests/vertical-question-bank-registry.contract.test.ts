import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_VERSION,
} from "@/lib/productUtilityRegistry";
import { buildProductAssessmentPlan } from "@/lib/vendorProductQuestionBank";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import { VERTICAL_PACKS_FLAG_ENV, type VerticalEnv } from "@/lib/verticals/flag";
import { loadVerticalPack } from "@/lib/verticals/loader";
import {
  ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
  FROZEN_REGISTRY_KEYS,
  clearProductUtilityRegistries,
  getProductUtilityRegistry,
  registerProductUtilityRegistry,
  resolveProductUtilityRegistry,
  validateProductUtilityRegistryPayload,
} from "@/lib/verticals/questionBankRegistry";
import { loadPackProductUtilityRegistry } from "@/lib/verticals/questionBankPackLoader";

/**
 * W3 contract (VERTICAL-READINESS-AUDIT-2026-08 §3.1, §5.4, §5.5).
 *
 * The ruling this suite enforces: the registry version id stays UNQUALIFIED,
 * and a bank's identity is the pair (verticalId, versionId) — the vertical half
 * coming from the W5 column, never from parsing a compound string. There is no
 * slash-joined key, so accounting's stored question ids do not move.
 */

const ROOT = process.cwd();
const FLAG_ON: VerticalEnv = { [VERTICAL_PACKS_FLAG_ENV]: "1" };
const FLAG_OFF: VerticalEnv = {};

afterEach(() => {
  clearProductUtilityRegistries();
});

describe("the accounting pack's bank deep-equals the in-code registry", () => {
  it("matches, field for field, flag on", async () => {
    // THE required assertion. `lib/productUtilityRegistry.ts` is what ships;
    // verticals/accounting/registry/product-utility-v3.json is its mirror so the
    // pack declares its own bank the way a second vertical would. Drift between
    // the two would mean flag-on accounting serves a different bank than
    // flag-off accounting — the exact thing byte-identity forbids.
    const packBundle = await loadPackProductUtilityRegistry(DEFAULT_VERTICAL_ID);
    expect(packBundle).toEqual(ACCOUNTING_PRODUCT_UTILITY_REGISTRY);
  });

  it("carries the in-code utilities, general and open-ended modules verbatim", async () => {
    const packBundle = await loadPackProductUtilityRegistry(DEFAULT_VERTICAL_ID);
    expect(packBundle.utilities).toEqual(PRODUCT_UTILITY_REGISTRY);
    expect(packBundle.generalModule).toEqual(PRODUCT_GENERAL_MODULE);
    expect(packBundle.openEndedModule).toEqual(PRODUCT_OPEN_ENDED_MODULE);
    expect(packBundle.utilities).toHaveLength(18);
    expect(packBundle.utilities.every((utility) => utility.subcategories.length === 4)).toBe(true);
  });

  it("is declared by the manifest at the path the pack says", async () => {
    const pack = await loadVerticalPack(DEFAULT_VERTICAL_ID);
    expect(pack.questionBank.utilityRegistry).toBe("registry/product-utility-v3.json");
    // The declared path must actually resolve — a dangling pointer would only
    // surface the first time a flag-on request tried to build an assessment.
    const file = path.resolve(pack.dir, pack.questionBank.utilityRegistry!);
    expect(() => readFileSync(file, "utf8")).not.toThrow();
  });
});

describe("the key is a pair, never a joined string", () => {
  it("keeps the version id unqualified", () => {
    // The MYTHOS ruling, asserted directly: no slash-joined format. The version
    // string is exactly what it was before verticals existed.
    expect(PRODUCT_UTILITY_REGISTRY_VERSION).toBe("2026-08-product-utility-v3");
    expect(PRODUCT_UTILITY_REGISTRY_VERSION).not.toContain("/");
    expect(PRODUCT_UTILITY_REGISTRY_VERSION).not.toContain(DEFAULT_VERTICAL_ID);
    expect(ACCOUNTING_PRODUCT_UTILITY_REGISTRY.versionId).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
  });

  it("stores the pair on the bundle, so nothing has to parse it apart", () => {
    expect(ACCOUNTING_PRODUCT_UTILITY_REGISTRY.verticalId).toBe(DEFAULT_VERTICAL_ID);
    expect(ACCOUNTING_PRODUCT_UTILITY_REGISTRY.versionId).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
  });

  it("keeps the pack file free of a vertical-qualified version", () => {
    const raw = readFileSync(
      path.join(ROOT, "verticals/accounting/registry/product-utility-v3.json"),
      "utf8"
    );
    expect(raw).not.toContain(`${DEFAULT_VERTICAL_ID}/${PRODUCT_UTILITY_REGISTRY_VERSION}`);
    expect(raw).not.toContain(`${PRODUCT_UTILITY_REGISTRY_VERSION}/${DEFAULT_VERTICAL_ID}`);
  });

  it("rejects a payload whose versionId is vertical-qualified", () => {
    // A joined id is a second spelling of a fact the verticalId column already
    // holds. Rejecting it keeps one source of truth. Asserted against the
    // validator directly, so the branch is genuinely exercised rather than
    // shadowed by a missing-file error.
    expect(() =>
      validateProductUtilityRegistryPayload("legal", {
        ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
        verticalId: "legal",
        versionId: `legal/${PRODUCT_UTILITY_REGISTRY_VERSION}`,
      })
    ).toThrow(/unqualified/i);
  });

  it("rejects a payload whose halves disagree with the pack declaring it", () => {
    expect(() =>
      validateProductUtilityRegistryPayload("legal", ACCOUNTING_PRODUCT_UTILITY_REGISTRY)
    ).toThrow(/cannot disagree/i);
  });

  it("accepts an unqualified version id for a non-accounting vertical", () => {
    const bundle = validateProductUtilityRegistryPayload("legal", {
      ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
      verticalId: "legal",
    });
    expect(bundle.verticalId).toBe("legal");
    expect(bundle.versionId).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
  });

  it("looks up by both halves, and misses when either half is wrong", () => {
    registerProductUtilityRegistry(ACCOUNTING_PRODUCT_UTILITY_REGISTRY);

    expect(getProductUtilityRegistry(DEFAULT_VERTICAL_ID, PRODUCT_UTILITY_REGISTRY_VERSION)).toBe(
      ACCOUNTING_PRODUCT_UTILITY_REGISTRY
    );
    // Right version, wrong vertical — a miss. This is the whole point of the
    // pair: two verticals can hold the same version id without colliding.
    expect(getProductUtilityRegistry("legal", PRODUCT_UTILITY_REGISTRY_VERSION)).toBeNull();
    // Right vertical, wrong version — also a miss.
    expect(getProductUtilityRegistry(DEFAULT_VERTICAL_ID, "2026-01-product-utility-v1")).toBeNull();
  });

  it("lets two verticals register the same version id independently", () => {
    registerProductUtilityRegistry(ACCOUNTING_PRODUCT_UTILITY_REGISTRY);
    registerProductUtilityRegistry({
      ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
      verticalId: "legal",
      utilities: [],
    });

    // The audit's §5.5 problem, solved: same unqualified version string, two
    // verticals, no collision and no string to disambiguate.
    expect(
      getProductUtilityRegistry(DEFAULT_VERTICAL_ID, PRODUCT_UTILITY_REGISTRY_VERSION)?.utilities
    ).toHaveLength(18);
    expect(
      getProductUtilityRegistry("legal", PRODUCT_UTILITY_REGISTRY_VERSION)?.utilities
    ).toHaveLength(0);
  });
});

describe("the freeze rule covers BOTH halves of the pair", () => {
  it("freezes the accounting bank's (verticalId, versionId)", () => {
    expect(FROZEN_REGISTRY_KEYS).toHaveLength(1);
    expect(FROZEN_REGISTRY_KEYS[0]).toEqual({
      verticalId: DEFAULT_VERTICAL_ID,
      versionId: PRODUCT_UTILITY_REGISTRY_VERSION,
    });
    expect(Object.isFrozen(FROZEN_REGISTRY_KEYS)).toBe(true);
    expect(Object.isFrozen(FROZEN_REGISTRY_KEYS[0])).toBe(true);
  });

  it("holds the frozen version against the ids stored questions actually carry", () => {
    // The version half is embedded in every stored question id. Renaming it is
    // a data migration over those ids, exactly as renaming a pack id is a data
    // migration over verticalId columns — same rule, other half of the pair.
    const plan = buildProductAssessmentPlan({
      selectedUtilityKeys: [PRODUCT_UTILITY_REGISTRY[0].key],
      registry: ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
    });
    for (const frozen of FROZEN_REGISTRY_KEYS) {
      expect(plan.version).toBe(frozen.versionId);
      for (const planModule of plan.modules) {
        for (const question of planModule.questions) {
          expect(question.id.startsWith(`${frozen.versionId}__`)).toBe(true);
          expect(question.id).not.toContain(`${frozen.verticalId}__`);
        }
      }
    }
  });
});

describe("resolveProductUtilityRegistry — the flag-off short-circuit", () => {
  it("returns the in-code bundle with the flag off, without consulting the store", () => {
    // Even with another bank registered for accounting, flag off returns the
    // in-code object. The short-circuit sits in FRONT of resolution, so a
    // mis-registered bank cannot reach a default tenant.
    registerProductUtilityRegistry({
      ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
      utilities: [],
    });
    expect(resolveProductUtilityRegistry({ env: FLAG_OFF })).toBe(
      ACCOUNTING_PRODUCT_UTILITY_REGISTRY
    );
  });

  it("ignores an explicit vertical and the env override with the flag off", () => {
    expect(
      resolveProductUtilityRegistry({
        verticalId: "legal",
        env: { PAT_DEFAULT_VERTICAL: "legal" },
      })
    ).toBe(ACCOUNTING_PRODUCT_UTILITY_REGISTRY);
  });

  it("returns the in-code bundle for accounting flag-on too", () => {
    // Accounting's bank is in-code truth, so flag-on accounting with nothing
    // registered is still correct — the same reasoning as an unprimed
    // accounting lexicon.
    expect(resolveProductUtilityRegistry({ env: FLAG_ON })).toBe(
      ACCOUNTING_PRODUCT_UTILITY_REGISTRY
    );
  });

  it("throws loudly for an unregistered NON-accounting vertical", () => {
    // Falling back would render accounting's utilities inside another
    // vertical's assessment: copy that reads as correct and is not.
    expect(() => resolveProductUtilityRegistry({ verticalId: "legal", env: FLAG_ON })).toThrow(
      /no registered product-utility bank/i
    );
  });

  it("serves a registered non-accounting bank once it is primed", () => {
    registerProductUtilityRegistry({
      ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
      verticalId: "legal",
      utilities: [],
    });
    expect(resolveProductUtilityRegistry({ verticalId: "legal", env: FLAG_ON }).utilities).toEqual([]);
  });
});

describe("flag-off plans are byte-identical to the pre-seam bank", () => {
  it("builds identical question ids from the resolver and from the in-code registry", () => {
    const selected = PRODUCT_UTILITY_REGISTRY.map((utility) => utility.key);
    const viaResolver = buildProductAssessmentPlan({ selectedUtilityKeys: selected });
    const viaInCode = buildProductAssessmentPlan({
      selectedUtilityKeys: selected,
      registry: ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
    });
    expect(viaResolver).toEqual(viaInCode);
  });

  it("stamps the unqualified version on the plan and on every question", () => {
    const plan = buildProductAssessmentPlan({
      selectedUtilityKeys: [PRODUCT_UTILITY_REGISTRY[0].key],
    });
    expect(plan.version).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
    for (const planModule of plan.modules) {
      for (const question of planModule.questions) {
        expect(question.version).toBe(PRODUCT_UTILITY_REGISTRY_VERSION);
      }
    }
  });
});
