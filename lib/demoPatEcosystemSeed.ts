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
import { writeCompanyCapabilityScores } from "@/lib/companyCapabilityScoreWrites";
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
import { SURVEY_FINAL_SCORE_VERSION } from "@/lib/surveyDrafts";
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

type CompanyRecord = {
  id: string;
  name: string;
  type: CompanyType;
};

type SeededProduct = {
  id: string;
  companyId: string;
  vendorId: string;
  input: DemoProductInput;
  vendor: DemoVendorInput;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableId(prefix: string, key: string) {
  return `${prefix}-${slugify(key)}`;
}

function clampScore(value: number) {
  return Math.max(PRODUCT_ASSESSMENT_SCALE_MIN, Math.min(PRODUCT_ASSESSMENT_SCALE_MAX, value));
}

function deterministicAnswer(target: number, index: number, seed: number) {
  const offset = ((index + seed) % 5) - 2;
  return clampScore(Math.round(target + offset * 0.42));
}

function demoDate(offsetHours: number) {
  return new Date(new Date(DEMO_SEED_BASE_DATE).getTime() + offsetHours * 60 * 60 * 1000);
}

function maturityTier(scorePct: number) {
  if (scorePct >= 82) return { tier: "ADVANCED", bandMin: 80, bandMax: 100 };
  if (scorePct >= 65) return { tier: "SCALING", bandMin: 65, bandMax: 79 };
  if (scorePct >= 45) return { tier: "FOUNDATIONAL", bandMin: 45, bandMax: 64 };
  return { tier: "EMERGING", bandMin: 0, bandMax: 44 };
}

async function ensureResearchSource(client: DemoSeedClient) {
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

async function ensureCompany(client: DemoSeedClient, input: {
  key: string;
  name: string;
  type: CompanyType;
}) {
  const existing = await client.company.findFirst({
    where: { name: input.name },
    select: { id: true },
  });

  if (existing) {
    return client.company.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, type: true },
    });
  }

  return client.company.create({
    data: {
      id: stableId(input.type === CompanyType.VENDOR ? "demo-vendor-company" : "demo-firm-company", input.key),
      name: input.name,
      type: input.type,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, type: true },
  });
}

async function ensureCompanySubject(client: DemoSeedClient, company: CompanyRecord) {
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

async function ensureMembership(client: DemoSeedClient, input: {
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

async function ensureVendor(client: DemoSeedClient, input: {
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

async function ensureProduct(client: DemoSeedClient, input: {
  vendor: DemoVendorInput;
  vendorCompanyId: string;
  vendorProfileId: string;
  product: DemoProductInput;
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
      category: input.product.category,
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
      category: input.product.category,
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

async function seedVendorProductAssessment(client: DemoSeedClient, input: {
  product: SeededProduct;
  moduleId: string;
  moduleVersion: number;
  productIndex: number;
}) {
  const product = input.product.input;
  const subject = await ensureProductSubject({ id: input.product.id, name: product.name });
  const questions = buildVendorProductQuestions(product.utilityKeys);
  const answers = Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      deterministicAnswer(product.scoreTarget, index, input.productIndex),
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
  const openEndedResponses = Object.fromEntries(
    openEndedPlan.map((question, index) => [
      question.id,
      `${product.name} is strongest where ${product.profile.operatingModelFit.toLowerCase()} The current review evidence flags ${product.riskFlags[index % product.riskFlags.length] ?? "implementation governance"} as the condition to monitor.`,
    ])
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

async function ensureFirm(client: DemoSeedClient, firm: DemoFirmInput) {
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

  return { company, subject };
}

async function seedFirmAlignmentSubmission(client: DemoSeedClient, input: {
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
        input.firm.scoreTarget,
        questionIndex,
        input.firmIndex + input.moduleIndex
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

async function seedFirmProductAssessment(client: DemoSeedClient, input: {
  firm: DemoFirmInput;
  firmCompanyId: string;
  product: SeededProduct;
  moduleId: string;
  moduleVersion: number;
  relationshipIndex: number;
}) {
  const subject = await ensureProductSubject({ id: input.product.id, name: input.product.input.name });
  const questions = buildFirmProductQuestions(input.product.input.utilityKeys);
  const answers = Object.fromEntries(
    questions.map((question, index) => [
      question.id,
      deterministicAnswer(
        (input.firm.scoreTarget + input.product.input.scoreTarget) / 2,
        index,
        input.relationshipIndex
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

async function loadFirmAlignmentModules(client: DemoSeedClient) {
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
      const seededProduct = await ensureProduct(client, {
        vendor,
        vendorCompanyId: seededVendor.company.id,
        vendorProfileId: seededVendor.vendorProfile.id,
        product,
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
