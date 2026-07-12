import {
  CompanyType,
  MembershipPlan,
  MembershipStatus,
  ProductAssessmentPerspective,
  QuestionInputType,
  ResearchConfidence,
  ResearchSourceStatus,
  ResearchSourceType,
  SubjectKind,
  type PrismaClient,
} from "@prisma/client";
import {
  DEMO_PAT_ECOSYSTEM_VERSION,
  DEMO_PAT_FIRMS,
  DEMO_PAT_VENDORS,
  DEMO_SEED_BASE_DATE,
  getDemoFirmVendorRelationships,
  getDemoProducts,
  getDemoVendorStatus,
  type DemoFirmInput,
  type DemoProductInput,
  type DemoVendorInput,
} from "@/data/demoPatEcosystem";
import {
  COMPANY_CAPABILITY_SCORE_VERSION,
  computeCapabilityScores,
  getAssessmentScoreScale,
} from "@/lib/capabilityScoring";

/**
 * B8-7 de-clump: pick an open-ended template index as a FULL-CYCLE PERMUTATION.
 * With a step coprime to the template count, `base + index*step (mod count)`
 * visits every template before repeating, so consecutive demo responses for a
 * product never reuse a template within its latest `count` responses (kills the
 * back-to-back near-duplicate quotes). The per-key base varies the opening
 * phrase across products. Exported pure for the contract test.
 */
export function openEndedTemplateIndex(productKey: string, index: number, count: number): number {
  const step = 7; // coprime with the 25-template pool (and any count not divisible by 7)
  const base = productKey.split("").reduce((acc, ch) => (acc + ch.charCodeAt(0)) % count, 0);
  return (base + index * step) % count;
}
import { writeCompanyCapabilityScores } from "@/lib/companyCapabilityScoreWrites";
import { maturityTier } from "@/lib/firmMaturity";
import { canonicalCategoryForProduct } from "@/lib/productCategoryTaxonomy";
import {
  FIRM_MODULE_DEFINITIONS,
  ensureFirmAlignmentSystem,
  ensureFirmProductModule,
  buildFirmProductQuestions,
} from "@/lib/firmPat";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { computeScore } from "@/lib/scoring";
import { evaluateSignalIntegrity } from "@/lib/signalIntegrity";
import {
  SURVEY_DRAFT_SCORE_VERSION,
  SURVEY_FINAL_SCORE_VERSION,
  buildSurveyDraftIntegrityFlags,
} from "@/lib/surveyDrafts";
import {
  buildVendorProductQuestions,
  computeVendorAssessmentMetrics,
  ensureProductSubject,
  ensureVendorProductModule,
  upsertVendorProductSignals,
} from "@/lib/vendorPat";
import {
  normalizeVendorProductProfileInput,
  serializeProductAssessmentPlan,
  serializeVendorAdaptiveOpenEndedQuestionSnapshot,
  serializeVendorProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";
import {
  extractNumericAnswers,
  normalizeQuestionRuntime,
  type NormalizedAnswer,
} from "@/lib/assessmentRuntime";

type DemoSeedClient = PrismaClient;

export type CompanyRecord = {
  id: string;
  name: string;
  type: CompanyType;
};

export type SeededProduct = {
  id: string;
  companyId: string;
  vendorId: string;
  input: DemoProductInput;
  vendor: DemoVendorInput;
  productIndex: number;
};

type ProductVarianceKind = "high-alignment" | "low-alignment" | "vendor-over-firm" | "close-alignment";

const PRODUCT_VARIANCE_PATTERNS: Array<{
  kind: ProductVarianceKind;
  vendorOffset: number;
  firmOffset: number;
}> = [
  { kind: "vendor-over-firm", vendorOffset: 0.7, firmOffset: -0.4 },
  { kind: "high-alignment", vendorOffset: 0.35, firmOffset: 0.2 },
  { kind: "low-alignment", vendorOffset: -1.2, firmOffset: -1.15 },
  { kind: "low-alignment", vendorOffset: -1, firmOffset: -0.95 },
  { kind: "vendor-over-firm", vendorOffset: 0.65, firmOffset: -1.05 },
  { kind: "vendor-over-firm", vendorOffset: 0.5, firmOffset: -0.85 },
  { kind: "close-alignment", vendorOffset: 0.1, firmOffset: 0.05 },
  { kind: "close-alignment", vendorOffset: -0.05, firmOffset: -0.08 },
];

const FIRM_MODULE_OFFSETS = [0.55, -0.35, 0.2, -0.75, 0.4] as const;

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stableId(prefix: string, key: string) {
  return `${prefix}-${slugify(key)}`;
}

function clampScore(value: number) {
  return Math.max(PRODUCT_ASSESSMENT_SCALE_MIN, Math.min(PRODUCT_ASSESSMENT_SCALE_MAX, value));
}

function clampTarget(value: number) {
  return Math.max(PRODUCT_ASSESSMENT_SCALE_MIN + 0.35, Math.min(PRODUCT_ASSESSMENT_SCALE_MAX - 0.1, value));
}

function deterministicAnswer(target: number, index: number, seed: number, spread = 0.32) {
  const offset = ((index * 7 + seed * 3) % 9) - 4;
  return clampScore(Math.round(target + offset * spread));
}

function productVariancePattern(productIndex: number) {
  return PRODUCT_VARIANCE_PATTERNS[productIndex % PRODUCT_VARIANCE_PATTERNS.length]!;
}

function vendorSelfAssessmentTarget(product: DemoProductInput, productIndex: number) {
  const pattern = productVariancePattern(productIndex);
  return clampTarget(product.scoreTarget + pattern.vendorOffset);
}

function firmProductReviewTarget(input: {
  firm: DemoFirmInput;
  product: SeededProduct;
  relationshipIndex: number;
}) {
  const pattern = productVariancePattern(input.product.productIndex);
  const relationshipOffset = ((input.relationshipIndex % 5) - 2) * 0.16;
  return clampTarget(
    input.firm.scoreTarget * 0.35 +
      input.product.input.scoreTarget * 0.65 +
      pattern.firmOffset +
      relationshipOffset
  );
}

// WS11-D Block A.1: Demo Company gets a deliberately varied per-module
// score distribution so the firm-brief radar visibly demonstrates PAT's
// band color ramp (deep-red / red / amber / green) on stage. Modules
// returned by loadFirmAlignmentModules are sorted alphabetically by key:
//   0: firm_alignment_automation_ai_v1
//   1: firm_alignment_data_flow_v1
//   2: firm_alignment_governance_v1
//   3: firm_alignment_operating_model_v1
//   4: firm_alignment_strategy_v1   ← left as draft by WS10-A (no signal)
// Target scoreTarget values on the 0–5 scale; scorePct = target*20.
const DEMO_COMPANY_MODULE_TARGETS: ReadonlyArray<number> = [
  3.0, // automation-ai      → ~60% (red band, >15 below ~82% peer avg)
  3.0, // data-flow          → ~60% (red band)
  3.5, // governance         → ~70% (amber-red, 6-15 below)
  4.4, // operating-model    → ~88% (green, 6+ above peer avg)
  4.0, // strategy           → ~80% (won't render — WS10-A leaves Strategy
       //                              in draft state; no-signal on radar)
];

function firmModuleAssessmentTarget(firm: DemoFirmInput, firmIndex: number, moduleIndex: number) {
  if (firm.key === "demo-company") {
    const target = DEMO_COMPANY_MODULE_TARGETS[moduleIndex] ?? firm.scoreTarget;
    return clampTarget(target);
  }
  // Block 10a de-clump: ROTATE the per-module offset pattern by firmIndex so
  // different firms have a different WEAKEST module. Without the rotation the
  // offset with the lowest value (-0.75 at array index 3) always landed on the
  // same module, so every firm's Sales Card gap area read identically
  // ("Operating Model …"). Rotating spreads the weakest module across firms
  // (firmIndex 0→module3, 1→module2, 2→module1, 3→module0, 4→module4 → 5
  // distinct gap areas per 5 firms). The offsets sum to a constant (+0.05), so
  // a firm's OVERALL alignment average — and thus the fit distribution — is
  // unchanged; only which module is weakest rotates.
  const moduleOffset =
    FIRM_MODULE_OFFSETS[(moduleIndex + firmIndex) % FIRM_MODULE_OFFSETS.length] ?? 0;
  const firmOffset = ((firmIndex % 5) - 2) * 0.18;
  return clampTarget(firm.scoreTarget + moduleOffset + firmOffset);
}

export function demoDate(offsetHours: number) {
  return new Date(new Date(DEMO_SEED_BASE_DATE).getTime() + offsetHours * 60 * 60 * 1000);
}

// Canonical maturity bands now live in lib/firmMaturity.ts (B5-5).
export { maturityTier };

export async function ensureResearchSource(client: DemoSeedClient) {
  return client.researchSource.upsert({
    where: { key: DEMO_PAT_ECOSYSTEM_VERSION },
    update: {
      title: "PAT deterministic demo ecosystem",
      sourceType: ResearchSourceType.INTERVIEW,
      status: ResearchSourceStatus.IMPORTED,
      artifactPath: "data/demoPatEcosystem.ts",
      notes: "Deterministic local review ecosystem seeded for PAT manual QA.",
      publishedAt: new Date(DEMO_SEED_BASE_DATE),
      updatedAt: new Date(),
    },
    create: {
      id: stableId("research-source", DEMO_PAT_ECOSYSTEM_VERSION),
      key: DEMO_PAT_ECOSYSTEM_VERSION,
      title: "PAT deterministic demo ecosystem",
      sourceType: ResearchSourceType.INTERVIEW,
      status: ResearchSourceStatus.IMPORTED,
      artifactPath: "data/demoPatEcosystem.ts",
      notes: "Deterministic local review ecosystem seeded for PAT manual QA.",
      publishedAt: new Date(DEMO_SEED_BASE_DATE),
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

export async function ensureCompany(client: DemoSeedClient, input: {
  key: string;
  name: string;
  type: CompanyType;
}) {
  // The company id is derived from the stable `key`, so resolve by id FIRST.
  // This keeps re-seeding idempotent when a demo company's NAME changes (e.g.
  // Block 11 N1 region-suffix rename): the existing row is updated in place
  // rather than the create colliding on the key-derived id. The name lookup
  // stays as a legacy fallback for rows created before ids were stable.
  const id = stableId(
    input.type === CompanyType.VENDOR ? "demo-vendor-company" : "demo-firm-company",
    input.key
  );
  const existing =
    (await client.company.findUnique({ where: { id }, select: { id: true } })) ??
    (await client.company.findFirst({ where: { name: input.name }, select: { id: true } }));

  if (existing) {
    return client.company.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        type: input.type,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, type: true },
    });
  }

  return client.company.create({
    data: {
      id,
      name: input.name,
      type: input.type,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, type: true },
  });
}

export async function ensureCompanySubject(client: DemoSeedClient, company: CompanyRecord) {
  return client.subject.upsert({
    where: { companyId: company.id },
    update: {
      key: `company:${company.id}`,
      displayName: company.name,
      kind: SubjectKind.ORGANIZATION,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-subject-company", company.id),
      key: `company:${company.id}`,
      displayName: company.name,
      kind: SubjectKind.ORGANIZATION,
      companyId: company.id,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

export async function ensureMembership(client: DemoSeedClient, input: {
  subjectId: string;
  membership: { plan: MembershipPlan; status: MembershipStatus };
}) {
  return client.membershipSubscription.upsert({
    where: { subjectId: input.subjectId },
    update: {
      plan: input.membership.plan,
      status: input.membership.status,
      provider: "pat-demo-seed",
      providerStatus: "demo_seed_reconciled",
      lastBillingEventType: "demo.seed.membership",
      lastBillingEventAt: new Date(),
      lastReconciledAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-membership", input.subjectId),
      subjectId: input.subjectId,
      plan: input.membership.plan,
      status: input.membership.status,
      provider: "pat-demo-seed",
      providerStatus: "demo_seed_reconciled",
      startedAt: new Date(DEMO_SEED_BASE_DATE),
      lastBillingEventType: "demo.seed.membership",
      lastBillingEventAt: new Date(),
      lastReconciledAt: new Date(),
      metadata: {
        source: DEMO_PAT_ECOSYSTEM_VERSION,
      },
    },
  });
}

export async function ensureVendor(client: DemoSeedClient, input: {
  vendor: DemoVendorInput;
  vendorIndex: number;
  sourceId: string;
}) {
  const company = await ensureCompany(client, {
    key: input.vendor.key,
    name: input.vendor.displayName,
    type: CompanyType.VENDOR,
  });
  const subject = await ensureCompanySubject(client, company);
  await ensureMembership(client, {
    subjectId: subject.id,
    membership: input.vendor.membership,
  });

  const vendorProfile = await client.vendorProfile.upsert({
    where: { companyId: company.id },
    update: {
      key: stableId("demo-vendor", input.vendor.key),
      displayName: input.vendor.displayName,
      subjectId: subject.id,
      website: input.vendor.website,
      status: getDemoVendorStatus(input.vendorIndex),
      researchStatus: ResearchSourceStatus.IMPORTED,
      notes: `${input.vendor.industryFocus}. Size: ${input.vendor.sizeBand}. Maturity: ${input.vendor.maturityLevel}.`,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-vendor-profile", input.vendor.key),
      key: stableId("demo-vendor", input.vendor.key),
      displayName: input.vendor.displayName,
      companyId: company.id,
      subjectId: subject.id,
      website: input.vendor.website,
      status: getDemoVendorStatus(input.vendorIndex),
      researchStatus: ResearchSourceStatus.IMPORTED,
      notes: `${input.vendor.industryFocus}. Size: ${input.vendor.sizeBand}. Maturity: ${input.vendor.maturityLevel}.`,
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  const signalEntries = [
    ["demo.vendor.industry_focus", input.vendor.industryFocus],
    ["demo.vendor.size_band", input.vendor.sizeBand],
    ["demo.vendor.maturity_level", input.vendor.maturityLevel],
    ["demo.vendor.integration_needs", input.vendor.integrationNeeds.join(", ")],
    ["demo.vendor.risk_flags", input.vendor.riskFlags.join("; ")],
  ] as const;

  for (const [signalKey, valueText] of signalEntries) {
    await client.vendorSignal.upsert({
      where: {
        vendorId_signalKey: {
          vendorId: vendorProfile.id,
          signalKey,
        },
      },
      update: {
        valueText,
        confidence: ResearchConfidence.HIGH,
        sourceId: input.sourceId,
        updatedAt: new Date(),
      },
      create: {
        id: stableId("demo-vendor-signal", `${input.vendor.key}-${signalKey}`),
        vendorId: vendorProfile.id,
        signalKey,
        valueText,
        confidence: ResearchConfidence.HIGH,
        sourceId: input.sourceId,
        updatedAt: new Date(),
      },
    });
  }

  return {
    company,
    subject,
    vendorProfile,
  };
}

export async function ensureProduct(client: DemoSeedClient, input: {
  vendor: DemoVendorInput;
  vendorCompanyId: string;
  vendorProfileId: string;
  product: DemoProductInput;
  productIndex: number;
  sourceId: string;
}) {
  const slug = `${input.vendor.key}-${input.product.key}`;
  const website = `${input.vendor.website}${input.product.websitePath}`;
  const product = await client.product.upsert({
    where: { slug },
    update: {
      companyId: input.vendorCompanyId,
      vendorId: input.vendorProfileId,
      name: input.product.name,
      // B10a: canonicalize category at the single write point (base + expansion).
      category: canonicalCategoryForProduct(input.product.utilityKeys),
      website,
      summary: input.product.summary,
      deploymentModel: input.product.deploymentModel,
      active: true,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-product", slug),
      companyId: input.vendorCompanyId,
      vendorId: input.vendorProfileId,
      name: input.product.name,
      slug,
      category: canonicalCategoryForProduct(input.product.utilityKeys),
      website,
      summary: input.product.summary,
      deploymentModel: input.product.deploymentModel,
      active: true,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, companyId: true, vendorId: true },
  });

  await ensureProductSubject({ id: product.id, name: product.name });
  await client.productProfile.upsert({
    where: { productId: product.id },
    update: {
      logoUrl: null,
      logoAssetRef: `demo://${input.product.key}/logo`,
      ...input.product.profile,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-product-profile", input.product.key),
      productId: product.id,
      logoAssetRef: `demo://${input.product.key}/logo`,
      ...input.product.profile,
    },
  });

  const signalEntries = [
    ["demo.product.category", input.product.category],
    ["demo.product.risk_flags", input.product.riskFlags.join("; ")],
    ["demo.product.integration_posture", input.product.profile.integrationPosture],
  ] as const;

  for (const [signalKey, valueText] of signalEntries) {
    await client.productSignal.upsert({
      where: {
        productId_signalKey: {
          productId: product.id,
          signalKey,
        },
      },
      update: {
        valueText,
        confidence: ResearchConfidence.HIGH,
        sourceId: input.sourceId,
        updatedAt: new Date(),
      },
      create: {
        id: stableId("demo-product-signal", `${input.product.key}-${signalKey}`),
        productId: product.id,
        signalKey,
        valueText,
        confidence: ResearchConfidence.HIGH,
        sourceId: input.sourceId,
        updatedAt: new Date(),
      },
    });
  }

  return {
    id: product.id,
    companyId: product.companyId!,
    vendorId: product.vendorId!,
    input: input.product,
    vendor: input.vendor,
    productIndex: input.productIndex,
  } satisfies SeededProduct;
}

async function upsertProductAssessmentPlan(client: DemoSeedClient, input: {
  productId: string;
  perspective: ProductAssessmentPerspective;
  utilityKeys: string[];
}) {
  const plan = serializeProductAssessmentPlan({
    perspective: input.perspective === ProductAssessmentPerspective.FIRM ? "firm" : "vendor",
    selectedUtilityKeys: input.utilityKeys,
  });

  return client.productAssessmentPlan.upsert({
    where: {
      productId_perspective: {
        productId: input.productId,
        perspective: input.perspective,
      },
    },
    update: {
      registryVersion: plan.registryVersion,
      selectedUtilityKeys: plan.selectedUtilityKeys,
      generatedQuestionIds: plan.generatedQuestionIds,
      profileQuestionIds: plan.profileQuestionIds,
      scoredQuestionIds: plan.scoredQuestionIds,
      openEndedQuestionIds: plan.openEndedQuestionIds,
      moduleOrder: plan.moduleOrder,
      sectionOrder: plan.sectionOrder,
      modulePlan: plan.modulePlan,
      sectionPlan: plan.sectionPlan,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-product-plan", `${input.productId}-${input.perspective.toLowerCase()}`),
      productId: input.productId,
      perspective: input.perspective,
      registryVersion: plan.registryVersion,
      selectedUtilityKeys: plan.selectedUtilityKeys,
      generatedQuestionIds: plan.generatedQuestionIds,
      profileQuestionIds: plan.profileQuestionIds,
      scoredQuestionIds: plan.scoredQuestionIds,
      openEndedQuestionIds: plan.openEndedQuestionIds,
      moduleOrder: plan.moduleOrder,
      sectionOrder: plan.sectionOrder,
      modulePlan: plan.modulePlan,
      sectionPlan: plan.sectionPlan,
    },
    select: { id: true },
  });
}

export async function seedVendorProductAssessment(client: DemoSeedClient, input: {
  product: SeededProduct;
  moduleId: string;
  moduleVersion: number;
  productIndex: number;
}) {
  const product = input.product.input;
  const variancePattern = productVariancePattern(input.productIndex);
  const assessmentTarget = vendorSelfAssessmentTarget(product, input.productIndex);
  const subject = await ensureProductSubject({ id: input.product.id, name: product.name });
  const questions = buildVendorProductQuestions(product.utilityKeys);
  const answers = Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      deterministicAnswer(assessmentTarget, index, input.productIndex),
    ])
  );
  const score = computeVendorAssessmentMetrics(answers);
  const profile = normalizeVendorProductProfileInput({
    productName: product.name,
    productDescription: product.summary,
    logoReference: `demo://${product.key}/logo`,
    ...product.profile,
  });
  const vendorPlan = serializeVendorProductAssessmentPlan(product.utilityKeys);
  const persistedPlan = await upsertProductAssessmentPlan(client, {
    productId: input.product.id,
    perspective: ProductAssessmentPerspective.VENDOR,
    utilityKeys: product.utilityKeys,
  });
  await upsertProductAssessmentPlan(client, {
    productId: input.product.id,
    perspective: ProductAssessmentPerspective.FIRM,
    utilityKeys: product.utilityKeys,
  });

  const openEndedPlan = serializeVendorAdaptiveOpenEndedQuestionSnapshot({
    selectedUtilityKeys: product.utilityKeys,
    profile,
    answers,
  });
  // WS3-D (manual-review item 29): rotation array grown from 12 → 25 variants
  // so the "Recent firm responses" surface shows more visible diversity at
  // the new 60-response scale (15 firms × 4 products). Rotation mechanism
  // unchanged from Day-27 P1j: (idSum + index) % templates.length, keyed on
  // questionId character-code sum + position for stable re-seeds. Every
  // template interpolates at least one of {product.name,
  // product.profile.operatingModelFit, riskFlag}.
  const openEndedTemplates = [
    (riskFlag: string) => `${product.name} is strongest where ${product.profile.operatingModelFit.toLowerCase()} The current review evidence flags ${riskFlag} as the condition to monitor.`,
    (riskFlag: string) => `Across our use of ${product.name}, the integration depth has held up over the rollout period. ${riskFlag.charAt(0).toUpperCase() + riskFlag.slice(1)} remains the open question for the next quarter.`,
    (riskFlag: string) => `${product.name} delivers on the core ${product.profile.operatingModelFit.toLowerCase().split(" ")[0]} promise. Where it shows wear is on ${riskFlag}, which we've worked around but track quarterly.`,
    (riskFlag: string) => `We chose ${product.name} primarily for operational fit. ${product.profile.operatingModelFit} The current evidence on ${riskFlag} suggests we should keep monitoring.`,
    (riskFlag: string) => `The reliability of ${product.name} has been a positive surprise. The team flagged ${riskFlag} as a condition to revisit at renewal.`,
    (riskFlag: string) => `${product.name}'s ${product.profile.operatingModelFit.toLowerCase().split(" ").slice(0, 4).join(" ")} aligns with how we operate. The single watch-item is ${riskFlag}.`,
    (riskFlag: string) => `After working with ${product.name}, the team has consistent confidence in the platform's day-to-day execution. Forward attention belongs on ${riskFlag}.`,
    (riskFlag: string) => `${product.name} fits our operating context. ${product.profile.operatingModelFit} Open evidence on ${riskFlag} stays on the review docket.`,
    (riskFlag: string) => `The strongest signal from our ${product.name} deployment is around integration steadiness. The opening for improvement is ${riskFlag}.`,
    (riskFlag: string) => `${product.name} earns its keep on the operating-model fit dimension. The team's call-out on ${riskFlag} is the only flag we're carrying forward.`,
    (riskFlag: string) => `We continue to see value from ${product.name}. The structural risk we monitor is ${riskFlag}; everything else tracks our pre-rollout expectations.`,
    (riskFlag: string) => `${product.name} reliably supports ${product.profile.operatingModelFit.toLowerCase().split(" ").slice(0, 5).join(" ")} The condition that remains uncertain is ${riskFlag}.`,
    // WS3-D new templates 13-25:
    (riskFlag: string) => `Adoption pace for ${product.name} has been steady; the main thing we're watching is ${riskFlag}.`,
    (riskFlag: string) => `${product.name} earns its keep on the daily work. The rough edge is around ${riskFlag}.`,
    (riskFlag: string) => `Our renewal conversation around ${product.name} will hinge on how the vendor handles ${riskFlag}.`,
    (riskFlag: string) => `${product.name} sits at the center of the workflow now; the single thing we'd improve is ${riskFlag}.`,
    (riskFlag: string) => `Compared to what we used before, ${product.name} closes the gap on ${product.profile.operatingModelFit.toLowerCase().split(" ")[0]} cleanly. ${riskFlag.charAt(0).toUpperCase() + riskFlag.slice(1)} is the only standing question.`,
    (riskFlag: string) => `Day-to-day, ${product.name} is reliable. ${riskFlag.charAt(0).toUpperCase() + riskFlag.slice(1)} comes up in every quarterly retrospective but never tips us over.`,
    (riskFlag: string) => `The partners view ${product.name} as a quiet workhorse — it doesn't make headlines, and it doesn't break. The ongoing watch-item is ${riskFlag}.`,
    (riskFlag: string) => `${product.name} replaces three tools we used to stitch together. The remaining concern, mostly minor, is ${riskFlag}.`,
    (riskFlag: string) => `Our team's confidence in ${product.name} climbed sharply after the first full quarter. The single area we still flag is ${riskFlag}.`,
    (riskFlag: string) => `${product.name} pairs well with our existing stack — ${product.profile.operatingModelFit.toLowerCase().split(" ").slice(0, 3).join(" ")} fits cleanly. The open piece is ${riskFlag}.`,
    (riskFlag: string) => `If we had to argue for keeping ${product.name} at renewal, the case writes itself on operational fit. The counter-argument lives in ${riskFlag}.`,
    (riskFlag: string) => `${product.name}'s release cadence has been a pleasant surprise. The team's ongoing concern is just ${riskFlag}, which the vendor has acknowledged.`,
    (riskFlag: string) => `Trust in ${product.name} grew faster than we expected. The remaining wrinkle is ${riskFlag} — solvable, but worth tracking.`,
  ];
  // B8-7 de-clump: rotate templates as a FULL-CYCLE PERMUTATION. With a step
  // coprime to the template count, `base + index*step (mod N)` visits every
  // template before repeating, so no firm ever gets the same template twice
  // within its latest N (=template-count) responses — killing the back-to-back
  // near-duplicates (e.g. Brightline ×3 PolicyGrid). The per-product base seed
  // varies the starting phrase across firms/products; the risk flag advances on
  // its own coprime step so the watch-item also changes response to response.
  const templateCount = openEndedTemplates.length;
  const openEndedResponses = Object.fromEntries(
    openEndedPlan.map((question, index) => {
      const riskCount = product.riskFlags.length || 1;
      const riskFlag = product.riskFlags[index % riskCount] ?? "implementation governance";
      const templateIndex = openEndedTemplateIndex(product.key, index, templateCount);
      const template = openEndedTemplates[templateIndex] ?? openEndedTemplates[0];
      return [question.id, template(riskFlag)];
    })
  );

  const createdAt = demoDate(24 + input.productIndex);
  const submissionId = stableId("demo-vendor-product-submission", product.key);
  const submissionData = {
    companyId: input.product.companyId,
    subjectId: subject.id,
    moduleId: input.moduleId,
    version: input.moduleVersion,
    answers: {
      utilitySelection: product.utilityKeys,
      profile,
      openEndedResponses,
      openEndedPlan,
      assessmentPlanId: persistedPlan.id,
      registryVersion: vendorPlan.registryVersion,
      responses: answers,
      demoSource: DEMO_PAT_ECOSYSTEM_VERSION,
      demoVariancePattern: variancePattern.kind,
      demoTargetScore: assessmentTarget,
    },
    score: score.score.rawScorePct,
    weightedAvg: score.score.rawWeightedAvg,
    scoreVersion: SURVEY_FINAL_SCORE_VERSION,
    scaleMin: score.score.scaleMin,
    scaleMax: score.score.scaleMax,
    totalWeight: score.score.totalWeight,
    answeredCount: score.score.answeredCount,
    signalIntegrityScore: score.integrity.score,
    integrityFlags: score.integrity.flags,
    createdAt,
  };

  await client.surveySubmission.upsert({
    where: { id: submissionId },
    update: submissionData,
    create: {
      id: submissionId,
      ...submissionData,
    },
  });

  await upsertVendorProductSignals(client, input.product.id, product.utilityKeys, score.score.rawScorePct);

  return {
    submissionId,
    score: score.score.rawScorePct,
  };
}

export async function ensureFirm(client: DemoSeedClient, firm: DemoFirmInput) {
  const company = await ensureCompany(client, {
    key: firm.key,
    name: firm.displayName,
    type: CompanyType.FIRM,
  });
  const subject = await ensureCompanySubject(client, company);
  await ensureMembership(client, {
    subjectId: subject.id,
    membership: firm.membership,
  });

  const scorePct = Math.round((firm.scoreTarget / PRODUCT_ASSESSMENT_SCALE_MAX) * 100);
  const tier = maturityTier(scorePct);

  await client.firmMaturityIndex.upsert({
    where: {
      companyId_version: {
        companyId: company.id,
        version: 1,
      },
    },
    update: {
      score: scorePct,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      computedAt: new Date(),
    },
    create: {
      id: stableId("demo-fmi", firm.key),
      companyId: company.id,
      score: scorePct,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: 1,
    },
  });

  await client.firmMaturityMomentum.upsert({
    where: {
      companyId_version: {
        companyId: company.id,
        version: 1,
      },
    },
    update: {
      windowN: 3,
      delta1: firm.scoreTarget >= 4 ? 4 : 2,
      delta2: firm.scoreTarget >= 4 ? 3 : 1,
      accel: firm.scoreTarget >= 4 ? 1 : 0,
      avgDelta: firm.scoreTarget >= 4 ? 3.5 : 1.5,
      volatility: firm.scoreTarget >= 4 ? 0.8 : 1.4,
      trend: firm.scoreTarget >= 4 ? "UP" : "MIXED",
      velocity: firm.scoreTarget >= 4 ? "ACCELERATING" : "STABLE",
      stability: firm.scoreTarget >= 4 ? "STABLE" : "WATCH",
      computedAt: new Date(),
    },
    create: {
      id: stableId("demo-fmi-momentum", firm.key),
      companyId: company.id,
      version: 1,
      windowN: 3,
      delta1: firm.scoreTarget >= 4 ? 4 : 2,
      delta2: firm.scoreTarget >= 4 ? 3 : 1,
      accel: firm.scoreTarget >= 4 ? 1 : 0,
      avgDelta: firm.scoreTarget >= 4 ? 3.5 : 1.5,
      volatility: firm.scoreTarget >= 4 ? 0.8 : 1.4,
      trend: firm.scoreTarget >= 4 ? "UP" : "MIXED",
      velocity: firm.scoreTarget >= 4 ? "ACCELERATING" : "STABLE",
      stability: firm.scoreTarget >= 4 ? "STABLE" : "WATCH",
    },
  });

  await client.firmMaturitySnapshot.upsert({
    where: { id: stableId("demo-fmi-snapshot", firm.key) },
    update: {
      score: scorePct,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: 1,
      computedAt: new Date(),
    },
    create: {
      id: stableId("demo-fmi-snapshot", firm.key),
      companyId: company.id,
      score: scorePct,
      tier: tier.tier,
      bandMin: tier.bandMin,
      bandMax: tier.bandMax,
      version: 1,
    },
  });

  // Elite Insights v2 (F3 Trajectory): seed a demo TRAJECTORY — 6 backdated
  // monthly snapshots ramping up to the current score with deterministic wobble,
  // so the demo Elite firm charts a real line (never fabricated-live: these are
  // clearly demo rows on a demo account). The month-0 row above stays the latest.
  const MONTHS_OF_HISTORY = 6;
  const totalClimb = 15; // points gained across the window
  for (let monthsAgo = 1; monthsAgo <= MONTHS_OF_HISTORY; monthsAgo += 1) {
    // deterministic ±1.5 wobble from the firm key + month (no Math.random in seeds)
    const seed = (firm.key.charCodeAt(monthsAgo % firm.key.length) + monthsAgo * 7) % 7;
    const wobble = seed - 3; // -3..+3
    const historicalScore = Math.max(
      5,
      Math.min(100, Math.round(scorePct - (totalClimb * monthsAgo) / MONTHS_OF_HISTORY + wobble))
    );
    const historicalTier = maturityTier(historicalScore);
    const computedAt = new Date(Date.now() - monthsAgo * 30 * 24 * 60 * 60 * 1000);
    await client.firmMaturitySnapshot.upsert({
      where: { id: stableId("demo-fmi-snapshot", `${firm.key}:m${monthsAgo}`) },
      update: {
        score: historicalScore,
        tier: historicalTier.tier,
        bandMin: historicalTier.bandMin,
        bandMax: historicalTier.bandMax,
        version: 1,
        computedAt,
      },
      create: {
        id: stableId("demo-fmi-snapshot", `${firm.key}:m${monthsAgo}`),
        companyId: company.id,
        score: historicalScore,
        tier: historicalTier.tier,
        bandMin: historicalTier.bandMin,
        bandMax: historicalTier.bandMax,
        version: 1,
        computedAt,
      },
    });
  }

  return { company, subject };
}

export async function seedFirmAlignmentSubmission(client: DemoSeedClient, input: {
  firm: DemoFirmInput;
  companyId: string;
  subjectId: string;
  module: {
    id: string;
    key: string;
    version: number;
    badgeRules: Array<{ badgeId: string; minScore: number | null; required: boolean }>;
    questions: ReturnType<typeof normalizeQuestionRuntime>[];
    mappings: Array<{ questionId: string; questionKey: string; nodeId: string; weight: number }>;
  };
  moduleIndex: number;
  firmIndex: number;
}) {
  const answers: Record<string, NormalizedAnswer> = {};
  for (const [questionIndex, question] of input.module.questions.entries()) {
    if (question.inputType === QuestionInputType.SLIDER) {
      answers[question.id] = deterministicAnswer(
        firmModuleAssessmentTarget(input.firm, input.firmIndex, input.moduleIndex),
        questionIndex,
        input.firmIndex + input.moduleIndex,
        0.34
      );
      continue;
    }

    answers[question.id] =
      `${input.firm.displayName} is reviewing ${input.firm.integrationNeeds.join(", ")} with current risk around ${input.firm.riskFlags.join(" and ")}. The operating evidence is intentionally demo-seeded for ${DEMO_PAT_ECOSYSTEM_VERSION}.`;
  }

  const numericAnswers = extractNumericAnswers(input.module.questions, answers);
  const scoreScale = getAssessmentScoreScale(input.module.questions);
  const score = computeScore({
    answers: numericAnswers,
    scaleMin: scoreScale.min,
    scaleMax: scoreScale.max,
  });
  const integrity = evaluateSignalIntegrity(answers, {
    expectedQuestionCount: input.module.questions.length,
    scaleMin: score.scaleMin,
    scaleMax: score.scaleMax,
  });
  const capabilityScoring = computeCapabilityScores({
    questions: input.module.questions,
    answers,
    mappings: input.module.mappings,
  });

  const submissionId = stableId("demo-firm-alignment-submission", `${input.firm.key}-${input.module.key}`);
  const submissionData = {
    companyId: input.companyId,
    subjectId: input.subjectId,
    moduleId: input.module.id,
    version: input.module.version,
    answers,
    score: score.rawScorePct,
    weightedAvg: score.rawWeightedAvg,
    scoreVersion: SURVEY_FINAL_SCORE_VERSION,
    scaleMin: score.scaleMin,
    scaleMax: score.scaleMax,
    totalWeight: score.totalWeight,
    answeredCount: score.answeredCount,
    signalIntegrityScore: integrity.score,
    integrityFlags: integrity.flags,
    createdAt: demoDate(96 + input.firmIndex * 6 + input.moduleIndex),
  };

  await client.surveySubmission.upsert({
    where: { id: submissionId },
    update: submissionData,
    create: {
      id: submissionId,
      ...submissionData,
    },
  });

  await writeCompanyCapabilityScores(client, {
    companyId: input.companyId,
    scores: capabilityScoring.scores,
    scoreVersion: COMPANY_CAPABILITY_SCORE_VERSION,
  });

  for (const badgeRule of input.module.badgeRules) {
    if (!badgeRule.required || score.rawScorePct < (badgeRule.minScore ?? 0)) {
      continue;
    }

    await client.companyBadge.upsert({
      where: {
        companyId_badgeId_moduleId: {
          companyId: input.companyId,
          badgeId: badgeRule.badgeId,
          moduleId: input.module.id,
        },
      },
      update: {
        subjectId: input.subjectId,
      },
      create: {
        id: stableId("demo-company-badge", `${input.firm.key}-${badgeRule.badgeId}-${input.module.key}`),
        companyId: input.companyId,
        subjectId: input.subjectId,
        badgeId: badgeRule.badgeId,
        moduleId: input.module.id,
      },
    });
  }
}

// WS10-A Block E: seed a partial-draft firm alignment submission so the demo
// firm can show "4 of 5 completed + 1 in progress" workflow state instead of
// a finished 5/5 mock. Writes a SurveySubmission row with scoreVersion=0
// (draft) and answers populated for only the first half of the question
// list. No capability scores or badges — those only land on a final submit.
export async function seedFirmAlignmentDraft(client: DemoSeedClient, input: {
  firm: DemoFirmInput;
  companyId: string;
  subjectId: string;
  module: {
    id: string;
    key: string;
    version: number;
    questions: ReturnType<typeof normalizeQuestionRuntime>[];
  };
  moduleIndex: number;
  firmIndex: number;
}) {
  const draftAnswerCount = Math.floor(input.module.questions.length / 2);
  const answers: Record<string, NormalizedAnswer> = {};
  for (const [questionIndex, question] of input.module.questions.slice(0, draftAnswerCount).entries()) {
    if (question.inputType === QuestionInputType.SLIDER) {
      answers[question.id] = deterministicAnswer(
        firmModuleAssessmentTarget(input.firm, input.firmIndex, input.moduleIndex),
        questionIndex,
        input.firmIndex + input.moduleIndex,
        0.34
      );
      continue;
    }
    answers[question.id] = `${input.firm.displayName} draft response for ${DEMO_PAT_ECOSYSTEM_VERSION}.`;
  }

  const submissionId = stableId(
    "demo-firm-alignment-submission",
    `${input.firm.key}-${input.module.key}`
  );

  const draftIntegrity = buildSurveyDraftIntegrityFlags({
    currentStep: draftAnswerCount,
    totalSteps: input.module.questions.length,
    questionCount: input.module.questions.length,
  });

  // Schema requires non-null score / signalIntegrityScore / totalWeight /
  // scale columns; drafts use zero/default values. The aggregator filters
  // drafts via getSurveyDraftWhere (scoreVersion === 0) and never surfaces
  // their `score` as a completed value.
  const submissionData = {
    companyId: input.companyId,
    subjectId: input.subjectId,
    moduleId: input.module.id,
    version: input.module.version,
    answers,
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: 0,
    scaleMax: 100,
    totalWeight: 0,
    answeredCount: draftAnswerCount,
    signalIntegrityScore: 1.0,
    integrityFlags: draftIntegrity,
    // Anchor the draft a few hours after the latest final submission for
    // Demo Company (other modules land at demoDate(96..100)) so the demo
    // story reads as "finished the first four, started Strategy today".
    createdAt: demoDate(108),
  };

  await client.surveySubmission.upsert({
    where: { id: submissionId },
    update: submissionData,
    create: {
      id: submissionId,
      ...submissionData,
    },
  });
}

export async function seedFirmProductAssessment(client: DemoSeedClient, input: {
  firm: DemoFirmInput;
  firmCompanyId: string;
  product: SeededProduct;
  moduleId: string;
  moduleVersion: number;
  relationshipIndex: number;
}) {
  const variancePattern = productVariancePattern(input.product.productIndex);
  const reviewTarget = firmProductReviewTarget(input);
  const subject = await ensureProductSubject({ id: input.product.id, name: input.product.input.name });
  const questions = buildFirmProductQuestions(input.product.input.utilityKeys);
  const answers = Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      deterministicAnswer(
        reviewTarget,
        index,
        input.relationshipIndex,
        0.36
      ),
    ])
  );
  const score = computeScore({
    answers,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  });
  const integrity = evaluateSignalIntegrity(answers, {
    expectedQuestionCount: questions.length,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  });
  const submissionId = stableId(
    "demo-firm-product-submission",
    `${input.firm.key}-${input.product.vendor.key}-${input.product.input.key}`
  );
  const submissionData = {
    companyId: input.firmCompanyId,
    subjectId: subject.id,
    moduleId: input.moduleId,
    version: input.moduleVersion,
    answers: {
      responses: answers,
      reviewedVendorKey: input.product.vendor.key,
      reviewedProductKey: input.product.input.key,
      demoSource: DEMO_PAT_ECOSYSTEM_VERSION,
      demoVariancePattern: variancePattern.kind,
      demoTargetScore: reviewTarget,
    },
    score: score.rawScorePct,
    weightedAvg: score.rawWeightedAvg,
    scoreVersion: SURVEY_FINAL_SCORE_VERSION,
    scaleMin: score.scaleMin,
    scaleMax: score.scaleMax,
    totalWeight: score.totalWeight,
    answeredCount: score.answeredCount,
    signalIntegrityScore: integrity.score,
    integrityFlags: integrity.flags,
    createdAt: demoDate(240 + input.relationshipIndex),
  };

  await client.surveySubmission.upsert({
    where: { id: submissionId },
    update: submissionData,
    create: {
      id: submissionId,
      ...submissionData,
    },
  });
}

// WS11-I Block C: in-progress firm product review for Demo Company's
// MetricBoard FP&A. Mirrors seedFirmAlignmentDraft — answers stop at the
// halfway mark, scoreVersion is DRAFT, schema-required numeric columns
// zeroed. Aggregator filters via getSurveyDraftWhere so this row never
// surfaces as a completed firm review (it counts as in_progress on the
// /firm/product-assessments status derivation).
export async function seedFirmProductAssessmentDraft(client: DemoSeedClient, input: {
  firm: DemoFirmInput;
  firmCompanyId: string;
  product: SeededProduct;
  moduleId: string;
  moduleVersion: number;
  relationshipIndex: number;
}) {
  const reviewTarget = firmProductReviewTarget(input);
  const subject = await ensureProductSubject({ id: input.product.id, name: input.product.input.name });
  const questions = buildFirmProductQuestions(input.product.input.utilityKeys);
  const draftAnswerCount = Math.floor(questions.length / 2);
  const answers: Record<string, NormalizedAnswer> = {};
  for (const [questionIndex, question] of questions.slice(0, draftAnswerCount).entries()) {
    answers[question.id] = deterministicAnswer(
      reviewTarget,
      questionIndex,
      input.relationshipIndex,
      0.36
    );
  }
  const draftIntegrity = buildSurveyDraftIntegrityFlags({
    currentStep: draftAnswerCount,
    totalSteps: questions.length,
    questionCount: questions.length,
  });
  const submissionId = stableId(
    "demo-firm-product-submission",
    `${input.firm.key}-${input.product.vendor.key}-${input.product.input.key}`
  );
  const submissionData = {
    companyId: input.firmCompanyId,
    subjectId: subject.id,
    moduleId: input.moduleId,
    version: input.moduleVersion,
    answers: {
      responses: answers,
      reviewedVendorKey: input.product.vendor.key,
      reviewedProductKey: input.product.input.key,
      demoSource: DEMO_PAT_ECOSYSTEM_VERSION,
      demoState: "in-progress",
    },
    score: 0,
    weightedAvg: null,
    scoreVersion: SURVEY_DRAFT_SCORE_VERSION,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
    totalWeight: 0,
    answeredCount: draftAnswerCount,
    signalIntegrityScore: 1.0,
    integrityFlags: draftIntegrity,
    createdAt: demoDate(240 + input.relationshipIndex),
  };

  await client.surveySubmission.upsert({
    where: { id: submissionId },
    update: submissionData,
    create: {
      id: submissionId,
      ...submissionData,
    },
  });
}

export async function loadFirmAlignmentModules(client: DemoSeedClient) {
  const records = await client.surveyModule.findMany({
    where: {
      key: {
        in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key),
      },
    },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      version: true,
      BadgeRule: {
        select: {
          badgeId: true,
          minScore: true,
          required: true,
        },
      },
      SurveyQuestion: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          key: true,
          prompt: true,
          inputType: true,
          weight: true,
          order: true,
          required: true,
          meta: true,
          sectionId: true,
          SurveySection: {
            select: {
              id: true,
              key: true,
              title: true,
              description: true,
              order: true,
              utilityFamily: true,
              utilityKey: true,
              utilityLabel: true,
              subcategoryKey: true,
              subcategoryTitle: true,
              basisKey: true,
            },
          },
        },
      },
      ModuleCapability: {
        select: {
          nodeId: true,
          weight: true,
        },
      },
    },
  });

  const mappings = await client.surveyQuestionCapability.findMany({
    where: {
      questionId: {
        in: records.flatMap((record) => record.SurveyQuestion.map((question) => question.id)),
      },
    },
    select: {
      questionId: true,
      nodeId: true,
      weight: true,
      SurveyQuestion: {
        select: { key: true },
      },
    },
  });
  const mappingsByQuestionId = new Map<string, typeof mappings>();
  for (const mapping of mappings) {
    const existing = mappingsByQuestionId.get(mapping.questionId) ?? [];
    existing.push(mapping);
    mappingsByQuestionId.set(mapping.questionId, existing);
  }

  return records.map((record) => ({
    id: record.id,
    key: record.key,
    version: record.version,
    badgeRules: record.BadgeRule,
    questions: record.SurveyQuestion.map(normalizeQuestionRuntime),
    mappings: record.SurveyQuestion.flatMap((question) =>
      (mappingsByQuestionId.get(question.id) ?? []).map((mapping) => ({
        questionId: mapping.questionId,
        questionKey: mapping.SurveyQuestion.key,
        nodeId: mapping.nodeId,
        weight: mapping.weight,
      }))
    ),
  }));
}

export async function ensureDemoPatEcosystem(client: DemoSeedClient) {
  const [vendorModule, firmProductModule] = await Promise.all([
    ensureVendorProductModule(),
    ensureFirmProductModule(),
    ensureFirmAlignmentSystem(),
  ]);
  const source = await ensureResearchSource(client);
  const seededVendors = new Map<string, Awaited<ReturnType<typeof ensureVendor>>>();
  const seededProducts = new Map<string, SeededProduct>();

  for (const [vendorIndex, vendor] of DEMO_PAT_VENDORS.entries()) {
    const seededVendor = await ensureVendor(client, {
      vendor,
      vendorIndex,
      sourceId: source.id,
    });
    seededVendors.set(vendor.key, seededVendor);

    for (const product of vendor.products) {
      const productIndex = seededProducts.size;
      const seededProduct = await ensureProduct(client, {
        vendor,
        vendorCompanyId: seededVendor.company.id,
        vendorProfileId: seededVendor.vendorProfile.id,
        product,
        productIndex,
        sourceId: source.id,
      });
      seededProducts.set(`${vendor.key}:${product.key}`, seededProduct);
    }
  }

  let vendorProductSubmissionCount = 0;
  for (const [productIndex, product] of Array.from(seededProducts.values()).entries()) {
    await seedVendorProductAssessment(client, {
      product,
      moduleId: vendorModule.id,
      moduleVersion: vendorModule.version ?? 1,
      productIndex,
    });
    vendorProductSubmissionCount += 1;
  }

  const seededFirms = new Map<string, Awaited<ReturnType<typeof ensureFirm>>>();
  for (const firm of DEMO_PAT_FIRMS) {
    seededFirms.set(firm.key, await ensureFirm(client, firm));
  }

  const firmAlignmentModules = await loadFirmAlignmentModules(client);
  let firmAlignmentSubmissionCount = 0;
  for (const [firmIndex, firm] of DEMO_PAT_FIRMS.entries()) {
    const seededFirm = seededFirms.get(firm.key);
    if (!seededFirm) continue;

    for (const [moduleIndex, module] of firmAlignmentModules.entries()) {
      // WS10-A Block E: leave Demo Company's Strategy module in a partial-
      // draft state (4/5 complete + 1 in progress) so the demo screen shows
      // live workflow rather than a finished 5/5 mock.
      if (firm.key === "demo-company" && module.key === "firm_alignment_strategy_v1") {
        await seedFirmAlignmentDraft(client, {
          firm,
          companyId: seededFirm.company.id,
          subjectId: seededFirm.subject.id,
          module,
          moduleIndex,
          firmIndex,
        });
        firmAlignmentSubmissionCount += 1;
        continue;
      }
      await seedFirmAlignmentSubmission(client, {
        firm,
        companyId: seededFirm.company.id,
        subjectId: seededFirm.subject.id,
        module,
        moduleIndex,
        firmIndex,
      });
      firmAlignmentSubmissionCount += 1;
    }
  }

  let firmProductSubmissionCount = 0;
  const relationships = getDemoFirmVendorRelationships();
  for (const [relationshipIndex, relationship] of relationships.entries()) {
    const seededFirm = seededFirms.get(relationship.firm.key);
    const product = seededProducts.get(`${relationship.vendor.key}:${relationship.product.key}`);
    if (!seededFirm || !product) continue;

    // WS11-I Block C: shape Demo Company's pat-demo-vendor reviews to a
    // realistic in-workflow distribution — 2 completed (LedgerFlow Close,
    // APStream Control) + 1 in-progress draft (MetricBoard FP&A) + 1
    // not-started (ClientVault Requests). All other firm×vendor
    // relationships keep the default completed-submission seed.
    const isDemoCompanyDemoVendor =
      relationship.firm.key === "demo-company" && relationship.vendor.key === "pat-demo-vendor";
    if (isDemoCompanyDemoVendor) {
      if (relationship.product.key === "clientvault-requests") {
        // Not-started: ensure no submission row exists. Pre-WS11-I runs
        // upserted a completed submission here; delete it so the
        // re-seed is idempotent into the not-started target.
        const staleId = stableId(
          "demo-firm-product-submission",
          `${relationship.firm.key}-${relationship.vendor.key}-${relationship.product.key}`
        );
        await client.surveySubmission.deleteMany({ where: { id: staleId } });
        continue;
      }
      if (relationship.product.key === "metricboard-fpa") {
        await seedFirmProductAssessmentDraft(client, {
          firm: relationship.firm,
          firmCompanyId: seededFirm.company.id,
          product,
          moduleId: firmProductModule.id,
          moduleVersion: firmProductModule.version ?? 1,
          relationshipIndex,
        });
        firmProductSubmissionCount += 1;
        continue;
      }
      // ledgerflow-close + apstream-control fall through to the default
      // completed seed below.
    }

    await seedFirmProductAssessment(client, {
      firm: relationship.firm,
      firmCompanyId: seededFirm.company.id,
      product,
      moduleId: firmProductModule.id,
      moduleVersion: firmProductModule.version ?? 1,
      relationshipIndex,
    });
    firmProductSubmissionCount += 1;
  }

  return {
    vendorCount: DEMO_PAT_VENDORS.length,
    productCount: getDemoProducts().length,
    firmCount: DEMO_PAT_FIRMS.length,
    firmVendorRelationshipCount: relationships.length,
    vendorProductSubmissionCount,
    firmAlignmentSubmissionCount,
    firmProductSubmissionCount,
  };
}

/**
 * Phase 2 (Day 11) consultant ecosystem seed. Wraps the seeded `pat-demo-vendor`
 * and the first 3 demo firms in an Ecosystem assigned to `review.consultant@pat.local`.
 * Idempotent via the unique constraints on
 * Ecosystem.vendorCompanyId / EcosystemFirm.firmCompanyId / ConsultantAssignment.consultantProfileId.
 *
 * Phase 6 (Day 15) replaces this with the full 4-vendor × ~10-firm demo per Q4
 * of the locked consultant scope decisions. This function only handles the
 * minimal singleton-ecosystem case so the consultant landing is non-empty
 * during Phase 3 dashboard development.
 *
 * Returns null when the consultant user is not seeded yet (caller should run
 * `ensureLocalReviewUsers` first).
 */
export async function ensureConsultantEcosystemForReview(client: DemoSeedClient) {
  const consultantUser = await client.user.findUnique({
    where: { email: "review.consultant@pat.local" },
    select: { id: true },
  });
  if (!consultantUser) {
    return null;
  }

  const consultantProfile = await client.consultantProfile.upsert({
    where: { userId: consultantUser.id },
    update: { active: true, updatedAt: new Date() },
    create: {
      id: stableId("demo-consultant-profile", "review-consultant"),
      userId: consultantUser.id,
      active: true,
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  const vendorKey = "pat-demo-vendor";
  const vendorCompany = await client.company.findFirst({
    where: { id: stableId("demo-vendor-company", vendorKey) },
    select: { id: true, name: true },
  });
  if (!vendorCompany) {
    return null;
  }

  // WS3-B (manual-review item 26/27): consultant ecosystem now scopes to all
  // 15 demo firms (was 3). Firm-side alignment submissions scale linearly:
  // 15 firms × 5 modules = 75 submissions.
  const firmKeys = DEMO_PAT_FIRMS.map((firm) => firm.key);
  const firmCompanyIds = firmKeys.map((firmKey) => stableId("demo-firm-company", firmKey));
  const firmCompanies = await client.company.findMany({
    where: { id: { in: firmCompanyIds }, type: CompanyType.FIRM },
    select: { id: true, name: true },
  });
  if (firmCompanies.length < 2) {
    return null;
  }

  const ecosystem = await client.ecosystem.upsert({
    where: { vendorCompanyId: vendorCompany.id },
    update: {
      consultantProfileId: consultantProfile.id,
      name: "Demo Vendor Ecosystem",
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-ecosystem", vendorKey),
      name: "Demo Vendor Ecosystem",
      vendorCompanyId: vendorCompany.id,
      consultantProfileId: consultantProfile.id,
      updatedAt: new Date(),
    },
    select: { id: true, name: true },
  });

  for (const firm of firmCompanies) {
    await client.ecosystemFirm.upsert({
      where: { firmCompanyId: firm.id },
      update: { ecosystemId: ecosystem.id },
      create: {
        ecosystemId: ecosystem.id,
        firmCompanyId: firm.id,
      },
    });
  }

  await client.consultantAssignment.upsert({
    where: { consultantProfileId: consultantProfile.id },
    update: {
      ecosystemId: ecosystem.id,
      active: true,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("demo-consultant-assignment", "review-consultant"),
      consultantProfileId: consultantProfile.id,
      ecosystemId: ecosystem.id,
      active: true,
      updatedAt: new Date(),
    },
  });

  return {
    ecosystemId: ecosystem.id,
    ecosystemName: ecosystem.name,
    vendorCompanyId: vendorCompany.id,
    vendorCompanyName: vendorCompany.name,
    firmCount: firmCompanies.length,
    consultantProfileId: consultantProfile.id,
    consultantEmail: "review.consultant@pat.local",
  };
}
