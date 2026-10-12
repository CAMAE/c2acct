import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionInputType } from "@prisma/client";
import { decorateFollowUpMcQuestions } from "@/lib/assessment/followUpMcRuntime";
import {
  FIRM_FOLLOWUP_MC_QUESTIONS,
  getFirmFollowUpQuestion,
  getFirmFollowUpQuestions,
} from "@/lib/assessment/firmFollowUpOptions";
import { firmCohortKeyForBoundary, vendorCohortKeyForBoundary } from "@/lib/benchmarks";
import {
  ACCOUNTING_FUNCTION_BUCKET_VOCABULARY,
  FUNCTION_BUCKET_LABELS,
  functionBucketVocabularyFromPack,
  shortFunctionBucketLabel,
  vendorCoverageMapForVendor,
} from "@/lib/ecosystem";
import { FIRM_MODULE_DEFINITIONS, FIRM_MODULE_OPEN_ENDED_PROMPTS, buildFirmProductQuestions } from "@/lib/firmPat";
import {
  CANONICAL_PRODUCT_CATEGORIES,
  LEGAL_PRODUCT_CATEGORIES,
  canonicalCategoriesForVertical,
  canonicalCategoryForProduct,
  canonicalCategoryForUtility,
} from "@/lib/productCategoryTaxonomy";
import { PRODUCT_UTILITY_REGISTRY } from "@/lib/productUtilityRegistry";
import { getSelfSignupOrganizationQuestion } from "@/lib/selfSignupWizard";
import { buildVendorProductQuestions, getVendorUtilityLabels, normalizeSubmittedUtilityKeys } from "@/lib/vendorPat";
import { buildVendorProductAssessmentPlan, serializeVendorProductAssessmentPlan } from "@/lib/vendorProductAssessmentPlan";
import { accountingCompanyContext, requireRegistry, resolveVerticalContext, resolveVerticalContextForCompany } from "@/lib/verticals/companyBoundary";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import {
  accountingFirmModules,
  applyVerticalFirmModulePrompts,
  assertCompleteFirmModules,
  clearPrimedFirmModules,
  primeVerticalFirmModules,
  resolveFirmModuleContent,
  resolveFirmModules,
} from "@/lib/verticals/firmModules";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";
import { ACCOUNTING_LEXICON, clearPrimedLexicons, primeVerticalLexicon } from "@/lib/verticals/lexicon";
import { loadVerticalPack } from "@/lib/verticals/loader";
import {
  ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
  FROZEN_REGISTRY_KEYS,
  LEGAL_PRODUCT_UTILITY_REGISTRY_VERSION,
} from "@/lib/verticals/questionBankRegistry";
import { verticalFilter, verticalStamp } from "@/lib/verticals/scope";

/**
 * legal-load (R64; audit section 12 WORK 1a to 1i): the seams that let a tenant's
 * vertical flow through module words, option sets, benchmark cohorts, write stamps,
 * ecosystem labels, the product-utility bank, taxonomy and canonical categories.
 *
 * Two obligations, both counted: flag off, every seam returns the accounting object
 * that shipped before the seam (the same instance, or byte-identical values); flag
 * on, the synthetic fixture vertical reaches its own values and never accounting's.
 */

const ROOT = process.cwd();
const FLAG_OFF = { [VERTICAL_PACKS_FLAG_ENV]: undefined } as Record<string, string | undefined>;
const FLAG_ON = { [VERTICAL_PACKS_FLAG_ENV]: "1" } as Record<string, string | undefined>;
const FIXTURE = "test-fixture";

const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

afterEach(() => {
  clearPrimedFirmModules();
  clearPrimedLexicons();
});

describe("1a — firm module words resolve per vertical; accounting is the in-code truth", () => {
  it("flag off returns the SAME accounting object, assembled from firmPat's own constants", () => {
    const resolved = resolveFirmModules({ env: FLAG_OFF, verticalId: "anything" });
    expect(resolved).toBe(accountingFirmModules());
    for (const definition of FIRM_MODULE_DEFINITIONS) {
      const content = resolved[definition.sectionKey];
      expect(content.description).toBe(definition.description);
      expect(content.summary).toBe(definition.summary);
      expect(content.openEnded.map((entry) => entry.prompt)).toEqual(
        FIRM_MODULE_OPEN_ENDED_PROMPTS[definition.sectionKey].map((entry) => entry.prompt)
      );
      expect(content.openEnded.map((entry) => entry.placeholder)).toEqual(
        FIRM_MODULE_OPEN_ENDED_PROMPTS[definition.sectionKey].map((entry) => entry.placeholder)
      );
    }
  });

  it("flag on, an accounting tenant still reads the in-code truth; a foreign vertical without words fails loudly", () => {
    expect(resolveFirmModules({ env: FLAG_ON, verticalId: DEFAULT_VERTICAL_ID })).toBe(accountingFirmModules());
    expect(() => resolveFirmModules({ env: FLAG_ON, verticalId: FIXTURE })).toThrow(/no firm module words/);
  });

  it("a primed block serves the foreign vertical, and a partial block is rejected", () => {
    const words = Object.fromEntries(
      FIRM_MODULE_DEFINITIONS.map((definition) => [
        definition.sectionKey,
        {
          description: `sprocket ${definition.sectionKey} description`,
          summary: `sprocket ${definition.sectionKey} summary`,
          openEnded: [1, 2, 3, 4, 5].map((n) => ({ prompt: `sprocket ${definition.sectionKey} prompt ${n}`, placeholder: `placeholder ${n}` })),
        },
      ])
    );
    primeVerticalFirmModules(FIXTURE, words);
    expect(resolveFirmModuleContent("governance", { env: FLAG_ON, verticalId: FIXTURE }).description).toBe("sprocket governance description");
    expect(() => assertCompleteFirmModules(FIXTURE, { governance: words.governance })).toThrow(/missing or incomplete/);
    expect(() => assertCompleteFirmModules(FIXTURE, { ...words, strategy: { ...words.strategy, openEnded: words.strategy.openEnded.slice(0, 4) } })).toThrow(/strategy/);
  });

  it("applyVerticalFirmModulePrompts returns the same array for accounting and rewrites only the five TEXT follow-ups otherwise", () => {
    const questions = [
      { id: "q1", key: "governance_1", prompt: "scored", inputType: QuestionInputType.SLIDER, weight: 1, order: 1, required: true, meta: {} },
      { id: "q2", key: "governance_open_1", prompt: "Governance, Controls, and Vendor Risk: old prompt", inputType: QuestionInputType.TEXT, weight: 0, order: 21, required: true, meta: { placeholder: "old" } },
      { id: "q3", key: "strategy_open_1", prompt: "other module", inputType: QuestionInputType.TEXT, weight: 0, order: 22, required: true, meta: {} },
    ] as never[];
    expect(applyVerticalFirmModulePrompts(questions, "firm_alignment_governance_v1", accountingFirmModules())).toBe(questions);
    const words = Object.fromEntries(
      FIRM_MODULE_DEFINITIONS.map((definition) => [
        definition.sectionKey,
        {
          description: "d",
          summary: "s",
          openEnded: [1, 2, 3, 4, 5].map((n) => ({ prompt: `${definition.sectionKey} prompt ${n}`, placeholder: `${definition.sectionKey} placeholder ${n}` })),
        },
      ])
    );
    const content = primeVerticalFirmModules(FIXTURE, words);
    const rewritten = applyVerticalFirmModulePrompts(questions, "firm_alignment_governance_v1", content) as Array<{ key: string; prompt: string; meta: { placeholder?: string } }>;
    expect(rewritten).not.toBe(questions);
    expect(rewritten[0].prompt).toBe("scored");
    expect(rewritten[1].prompt).toBe("Governance, Controls, and Vendor Risk: governance prompt 1");
    expect(rewritten[1].meta.placeholder).toBe("governance placeholder 1");
    expect(rewritten[2].prompt).toBe("other module");
  });
});

describe("delta 2 seam — option sets resolve per vertical; accounting's registry is untouched", () => {
  it("no vertical, or accounting, reads the accounting registry (same instances)", () => {
    expect(getFirmFollowUpQuestions()).toBe(FIRM_FOLLOWUP_MC_QUESTIONS);
    expect(getFirmFollowUpQuestions(DEFAULT_VERTICAL_ID)).toBe(FIRM_FOLLOWUP_MC_QUESTIONS);
    expect(getFirmFollowUpQuestion("governance_open_1")).toBe(getFirmFollowUpQuestion("governance_open_1", DEFAULT_VERTICAL_ID));
    expect(getFirmFollowUpQuestions("no-such-vertical")).toBe(FIRM_FOLLOWUP_MC_QUESTIONS);
  });

  it("decorateFollowUpMcQuestions keeps its flag-off identity under the options form", () => {
    const questions = [{ id: "a", key: "governance_open_1", inputType: QuestionInputType.TEXT }] as never[];
    const mcOff = { PAT_ENABLE_FOLLOWUP_MC: undefined } as unknown as NodeJS.ProcessEnv;
    expect(decorateFollowUpMcQuestions(questions, "firm_alignment_governance_v1", { env: mcOff, verticalId: FIXTURE })).toBe(questions);
    expect(decorateFollowUpMcQuestions(questions, "firm_alignment_governance_v1", mcOff)).toBe(questions);
  });
});

describe("1c — benchmark readers and pools take the viewing company's vertical", () => {
  it("accounting keeps the literal cohort keys; another vertical gets its own row", () => {
    expect(firmCohortKeyForBoundary("DEMO" as never)).toBe("firm:demo");
    expect(firmCohortKeyForBoundary("DEMO" as never, DEFAULT_VERTICAL_ID)).toBe("firm:demo");
    expect(firmCohortKeyForBoundary("PRODUCTION" as never, FIXTURE)).toBe(`firm:real:${FIXTURE}`);
    expect(vendorCohortKeyForBoundary("PRODUCTION" as never, FIXTURE)).toBe(`vendor:real:${FIXTURE}`);
  });

  it("the readers and the Elite builders accept the vertical and pass it to the key builder (source pin)", () => {
    const benchmarks = read("lib/benchmarks.ts");
    expect(benchmarks).toMatch(/getFirmPeerReadings\([\s\S]*verticalId: string = DEFAULT_VERTICAL_ID[\s\S]*firmCohortKeyForBoundary\(boundary, verticalId\)/);
    expect(benchmarks).toMatch(/getFirmCohortFirmCount\([\s\S]*firmCohortKeyForBoundary\(boundary, verticalId\)/);
    expect(benchmarks).toMatch(/getVendorCategoryReadings\([\s\S]*vendorCohortKeyForBoundary\(boundary, verticalId\)/);
    const elite = read("lib/eliteInsightsV2.ts");
    expect(elite).toContain("getFirmPeerReadings(client, companyId, boundary, vertical)");
    expect(elite).toContain("getFirmCohortFirmCount(client, boundary, vertical)");
    expect(elite).toContain("getVendorCategoryReadings(client, companyId, boundary, vertical)");
    expect(elite).toMatch(/const vertical = verticalId \?\? \(await resolveVerticalForCompany\(companyId\)\);/);
  });

  it("the three pools filter by vertical through verticalFilter, which is {} flag off (source pin)", () => {
    expect(read("lib/alignmentBoard.ts")).toContain("...verticalFilter({ verticalId: await resolveVerticalForCompany(firmCompanyId) })");
    expect(read("lib/vendorAlignmentInsightEngine.ts")).toContain("...verticalFilter({ verticalId: vendorVertical })");
    expect(read("lib/adminBriefingEngine.ts")).toContain("verticalFilter({ verticalId: input?.verticalId ?? null })");
    expect(verticalFilter({ env: FLAG_OFF, verticalId: FIXTURE })).toEqual({});
    expect(verticalFilter({ env: FLAG_ON, verticalId: FIXTURE })).toEqual({ verticalId: FIXTURE });
  });
});

describe("1d — the write paths stamp the tenant's vertical; flag off they name no column", () => {
  it("every named write site spreads verticalStamp (source pin)", () => {
    const submit = read("app/api/survey/submit/route.ts");
    expect(submit.match(/\.\.\.verticalStamp\(\{ verticalId: vertical\.verticalId \}\)/g)?.length).toBe(2);
    expect(read("app/api/survey/draft/route.ts")).toContain("...verticalStamp({ verticalId: vertical.verticalId })");
    expect(read("lib/firmPat.ts")).toContain("...verticalStamp({ verticalId: reviewVertical })");
    const vendorPat = read("lib/vendorPat.ts");
    expect(vendorPat).toContain("const stamp = verticalStamp({ verticalId: await resolveVerticalForCompany(company.id) });");
    expect(vendorPat.match(/\.\.\.stamp,/g)?.length).toBeGreaterThanOrEqual(2);
    expect(verticalStamp({ env: FLAG_OFF, verticalId: FIXTURE })).toEqual({});
  });
});

describe("1e — ecosystem bucket labels and bridge resolve per vertical", () => {
  it("the default vocabulary IS the accounting constants, and the coverage map is unchanged under it", () => {
    expect(ACCOUNTING_FUNCTION_BUCKET_VOCABULARY.labels).toBe(FUNCTION_BUCKET_LABELS);
    expect(Object.keys(ACCOUNTING_FUNCTION_BUCKET_VOCABULARY.labels)).toHaveLength(14);
    const snapshot = [{ product: { utilityKeys: [PRODUCT_UTILITY_REGISTRY[0].key] } }] as never[];
    expect(vendorCoverageMapForVendor(snapshot)).toEqual(vendorCoverageMapForVendor(snapshot, ACCOUNTING_FUNCTION_BUCKET_VOCABULARY));
    expect(vendorCoverageMapForVendor(snapshot)).toHaveLength(14);
  });

  it("a pack vocabulary draws its own cells from its FUNCTION buckets and its registry's bridge", () => {
    const vocabulary = functionBucketVocabularyFromPack({
      buckets: [
        { key: "function-sprocket-forging", title: "Sprocket forging (metal)", kind: "FUNCTION" },
        { key: "workflow-intake", title: "Intake", kind: "WORKFLOW_STAGE" },
      ],
      utilities: [{ key: "forge", taxonomyBucketKeys: ["function-sprocket-forging", "workflow-intake"] }],
    });
    expect(Object.keys(vocabulary.labels)).toEqual(["function-sprocket-forging"]);
    expect(shortFunctionBucketLabel("Sprocket forging (metal)")).toBe("Sprocket forg…");
    const cells = vendorCoverageMapForVendor([{ product: { utilityKeys: ["forge"] } }] as never[], vocabulary);
    expect(cells).toEqual([{ bucketKey: "function-sprocket-forging", bucketLabel: "Sprocket forg…", covered: true, productCount: 1 }]);
  });
});

describe("1f — the product-utility bank travels from the request boundary", () => {
  it("flag off the company boundary is the accounting context with no read, and the builders default to the in-code bundle", async () => {
    let reads = 0;
    const context = await resolveVerticalContextForCompany("co", {
      env: FLAG_OFF,
      readSessionCompanyId: async () => {
        reads += 1;
        return "co";
      },
      readCompanyVerticalId: async () => {
        reads += 1;
        return FIXTURE;
      },
    });
    expect(context).toBe(accountingCompanyContext());
    expect(reads).toBe(0);
    expect(requireRegistry(context)).toBe(ACCOUNTING_PRODUCT_UTILITY_REGISTRY);
    const keys = [PRODUCT_UTILITY_REGISTRY[0].key];
    expect(buildVendorProductQuestions(keys)).toEqual(buildVendorProductQuestions(keys, ACCOUNTING_PRODUCT_UTILITY_REGISTRY));
    expect(buildFirmProductQuestions(keys)).toEqual(buildFirmProductQuestions(keys, ACCOUNTING_PRODUCT_UTILITY_REGISTRY));
    expect(serializeVendorProductAssessmentPlan(keys)).toEqual(serializeVendorProductAssessmentPlan(keys, ACCOUNTING_PRODUCT_UTILITY_REGISTRY));
    expect(buildVendorProductAssessmentPlan(keys)).toEqual(buildVendorProductAssessmentPlan(keys, undefined, ACCOUNTING_PRODUCT_UTILITY_REGISTRY));
    expect(normalizeSubmittedUtilityKeys([keys[0], "not-a-key"])).toEqual(keys);
    expect(getVendorUtilityLabels(keys)).toEqual(getVendorUtilityLabels(keys, ACCOUNTING_PRODUCT_UTILITY_REGISTRY));
  });

  it("a passed bank decides which keys are valid and which question ids are built", () => {
    const sprocketRegistry = {
      ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY,
      verticalId: FIXTURE,
      versionId: "2026-10-sprocket-v1",
      utilities: [{ ...ACCOUNTING_PRODUCT_UTILITY_REGISTRY.utilities[0], key: "sprocket_forging", label: "Sprocket forging" }],
    };
    expect(normalizeSubmittedUtilityKeys(["sprocket_forging", PRODUCT_UTILITY_REGISTRY[0].key], sprocketRegistry)).toEqual(["sprocket_forging"]);
    const questions = buildVendorProductQuestions(["sprocket_forging"], sprocketRegistry);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((question) => question.id.startsWith("2026-10-sprocket-v1__"))).toBe(true);
    expect(getVendorUtilityLabels(["sprocket_forging"], sprocketRegistry)).toEqual(["Sprocket forging"]);
  });

  it("a tenant column pointing at the synthetic fixture fails at the guard, never at a surface", async () => {
    await expect(
      resolveVerticalContextForCompany("co", {
        env: FLAG_ON,
        readCompanyVerticalId: async () => FIXTURE,
        readSessionCompanyId: async () => "co",
      })
    ).rejects.toThrow(/synthetic test fixture/);
  });

  it("the fixture pack declares no bank and no firm module words: the operator form refuses each loudly", async () => {
    await expect(resolveVerticalContext(FIXTURE, FLAG_ON)).rejects.toThrow(/no firm module words/);
    primeVerticalFirmModules(
      FIXTURE,
      Object.fromEntries(
        FIRM_MODULE_DEFINITIONS.map((definition) => [
          definition.sectionKey,
          { description: "d", summary: "s", openEnded: [1, 2, 3, 4, 5].map((n) => ({ prompt: `p${n}`, placeholder: `h${n}` })) },
        ])
      )
    );
    const context = await resolveVerticalContext(FIXTURE, FLAG_ON);
    expect(context.verticalId).toBe(FIXTURE);
    expect(context.lexicon).not.toBe(ACCOUNTING_LEXICON);
    expect(context.lexicon.firm).toBe((await loadVerticalPack(FIXTURE)).lexicon.firm);
    expect(context.registry).toBeNull();
    expect(() => requireRegistry(context)).toThrow(/declares no product-utility bank/);
  });

  it("the server pages and routes resolve the bank once and hand it down; the client components resolve nothing (source pins)", () => {
    expect(read("app/(app)/vendor/product-assessment/[productId]/page.tsx")).toContain("registry={registry}");
    expect(read("app/components/vendor/VendorProductAssessmentClient.tsx")).not.toMatch(/resolveVerticalContextForCompany|resolveProductUtilityRegistry\(|PAT_ENABLE_VERTICAL_PACKS/);
    expect(read("app/components/firm/FirmProductAssessmentClient.tsx")).toContain("buildFirmProductQuestions(product.utilityKeys, registry)");
    expect(read("app/api/vendor/product-assessment/submit/route.ts")).toContain("buildVendorProductQuestions(utilityKeys, registry)");
    expect(read("app/api/firm/product-assessment/submit/route.ts")).toContain("requireRegistry(await resolveVerticalContextForCompany(context.company.id))");
    expect(read("lib/vendorProductInsightEngine.ts")).toContain("registry: requireRegistry(vertical)");
  });
});

describe("1g, 1h, 1i — taxonomy importer by vertical, frozen pair, registry prompt, neutral placeholder", () => {
  it("the taxonomy importer stamps a named vertical and otherwise names no column (source pin)", () => {
    const importer = read("lib/research/accountingTaxonomy.ts");
    expect(importer).toContain('const verticalId = options.verticalId?.trim() || artifact.verticalId?.trim() || null;');
    expect(importer).toContain("const stamp = verticalId ? { verticalId } : {};");
    expect(importer.match(/\.\.\.stamp,/g)?.length).toBe(2);
    expect(read("scripts/import-accounting-taxonomy.ts")).toContain('arg.startsWith("--vertical=")');
  });

  it("the legal (vertical, version) pair is frozen with the version half unqualified", () => {
    expect(FROZEN_REGISTRY_KEYS.map((entry) => entry.verticalId)).toEqual([DEFAULT_VERTICAL_ID, "legal"]);
    expect(LEGAL_PRODUCT_UTILITY_REGISTRY_VERSION).toBe("2026-10-product-utility-v1");
  });

  it("a follow-up outside the ten accounting keys reads its own registry prompt when evidence is thin (source pin)", () => {
    const plan = read("lib/vendorProductAssessmentPlan.ts");
    expect(plan).toMatch(/default:[\s\S]*return question\.prompt;/);
    expect(plan).not.toContain("PAT has insufficient scored evidence for this follow-up. What evidence should PAT collect next");
  });

  it("the signup example name is the accounting literal flag off and neutral for another vertical", () => {
    const original = process.env[VERTICAL_PACKS_FLAG_ENV];
    try {
      delete process.env[VERTICAL_PACKS_FLAG_ENV];
      expect(getSelfSignupOrganizationQuestion("vendor").namePlaceholder).toBe("e.g. LedgerWorks Software");
      expect(getSelfSignupOrganizationQuestion("firm").namePlaceholder).toBe("e.g. Garrett & Garrett CPAs");
      process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
      process.env.PAT_DEFAULT_VERTICAL = FIXTURE;
      primeVerticalLexicon(FIXTURE, {
        ecosystem: "sprocket ecosystem",
        firm: "sprocket works",
        firmArticle: "a",
        firmPlural: "sprocket works",
        firmMarket: "sprocket-works market",
        vendorAudience: "software for sprocket works",
      });
      expect(getSelfSignupOrganizationQuestion("vendor").namePlaceholder).toBe("e.g. your company name");
      expect(getSelfSignupOrganizationQuestion("firm").namePlaceholder).toBe("e.g. your firm name");
    } finally {
      if (original === undefined) delete process.env[VERTICAL_PACKS_FLAG_ENV];
      else process.env[VERTICAL_PACKS_FLAG_ENV] = original;
      delete process.env.PAT_DEFAULT_VERTICAL;
    }
  });
});

describe("addendum 1i — canonical categories per vertical", () => {
  it("accounting's seven and its map are unchanged without a vertical", () => {
    expect(canonicalCategoriesForVertical(DEFAULT_VERTICAL_ID)).toBe(CANONICAL_PRODUCT_CATEGORIES);
    for (const utility of PRODUCT_UTILITY_REGISTRY) {
      expect(CANONICAL_PRODUCT_CATEGORIES).toContain(canonicalCategoryForUtility(utility.key));
      expect(canonicalCategoryForProduct([utility.key])).toBe(canonicalCategoryForUtility(utility.key));
    }
    expect(canonicalCategoryForUtility(undefined)).toBe("Workflow & Practice Ops");
    expect(canonicalCategoryForUtility("not-a-key")).toBe("Workflow & Practice Ops");
  });

  it("a legal utility resolves through the legal map, never into an accounting category", () => {
    const vertical = {
      verticalId: "legal",
      utilities: [
        { key: "trust_accounting_iolta", taxonomyBucketKeys: ["function-trust-accounting", "workflow-close"] },
        { key: "generative_ai_legal_assistance", taxonomyBucketKeys: ["function-generative-ai"] },
        { key: "mystery", taxonomyBucketKeys: ["function-unmapped"] },
      ],
    };
    expect(canonicalCategoriesForVertical("legal")).toBe(LEGAL_PRODUCT_CATEGORIES);
    expect(canonicalCategoryForProduct(["trust_accounting_iolta"], vertical)).toBe("Billing, Payments & Trust");
    expect(canonicalCategoryForProduct(["generative_ai_legal_assistance"], vertical)).toBe("Research, Analytics & AI");
    expect(canonicalCategoryForProduct(["mystery"], vertical)).toBe("Matters & Practice Management");
    for (const key of ["trust_accounting_iolta", "generative_ai_legal_assistance", "mystery"]) {
      expect(CANONICAL_PRODUCT_CATEGORIES as readonly string[]).not.toContain(canonicalCategoryForProduct([key], vertical));
    }
  });
});
