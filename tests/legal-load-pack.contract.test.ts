import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { LEGAL_PRODUCT_CATEGORIES, canonicalCategoryForProduct } from "@/lib/productCategoryTaxonomy";
import { FROZEN_VERTICAL_IDS, SYNTHETIC_VERTICAL_IDS, isSyntheticVerticalId } from "@/lib/verticals/context";
import { assertCompleteFirmModules, clearPrimedFirmModules, resolveFirmModules } from "@/lib/verticals/firmModules";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";
import { assertCompleteLexicon } from "@/lib/verticals/lexicon";
import { loadVerticalPack } from "@/lib/verticals/loader";
import { LEGAL_FIRM_MODULES } from "@/lib/verticals/packs/legalFirmModules";
import { loadPackProductUtilityRegistry } from "@/lib/verticals/questionBankPackLoader";
import {
  FROZEN_REGISTRY_KEYS,
  LEGAL_PRODUCT_UTILITY_REGISTRY_VERSION,
  clearProductUtilityRegistries,
  validateProductUtilityRegistryPayload,
} from "@/lib/verticals/questionBankRegistry";
import { listVerticalIds } from "@/lib/verticals/registry";

/**
 * legal-load (R64; audit section 12 items 5 to 9): the legal Vertical Pack and the
 * files the box creates. Everything here is read from the artifacts, never from
 * memory: the manifest, the bank, the taxonomy artifact, the signals scaffold, the
 * parked real-vendor catalog and the demo set.
 */

const ROOT = process.cwd();
const FLAG_ON = { [VERTICAL_PACKS_FLAG_ENV]: "1" } as Record<string, string | undefined>;
const readJson = (rel: string) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8")) as Record<string, unknown>;

afterEach(() => {
  clearPrimedFirmModules();
  clearProductUtilityRegistries();
});

describe("verticals/legal/pack.yaml", () => {
  it("loads, is frozen (stored rows reference it), is not synthetic, and is installed beside accounting", async () => {
    const pack = await loadVerticalPack("legal");
    expect(pack.id).toBe("legal");
    expect(pack.version).toBe(1);
    expect(FROZEN_VERTICAL_IDS).toEqual(["accounting", "legal"]);
    expect(isSyntheticVerticalId("legal")).toBe(false);
    expect(SYNTHETIC_VERTICAL_IDS).not.toContain("legal");
    expect(await listVerticalIds()).toEqual(expect.arrayContaining(["accounting", "legal", "test-fixture"]));
  });

  it("carries a complete lexicon in the pack's own words", async () => {
    const pack = await loadVerticalPack("legal");
    const lexicon = assertCompleteLexicon("legal", pack.lexicon);
    expect(lexicon).toEqual({
      ecosystem: "legal ecosystem",
      firm: "law firm",
      firmArticle: "a",
      firmPlural: "law firms",
      firmMarket: "law-firm market",
      vendorAudience: "software for law firms",
    });
  });

  it("declares the taxonomy filter, seventeen source authorities in order, and the bank path", async () => {
    const pack = await loadVerticalPack("legal");
    expect(pack.taxonomy).toEqual({ source: "db", filter: { verticalId: "legal" } });
    const orgs = pack.questionBank.sourceAuthorities.map((authority) => authority.org);
    expect(orgs).toHaveLength(17);
    expect(orgs.slice(0, 7)).toEqual(["Federal Rules (US Courts)", "NIST", "GAO", "FTC", "US Code (ESIGN)", "HHS (HIPAA)", "CISA"]);
    expect(pack.questionBank.sourceAuthorities.slice(0, 7).every((authority) => authority.license === "PUBLIC_DOMAIN")).toBe(true);
    expect(orgs).toContain("Altman Weil");
    // the audit's needle rule: no bare "FRE" (it sits inside "frequency")
    const needles = pack.questionBank.sourceAuthorities.flatMap((authority) => authority.match);
    expect(needles).not.toContain("FRE");
    expect(needles).toEqual(expect.arrayContaining(["FRE 502", "FRE 901", "FRE 902"]));
    expect(pack.questionBank.utilityRegistry).toBe("registry/product-utility-v1.json");
  });

  it("supplies firm module words for all five modules, and the in-code mirror equals the block field for field", async () => {
    const pack = await loadVerticalPack("legal");
    const block = assertCompleteFirmModules("legal", pack.firmModules);
    expect(JSON.parse(JSON.stringify(block))).toEqual(JSON.parse(JSON.stringify(LEGAL_FIRM_MODULES)));
    for (const definition of FIRM_MODULE_DEFINITIONS) {
      const content = block[definition.sectionKey];
      expect(content.openEnded).toHaveLength(5);
      for (const entry of content.openEnded) {
        expect(entry.prompt).not.toContain("—");
        expect(entry.placeholder).not.toContain("—");
        // the module title is prefixed by the code; the prompt must not repeat it (register row 29)
        expect(entry.prompt.startsWith(definition.title)).toBe(false);
      }
    }
    // the stems are the option-set file's stems (the box: the stems in the option-set file are the pack's stems)
    expect(block["operating-model"].openEnded[0].prompt).toBe(
      "Where does a matter most often stall between intake and closing, and which practice group feels it most?"
    );
    expect(block.governance.openEnded[2].prompt).toBe(
      "Which trust accounting, conflicts, or supervision control most often depends on one person remembering to do it, and what happens when that person is out?"
    );
  });

  it("flag on, a legal tenant resolves the pack's words with no priming (the mirror serves); accounting is unchanged", () => {
    const legal = resolveFirmModules({ env: FLAG_ON, verticalId: "legal" });
    expect(legal).toEqual(LEGAL_FIRM_MODULES);
    expect(legal.strategy.summary).toBe("Strategic direction and pricing model; change management, training and adoption; client and market alignment.");
    const accounting = resolveFirmModules({ env: FLAG_ON, verticalId: "accounting" });
    expect(accounting.strategy.summary).toBe("Strategy execution, change readiness, and external alignment.");
  });

  it("declares the five size bands in the pack's own size language (delta 4, schema only)", async () => {
    const pack = await loadVerticalPack("legal");
    expect(pack.sizeBands?.map((band) => [band.key, band.min, band.max])).toEqual([
      ["solo-small", 1, 5],
      ["small", 6, 20],
      ["midsize", 21, 100],
      ["large-regional", 101, 500],
      ["large", 501, null],
    ]);
    expect(pack.sizeBands?.map((band) => band.label)).toEqual([
      "solo and small (1 to 5 attorneys)",
      "small firm (6 to 20 attorneys)",
      "midsize (21 to 100 attorneys)",
      "large regional (101 to 500 attorneys)",
      "large (500+ attorneys)",
    ]);
    // accounting declares none; the schema stays optional
    expect((await loadVerticalPack("accounting")).sizeBands).toBeUndefined();
  });
});

describe("verticals/legal/registry/product-utility-v1.json", () => {
  it("validates through the TypeScript validator with the frozen pair, 20 utilities of 4 subcategories, 10 general and 17 open-ended questions", async () => {
    const payload = readJson("verticals/legal/registry/product-utility-v1.json");
    const bundle = validateProductUtilityRegistryPayload("legal", payload);
    expect(bundle.verticalId).toBe("legal");
    expect(bundle.versionId).toBe(LEGAL_PRODUCT_UTILITY_REGISTRY_VERSION);
    expect(FROZEN_REGISTRY_KEYS).toContainEqual({ verticalId: "legal", versionId: bundle.versionId });
    expect(bundle.utilities).toHaveLength(20);
    expect(bundle.utilities.every((utility) => utility.subcategories.length === 4)).toBe(true);
    expect(bundle.generalModule.questions).toHaveLength(10);
    expect(bundle.openEndedModule.questions).toHaveLength(17);
    // the four legal field keys moved to open-ended prompts (register row 5): the general module is the accounting ten
    expect(bundle.generalModule.questions.map((question) => question.fieldKey)).toEqual([
      "productName", "productDescription", "logoReference", "positioning", "targetCustomer",
      "targetUseContext", "implementationStyle", "operatingModelFit", "primaryBuyer", "integrationPosture",
    ]);
    expect(bundle.openEndedModule.questions.map((question) => question.key)).toEqual(
      expect.arrayContaining(["court_efiling_coverage", "trust_accounting_attestation", "privilege_data_handling", "bar_and_practice_coverage"])
    );
    const loaded = await loadPackProductUtilityRegistry("legal");
    expect(loaded).toEqual(bundle);
  });

  it("every legal utility's function bucket is a legal taxonomy bucket and maps into a legal canonical category", () => {
    const bundle = validateProductUtilityRegistryPayload("legal", readJson("verticals/legal/registry/product-utility-v1.json"));
    const taxonomy = readJson("data/research/legal-software-taxonomy-v1.json") as { taxonomyBuckets: Array<{ key: string; kind: string }> };
    const functionBuckets = new Set(taxonomy.taxonomyBuckets.filter((bucket) => bucket.kind === "FUNCTION").map((bucket) => bucket.key));
    const vertical = { verticalId: "legal", utilities: bundle.utilities };
    for (const utility of bundle.utilities) {
      const functionBucket = utility.taxonomyBucketKeys.find((key) => key.startsWith("function-"));
      expect(functionBucket, utility.key).toBeDefined();
      expect(functionBuckets.has(functionBucket!), utility.key).toBe(true);
      expect(LEGAL_PRODUCT_CATEGORIES as readonly string[]).toContain(canonicalCategoryForProduct([utility.key], vertical));
    }
    // no vendor names in stems or options (DOORS). sourceNotes are research citations and
    // never render; they are excluded from this scan on purpose.
    const rendered = JSON.stringify({
      utilities: bundle.utilities.map((utility) => ({ ...utility, sourceNotes: undefined })),
      generalModule: bundle.generalModule,
      openEndedModule: bundle.openEndedModule,
    });
    for (const banned of ["Clio", "Thomson", "LexisNexis", "Westlaw", "Relativity", "NetDocuments", "iManage", "Smokeball", "MyCase", "PracticePanther", "CosmoLex", "Litera", "Harvey", "CoCounsel"]) {
      expect(rendered, banned).not.toContain(banned);
    }
  });
});

describe("data files", () => {
  it("the legal taxonomy artifact is stamped legal and carries 40 buckets (24 FUNCTION, 8 WORKFLOW_STAGE, 4 COMPLIANCE_DOMAIN, 4 DELIVERY_MODEL), vendors and products empty on purpose", () => {
    const taxonomy = readJson("data/research/legal-software-taxonomy-v1.json") as {
      verticalId: string;
      source: { key: string };
      taxonomyBuckets: Array<{ key: string; kind: string }>;
      bucketCapabilityMappings: unknown[];
      vendors: unknown[];
      products: unknown[];
    };
    expect(taxonomy.verticalId).toBe("legal");
    expect(taxonomy.source.key).toBe("legal-software-taxonomy-v1");
    expect(taxonomy.taxonomyBuckets).toHaveLength(40);
    const kinds = taxonomy.taxonomyBuckets.reduce<Record<string, number>>((acc, bucket) => ({ ...acc, [bucket.kind]: (acc[bucket.kind] ?? 0) + 1 }), {});
    expect(kinds).toEqual({ FUNCTION: 24, WORKFLOW_STAGE: 8, COMPLIANCE_DOMAIN: 4, DELIVERY_MODEL: 4 });
    expect(taxonomy.bucketCapabilityMappings).toHaveLength(24);
    expect(taxonomy.vendors).toEqual([]);
    expect(taxonomy.products).toEqual([]);
    // no key collides with an accounting bucket: the upsert key is the bare bucket key and
    // TaxonomyBucket.key is unique across verticals, so a shared key would restamp accounting's
    // row. The audit addendum said the sets were disjoint; seven keys were not, and carry -legal.
    const accounting = readJson("data/research/accounting-software-taxonomy-v1.json") as { taxonomyBuckets: Array<{ key: string }> };
    const accountingKeys = new Set(accounting.taxonomyBuckets.map((bucket) => bucket.key));
    for (const bucket of taxonomy.taxonomyBuckets) expect(accountingKeys.has(bucket.key), bucket.key).toBe(false);
    expect(taxonomy.taxonomyBuckets.filter((bucket) => bucket.key.endsWith("-legal")).map((bucket) => bucket.key).sort()).toEqual([
      "delivery-cloud-legal", "delivery-hybrid-legal", "delivery-managed-legal", "function-document-management-legal",
      "function-payments-legal", "workflow-deliver-legal", "workflow-review-legal",
    ]);
    // every parentKey and mapping still resolves to a bucket in the artifact
    const keys = new Set(taxonomy.taxonomyBuckets.map((bucket) => bucket.key));
    for (const bucket of taxonomy.taxonomyBuckets as Array<{ key: string; parentKey?: string | null }>) {
      if (bucket.parentKey) expect(keys.has(bucket.parentKey), bucket.key).toBe(true);
    }
    for (const mapping of taxonomy.bucketCapabilityMappings as Array<{ bucketKey: string }>) expect(keys.has(mapping.bucketKey), mapping.bucketKey).toBe(true);
  });

  it("the signals scaffold and the real-vendor catalog are parked: committed, read by no code", () => {
    const signals = readJson("verticals/legal/signals/legal-baselines.json") as { verticalId: string; baselines: unknown[] };
    expect(signals.verticalId).toBe("legal");
    expect(signals.baselines.length).toBeGreaterThan(0);
    const real = readJson("data/research/legal-vendor-catalog-real.json") as Record<string, unknown>;
    expect(Object.keys(real).length).toBeGreaterThan(0);
    const importers = ["lib/research/accountingTaxonomy.ts", "scripts/import-accounting-taxonomy.ts", "lib/verticals/loader.ts", "lib/demo-seed/combinator.ts"];
    for (const rel of importers) {
      expect(readFileSync(path.join(ROOT, rel), "utf8"), rel).not.toContain("legal-vendor-catalog-real");
    }
  });

  it("the legal demo set: six archetypes on the closed union, five fictional vendors with 18 products on legal utility keys, a roster on the six keys and the pack's band keys", async () => {
    const archetypes = readJson("data/demo-seed/legal/firm-archetypes.json") as { archetypes: Array<{ archetype: string; completionRate: number; productReviewCoverage: number; moduleScoreRanges: Record<string, [number, number]> }> };
    expect(archetypes.archetypes.map((entry) => entry.archetype).sort()).toEqual(
      ["compliance-heavy", "high-performing", "mid-tier", "sample-thin", "struggling", "tech-forward"]
    );
    for (const entry of archetypes.archetypes) {
      expect(Object.keys(entry.moduleScoreRanges).sort()).toEqual(["automation-ai", "data-flow", "governance", "operating-model", "strategy"]);
    }
    const vendors = readJson("data/demo-seed/legal/vendor-catalog.json") as { vendors: Array<{ id: string; archetype: string; products: Array<{ id: string; utilityKeys: string[] }> }> };
    expect(vendors.vendors).toHaveLength(5);
    expect(vendors.vendors.flatMap((vendor) => vendor.products)).toHaveLength(18);
    const union = new Set(["large-incumbent", "mid-market-specialist", "modern-fast-mover", "niche-depth"]);
    const legalKeys = new Set(
      validateProductUtilityRegistryPayload("legal", readJson("verticals/legal/registry/product-utility-v1.json")).utilities.map((utility) => utility.key)
    );
    for (const vendor of vendors.vendors) {
      expect(vendor.id.startsWith("demo-legal-vendor-")).toBe(true);
      expect(union.has(vendor.archetype), vendor.id).toBe(true);
      for (const product of vendor.products) {
        expect(product.id.startsWith("demo-legal-product-")).toBe(true);
        for (const key of product.utilityKeys) expect(legalKeys.has(key), `${product.id} ${key}`).toBe(true);
      }
    }
    const roster = readJson("data/demo-seed/legal/firm-roster.json") as { firms: Array<{ name: string; size: string; archetype: string }> };
    const bandKeys = new Set((await loadVerticalPack("legal")).sizeBands!.map((band) => band.key));
    expect(roster.firms.length).toBeGreaterThanOrEqual(36);
    expect(new Set(roster.firms.map((firm) => firm.name)).size).toBe(roster.firms.length);
    for (const firm of roster.firms) {
      expect(bandKeys.has(firm.size), firm.name).toBe(true);
      expect(archetypes.archetypes.some((entry) => entry.archetype === firm.archetype), firm.name).toBe(true);
    }
    const flavor = readJson("data/demo-seed/legal/flavor.json") as { verticalId: string; industry: string; phraseBanks: Record<string, string[]> };
    expect(flavor.verticalId).toBe("legal");
    expect(flavor.industry).toBe("Law practice");
    const accountingFlavor = readJson("data/demo-seed/flavor.json") as { verticalId: string; industry: string };
    expect(accountingFlavor.verticalId).toBe("accounting");
    expect(accountingFlavor.industry).toBe("Public accounting");
    // the legal words carry no accounting noun and no vendor name
    const legalText = JSON.stringify(flavor);
    for (const banned of ["QuickBooks", "tax season", "CPA", "audit prep", "CAS", "Public accounting", "NetSuite", "Xero", "DocuSign", "Bill.com"]) {
      expect(legalText, banned).not.toContain(banned);
    }
  });
});
