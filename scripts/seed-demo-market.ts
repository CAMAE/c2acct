import dotenv from "dotenv";
import {
  CapabilityLevel,
  CapabilityScope,
  CompanyType,
  ModuleAxis,
  ModuleScope,
  PrismaClient,
  ProductKind,
  QuestionInputType,
} from "@prisma/client";
import { computeScore } from "../lib/scoring.ts";
import { evaluateSignalIntegrity } from "../lib/signalIntegrity.ts";
import { buildTargetScopeKey } from "../lib/targetScopeKey.ts";
import { LAUNCH_BADGES, LAUNCH_INSIGHTS, LAUNCH_MODULES } from "../lib/launch-config.ts";
import { STAGED_FIRM_MODULES } from "../lib/staged-firm-taxonomy.ts";

dotenv.config({ path: ".env.local" });
const prisma = new PrismaClient();
const RESET = process.env.AAE_DEMO_RESET === "1";
const P = "demo-market";
const FIRM_BASELINE_MODULE_KEY = "firm_alignment_v1";
const PRODUCT_BASELINE_MODULE_KEY = "vendor_product_fit_v1";
const PRODUCT_EXTERNAL_REVIEW_MODULE_KEY = "product_workflow_fit_review_v1";
const ACTIVATED_BETA_FIRM_MODULE_KEY = "firm_operating_model_commercial_v1";
const n = (v: number) => String(v).padStart(2, "0");
const id = (...parts: Array<string | number>) => [P, ...parts].join("-");
const companySegment = (index: number) => (index % 10 < 3 ? "weak" : index % 10 < 7 ? "mid" : "strong");
const productSegment = (index: number) => (index % 9 < 3 ? "weak" : index % 9 < 6 ? "mid" : "strong");

const vendors = Array.from({ length: 10 }, (_, i) => ({
  id: id("vendor", n(i + 1)),
  slug: `${P}-vendor-${n(i + 1)}`,
  name: `Vendor ${n(i + 1)} Labs`,
}));

const firms = Array.from({ length: 100 }, (_, i) => ({
  id: id("firm", n(i + 1)),
  slug: `${P}-firm-${n(i + 1)}`,
  name: `Northstar Advisory ${n(i + 1)}`,
}));

const products = vendors.flatMap((vendor, i) =>
  Array.from({ length: 3 + (i % 3) }, (_, j) => ({
    id: id("product", n(i + 1), n(j + 1)),
    companyId: vendor.id,
    slug: `${vendor.slug}-product-${n(j + 1)}`,
    name: `${vendor.name.replace(" Labs", "")} Product ${j + 1}`,
    productKind: j === 0 ? ProductKind.PLATFORM : ProductKind.POINT_SOLUTION,
  }))
);

const CAPABILITY_CATALOG = [
  { key: "cap_alignment_basics", title: "Alignment Basics", scope: "FIRM", level: "TIER1", active: true },
  { key: "cap_alignment_advanced", title: "Alignment Advanced", scope: "FIRM", level: "TIER1", active: true },
  ...STAGED_FIRM_MODULES.flatMap((m) => m.domains).filter((v, i, a) => a.indexOf(v) === i).map((key) => ({ key: `cap_${key}`, title: key.split("_").map((part) => part[0]!.toUpperCase() + part.slice(1)).join(" "), scope: "FIRM", level: "TIER1", active: true })),
  { key: "cap_product_positioning", title: "Product Positioning", scope: "PRODUCT", level: "TIER1", active: true },
  { key: "cap_product_onboarding", title: "Product Onboarding", scope: "PRODUCT", level: "TIER1", active: true },
  { key: "cap_product_integration", title: "Product Integration", scope: "PRODUCT", level: "TIER1", active: true },
  { key: "cap_product_support", title: "Product Support Confidence", scope: "PRODUCT", level: "TIER1", active: true },
] as const;

const MODULE_CAPABILITY_REGISTRY = [
  { moduleKey: FIRM_BASELINE_MODULE_KEY, capabilityKeys: ["cap_alignment_basics", "cap_alignment_advanced"] },
  { moduleKey: PRODUCT_BASELINE_MODULE_KEY, capabilityKeys: ["cap_product_positioning", "cap_product_onboarding", "cap_product_integration", "cap_product_support"] },
  { moduleKey: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY, capabilityKeys: ["cap_product_positioning", "cap_product_onboarding", "cap_product_integration", "cap_product_support"] },
  ...STAGED_FIRM_MODULES.map((m) => ({ moduleKey: m.key, capabilityKeys: m.domains.map((d) => `cap_${d}`) })),
] as const;

const QUESTION_CAPABILITY_REGISTRY = [
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "alignment_q1", capabilityKeys: ["cap_alignment_basics"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "leadership_vision_alignment", capabilityKeys: ["cap_alignment_basics"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "alignment_q2", capabilityKeys: ["cap_alignment_basics"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "strategy_execution_clarity", capabilityKeys: ["cap_alignment_basics"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "alignment_q3", capabilityKeys: ["cap_alignment_advanced"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "decision_rights_defined", capabilityKeys: ["cap_alignment_basics"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "kpi_alignment", capabilityKeys: ["cap_alignment_advanced"] },
  { moduleKey: FIRM_BASELINE_MODULE_KEY, questionKey: "operating_rhythm", capabilityKeys: ["cap_alignment_advanced"] },
  { moduleKey: PRODUCT_BASELINE_MODULE_KEY, questionKey: "product_fit_q1", capabilityKeys: ["cap_product_positioning"] },
  { moduleKey: PRODUCT_BASELINE_MODULE_KEY, questionKey: "product_fit_q2", capabilityKeys: ["cap_product_onboarding"] },
  { moduleKey: PRODUCT_BASELINE_MODULE_KEY, questionKey: "product_fit_q3", capabilityKeys: ["cap_product_integration"] },
  { moduleKey: PRODUCT_BASELINE_MODULE_KEY, questionKey: "product_fit_q4", capabilityKeys: ["cap_product_support"] },
  ...STAGED_FIRM_MODULES.flatMap((m) => m.questions.map((q) => ({ moduleKey: m.key, questionKey: q.key, capabilityKeys: [`cap_${q.domainKey}`] }))),
] as const;

const INSIGHT_UNLOCK_CONFIG = [
  ...LAUNCH_INSIGHTS.firm.map((insight) => ({ insightKey: insight.key, badgeId: LAUNCH_BADGES.tier1.id, capabilityKeys: ["cap_alignment_basics", "cap_alignment_advanced"], minScore: 0 })),
  { insightKey: "product_positioning_clarity", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_positioning"], minScore: 0 },
  { insightKey: "product_workflow_fit_snapshot", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_positioning", "cap_product_onboarding"], minScore: 0 },
  { insightKey: "product_integration_readiness", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_integration"], minScore: 0 },
  { insightKey: "product_onboarding_friction_estimate", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_onboarding"], minScore: 0 },
  { insightKey: "product_support_confidence_signal", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_support"], minScore: 0 },
  { insightKey: "product_gtm_readiness_summary", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_positioning", "cap_product_onboarding", "cap_product_integration", "cap_product_support"], minScore: 0 },
  { insightKey: "product_improvement_priorities", badgeId: LAUNCH_BADGES.product.id, capabilityKeys: ["cap_product_positioning", "cap_product_onboarding", "cap_product_integration", "cap_product_support"], minScore: 0 },
] as const;

async function upsertCore() {
  for (const vendor of vendors) {
    await prisma.company.upsert({
      where: { id: vendor.id },
      update: { ...vendor, type: CompanyType.VENDOR, updatedAt: new Date(), primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
      create: { ...vendor, type: CompanyType.VENDOR, updatedAt: new Date(), primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
    });
  }
  for (const firm of firms) {
    await prisma.company.upsert({
      where: { id: firm.id },
      update: { ...firm, type: CompanyType.FIRM, updatedAt: new Date(), primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
      create: { ...firm, type: CompanyType.FIRM, updatedAt: new Date(), primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
    });
  }
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { ...product, updatedAt: new Date(), category: "Accounting", primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
      create: { ...product, updatedAt: new Date(), category: "Accounting", primaryMarket: "ACCOUNTING", verticalKey: "ACCOUNTING", profileStatus: "PUBLISHED", externalStatus: "SEEDED" },
    });
  }
}

async function upsertModules() {
  const defs = [
    { key: LAUNCH_MODULES.firm.key, title: LAUNCH_MODULES.firm.title, description: LAUNCH_MODULES.firm.description, scope: ModuleScope.FIRM, axis: ModuleAxis.SELF, active: true, questions: [...LAUNCH_MODULES.firm.questions, { key: "leadership_vision_alignment", prompt: "How aligned is leadership around the operating vision?", order: 4 }, { key: "strategy_execution_clarity", prompt: "How clearly does strategy translate into execution decisions?", order: 5 }, { key: "decision_rights_defined", prompt: "How clearly are decision rights defined across the firm?", order: 6 }, { key: "kpi_alignment", prompt: "How well do KPIs reflect the intended operating model?", order: 7 }, { key: "operating_rhythm", prompt: "How effective is the firm's operating rhythm for issue resolution?", order: 8 }] },
    { key: LAUNCH_MODULES.product.key, title: LAUNCH_MODULES.product.title, description: LAUNCH_MODULES.product.description, scope: ModuleScope.PRODUCT, axis: ModuleAxis.SELF, active: true, questions: LAUNCH_MODULES.product.questions },
    { key: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY, title: "Product Workflow Fit External Review", description: "External review source for product workflow fit intelligence.", scope: ModuleScope.PRODUCT, axis: ModuleAxis.EXTERNAL_REVIEW, active: true, questions: LAUNCH_MODULES.product.questions.map((q) => ({ ...q, prompt: `${q.prompt} (external review)` })) },
    ...STAGED_FIRM_MODULES.map((m) => ({ key: m.key, title: m.title, description: m.description, scope: ModuleScope.FIRM, axis: ModuleAxis.SELF, active: m.key === ACTIVATED_BETA_FIRM_MODULE_KEY, questions: m.questions.map((q) => ({ key: q.key, prompt: q.prompt, order: q.order, meta: { domainKey: q.domainKey, staged: true } })) })),
  ];
  const map = new Map<string, string>();
  for (const def of defs) {
    const row = await prisma.surveyModule.upsert({
      where: { key: def.key },
      update: { title: def.title, description: def.description, scope: def.scope, axis: def.axis, active: def.active, version: 1, weight: 1, updatedAt: new Date() },
      create: { id: id("module", def.key), key: def.key, title: def.title, description: def.description, scope: def.scope, axis: def.axis, active: def.active, version: 1, weight: 1, updatedAt: new Date() },
      select: { id: true, key: true },
    });
    map.set(row.key, row.id);
    for (const q of def.questions) {
      await prisma.surveyQuestion.upsert({
        where: { id: id("question", def.key, q.key) },
        update: { moduleId: row.id, prompt: q.prompt, order: q.order, inputType: QuestionInputType.SLIDER, required: true, weight: 1, meta: "meta" in q ? q.meta ?? null : null, updatedAt: new Date() },
        create: { id: id("question", def.key, q.key), moduleId: row.id, key: q.key, prompt: q.prompt, order: q.order, inputType: QuestionInputType.SLIDER, required: true, weight: 1, meta: "meta" in q ? q.meta ?? null : null, updatedAt: new Date() },
      });
    }
  }
  return map;
}

async function upsertMappings(moduleIds: Map<string, string>) {
  for (const cap of CAPABILITY_CATALOG) {
    await prisma.capabilityNode.upsert({
      where: { key: cap.key },
      update: { title: cap.title, scope: cap.scope === "FIRM" ? CapabilityScope.FIRM : CapabilityScope.PRODUCT, level: cap.level === "TIER1" ? CapabilityLevel.TIER1 : cap.level === "TIER2" ? CapabilityLevel.TIER2 : CapabilityLevel.TIER3, active: cap.active, weight: 1, updatedAt: new Date() },
      create: { id: id("capability", cap.key), key: cap.key, title: cap.title, scope: cap.scope === "FIRM" ? CapabilityScope.FIRM : CapabilityScope.PRODUCT, level: cap.level === "TIER1" ? CapabilityLevel.TIER1 : cap.level === "TIER2" ? CapabilityLevel.TIER2 : CapabilityLevel.TIER3, active: cap.active, weight: 1, updatedAt: new Date() },
    });
  }
  const capIds = new Map((await prisma.capabilityNode.findMany({ where: { key: { in: CAPABILITY_CATALOG.map((c) => c.key) } }, select: { id: true, key: true } })).map((r) => [r.key, r.id]));
  const qRows = await prisma.surveyQuestion.findMany({ select: { id: true, key: true, moduleId: true } });
  const qIds = new Map(qRows.map((q) => [`${q.moduleId}:${q.key}`, q.id]));
  for (const entry of MODULE_CAPABILITY_REGISTRY) {
    const moduleId = moduleIds.get(entry.moduleKey);
    if (!moduleId) continue;
    for (const capKey of entry.capabilityKeys) {
      const nodeId = capIds.get(capKey);
      if (!nodeId) throw new Error(`Missing capability ${capKey}`);
      await prisma.moduleCapability.upsert({
        where: { moduleId_nodeId: { moduleId, nodeId } },
        update: { weight: 1 },
        create: { id: id("module-capability", entry.moduleKey, capKey), moduleId, nodeId, weight: 1 },
      });
    }
  }
  for (const entry of QUESTION_CAPABILITY_REGISTRY) {
    const moduleId = moduleIds.get(entry.moduleKey);
    const nodeId = capIds.get(entry.capabilityKeys[0]);
    if (!moduleId || !nodeId) continue;
    const questionId = qIds.get(`${moduleId}:${entry.questionKey}`);
    if (!questionId) throw new Error(`Missing question ${entry.moduleKey}:${entry.questionKey}`);
    for (const capKey of entry.capabilityKeys) {
      const mappedNodeId = capIds.get(capKey);
      if (!mappedNodeId) continue;
      await prisma.surveyQuestionCapability.upsert({
        where: { questionId_nodeId: { questionId, nodeId: mappedNodeId } },
        update: { weight: 1 },
        create: { id: id("question-capability", entry.moduleKey, entry.questionKey, capKey), questionId, nodeId: mappedNodeId, weight: 1 },
      });
    }
  }
}

async function upsertInsightsAndBadges(moduleIds: Map<string, string>) {
  for (const insight of [...LAUNCH_INSIGHTS.firm, ...LAUNCH_INSIGHTS.product]) {
    await prisma.insight.upsert({
      where: { key: insight.key },
      update: { title: insight.title, body: insight.body, tier: insight.tier, active: true, updatedAt: new Date() },
      create: { id: id("insight", insight.key), key: insight.key, title: insight.title, body: insight.body, tier: insight.tier, active: true, updatedAt: new Date() },
    });
  }
  const insightIds = new Map((await prisma.insight.findMany({ where: { key: { in: INSIGHT_UNLOCK_CONFIG.map((v) => v.insightKey) } }, select: { id: true, key: true } })).map((r) => [r.key, r.id]));
  const capIds = new Map((await prisma.capabilityNode.findMany({ where: { key: { in: [...new Set(INSIGHT_UNLOCK_CONFIG.flatMap((v) => v.capabilityKeys))] } }, select: { id: true, key: true } })).map((r) => [r.key, r.id]));
  for (const entry of INSIGHT_UNLOCK_CONFIG) {
    const insightId = insightIds.get(entry.insightKey);
    if (!insightId) continue;
    for (const capKey of entry.capabilityKeys) {
      const nodeId = capIds.get(capKey);
      if (!nodeId) continue;
      await prisma.insightCapabilityRule.upsert({
        where: { insightId_nodeId: { insightId, nodeId } },
        update: { minScore: entry.minScore, required: true, updatedAt: new Date() },
        create: { id: id("insight-rule", entry.insightKey, capKey), insightId, nodeId, minScore: entry.minScore, required: true, updatedAt: new Date() },
      });
    }
  }
  await prisma.badge.upsert({ where: { id: LAUNCH_BADGES.tier1.id }, update: { name: LAUNCH_BADGES.tier1.name, updatedAt: new Date() }, create: { id: LAUNCH_BADGES.tier1.id, name: LAUNCH_BADGES.tier1.name, updatedAt: new Date() } });
  await prisma.badge.upsert({ where: { id: LAUNCH_BADGES.product.id }, update: { name: LAUNCH_BADGES.product.name, updatedAt: new Date() }, create: { id: LAUNCH_BADGES.product.id, name: LAUNCH_BADGES.product.name, updatedAt: new Date() } });
  await prisma.badgeRule.upsert({
    where: { badgeId_moduleId: { badgeId: LAUNCH_BADGES.tier1.id, moduleId: moduleIds.get(FIRM_BASELINE_MODULE_KEY)! } },
    update: { minScore: LAUNCH_BADGES.tier1.minScore, required: true },
    create: { id: id("badge-rule", "firm"), badgeId: LAUNCH_BADGES.tier1.id, moduleId: moduleIds.get(FIRM_BASELINE_MODULE_KEY)!, minScore: LAUNCH_BADGES.tier1.minScore, required: true },
  });
  await prisma.badgeRule.upsert({
    where: { badgeId_moduleId: { badgeId: LAUNCH_BADGES.product.id, moduleId: moduleIds.get(PRODUCT_BASELINE_MODULE_KEY)! } },
    update: { minScore: LAUNCH_BADGES.product.minScore, required: true },
    create: { id: id("badge-rule", "product"), badgeId: LAUNCH_BADGES.product.id, moduleId: moduleIds.get(PRODUCT_BASELINE_MODULE_KEY)!, minScore: LAUNCH_BADGES.product.minScore, required: true },
  });
}

async function award(companyId: string, productId: string | null, moduleId: string, badgeId: string, submissionId: string, score: number) {
  const targetScopeKey = buildTargetScopeKey({ companyId, productId });
  await prisma.companyBadge.upsert({
    where: { targetScopeKey_badgeId_moduleId: { targetScopeKey, badgeId, moduleId } },
    update: { companyId, productId, awardedAt: new Date() },
    create: { id: id("company-badge", targetScopeKey, badgeId, moduleId), companyId, productId, targetScopeKey, badgeId, moduleId },
  });
  const row = await prisma.companyBadge.findUniqueOrThrow({ where: { targetScopeKey_badgeId_moduleId: { targetScopeKey, badgeId, moduleId } }, select: { id: true } });
  const existing = await prisma.unlockEvidence.findFirst({ where: { companyBadgeId: row.id, ruleKey: "badge_rule_min_score" }, select: { id: true } });
  if (!existing) {
    await prisma.unlockEvidence.create({
      data: {
        id: id("unlock-evidence", row.id, "badge"),
        companyBadgeId: row.id,
        sourceType: "SELF_SUBMISSION",
        surveySubmissionId: submissionId,
        ruleKey: "badge_rule_min_score",
        detailsJson: { moduleId, badgeId, requiredMinScore: 1, achievedScore: score },
      },
    });
  }
}

async function persistCapabilityScores(companyId: string, productId: string | null, moduleId: string, submissionId: string, answers: Record<string, number>, scoreVersion: number) {
  const targetScopeKey = buildTargetScopeKey({ companyId, productId });
  const questions = await prisma.surveyQuestion.findMany({
    where: { moduleId },
    select: { id: true, SurveyQuestionCapability: { select: { nodeId: true } } },
  });
  const grouped = new Map<string, Record<string, number>>();
  for (const question of questions) {
    const answer = answers[question.id];
    if (typeof answer !== "number") continue;
    for (const mapping of question.SurveyQuestionCapability) {
      const bucket = grouped.get(mapping.nodeId) ?? {};
      bucket[question.id] = answer;
      grouped.set(mapping.nodeId, bucket);
    }
  }
  for (const [nodeId, nodeAnswers] of grouped) {
    const scoring = computeScore({ answers: nodeAnswers, scaleMin: 1, scaleMax: 5 });
    await prisma.companyCapabilityScore.upsert({
      where: {
        targetScopeKey_moduleId_nodeId_scoreVersion_sourceType: {
          targetScopeKey,
          moduleId,
          nodeId,
          scoreVersion,
          sourceType: "SELF_SUBMISSION",
        },
      },
      update: { companyId, productId, score: scoring.score, surveySubmissionId: submissionId, computedAt: new Date() },
      create: { id: id("cap-score", targetScopeKey, moduleId, nodeId), companyId, productId, targetScopeKey, moduleId, nodeId, score: scoring.score, scoreVersion, sourceType: "SELF_SUBMISSION", surveySubmissionId: submissionId },
    });
  }
}

async function evaluateInsights(companyId: string, productId: string | null) {
  const moduleKey = productId ? PRODUCT_BASELINE_MODULE_KEY : FIRM_BASELINE_MODULE_KEY;
  const module = await prisma.surveyModule.findUnique({ where: { key: moduleKey }, select: { id: true, key: true } });
  if (!module) return;
  const targetScopeKey = buildTargetScopeKey({ companyId, productId });
  const badges = await prisma.companyBadge.findMany({ where: { companyId, productId, moduleId: module.id }, select: { id: true, badgeId: true } });
  const scoreRows = await prisma.companyCapabilityScore.findMany({
    where: { companyId, productId, moduleId: module.id, sourceType: "SELF_SUBMISSION" },
    select: { score: true, surveySubmissionId: true, CapabilityNode: { select: { key: true } } },
  });
  const scoreMap = new Map(scoreRows.map((row) => [row.CapabilityNode.key, row]));
  const insights = await prisma.insight.findMany({ where: { key: { in: INSIGHT_UNLOCK_CONFIG.map((v) => v.insightKey) } }, select: { id: true, key: true } });
  const insightByKey = new Map(insights.map((row) => [row.key, row.id]));
  for (const config of INSIGHT_UNLOCK_CONFIG.filter((entry) => (productId ? entry.badgeId === LAUNCH_BADGES.product.id : entry.badgeId === LAUNCH_BADGES.tier1.id))) {
    if (!badges.find((badge) => badge.badgeId === config.badgeId)) continue;
    if (!config.capabilityKeys.every((key) => (scoreMap.get(key)?.score ?? -1) >= config.minScore)) continue;
    const companyBadgeId = badges.find((badge) => badge.badgeId === config.badgeId)!.id;
    const existing = await prisma.unlockEvidence.findFirst({ where: { companyBadgeId, ruleKey: `insight_unlock:${config.insightKey}` }, select: { id: true } });
    const surveySubmissionId = config.capabilityKeys.map((key) => scoreMap.get(key)?.surveySubmissionId ?? null).find(Boolean) ?? null;
    const detailsJson = { insightKey: config.insightKey, targetScopeKey, moduleKey: module.key, capabilityEvidence: config.capabilityKeys.map((key) => ({ capabilityKey: key, score: scoreMap.get(key)?.score ?? null })) };
    if (existing) {
      await prisma.unlockEvidence.update({ where: { id: existing.id }, data: { sourceType: "SELF_SUBMISSION", surveySubmissionId, detailsJson } });
    } else {
      await prisma.unlockEvidence.create({ data: { id: id("unlock-evidence", companyBadgeId, config.insightKey), companyBadgeId, sourceType: "SELF_SUBMISSION", surveySubmissionId, ruleKey: `insight_unlock:${config.insightKey}`, detailsJson } });
    }
    if (!insightByKey.get(config.insightKey)) continue;
  }
}

async function createSubmission(companyId: string, productId: string | null, moduleKey: string, answers: Record<string, number>, createdAt: Date) {
  const module = await prisma.surveyModule.findUniqueOrThrow({ where: { key: moduleKey }, select: { id: true, key: true } });
  const scoring = computeScore({ answers, scaleMin: 1, scaleMax: 5 });
  const integrity = evaluateSignalIntegrity(answers, { expectedQuestionCount: Object.keys(answers).length, scaleMin: 1, scaleMax: 5 });
  const submission = await prisma.surveySubmission.upsert({
    where: { id: id("submission", companyId, productId ?? "company", moduleKey) },
    update: { answers, score: scoring.score, weightedAvg: scoring.weightedAvg, answeredCount: scoring.answeredCount, totalWeight: scoring.totalWeight, signalIntegrityScore: integrity.score, integrityFlags: integrity.flags, createdAt },
    create: { id: id("submission", companyId, productId ?? "company", moduleKey), version: 1, companyId, productId, moduleId: module.id, answers, score: scoring.score, weightedAvg: scoring.weightedAvg, answeredCount: scoring.answeredCount, totalWeight: scoring.totalWeight, scaleMin: 1, scaleMax: 5, scoreVersion: 1, signalIntegrityScore: integrity.score, integrityFlags: integrity.flags, createdAt },
  });
  await persistCapabilityScores(companyId, productId, module.id, submission.id, answers, 1);
  return { submission, moduleId: module.id, score: scoring.score };
}

async function questionsFor(moduleKey: string) {
  const module = await prisma.surveyModule.findUniqueOrThrow({ where: { key: moduleKey }, select: { id: true } });
  return prisma.surveyQuestion.findMany({ where: { moduleId: module.id }, orderBy: { order: "asc" }, select: { id: true, order: true } });
}

function requireModuleId(moduleIds: Map<string, string>, moduleKey: string) {
  const moduleId = moduleIds.get(moduleKey);
  if (!moduleId) {
    throw new Error(`Missing SurveyModule for module key: ${moduleKey}`);
  }
  return moduleId;
}

function answerForSegment(segment: "weak" | "mid" | "strong", order: number, offset: number) {
  if (segment === "weak") return order % 2 === 0 ? 1 : 2;
  if (segment === "mid") return 2 + ((order + offset) % 2);
  return 4 + ((order + offset) % 2);
}

async function seedSignals(moduleIds: Map<string, string>) {
  const firmQuestions = await questionsFor(FIRM_BASELINE_MODULE_KEY);
  const productQuestions = await questionsFor(PRODUCT_BASELINE_MODULE_KEY);
  const externalReviewModuleId = requireModuleId(moduleIds, PRODUCT_EXTERNAL_REVIEW_MODULE_KEY);
  for (const [i, firm] of firms.entries()) {
    const segment = companySegment(i);
    const answers = Object.fromEntries(firmQuestions.map((q) => [q.id, answerForSegment(segment, q.order, i)]));
    const row = await createSubmission(firm.id, null, FIRM_BASELINE_MODULE_KEY, answers, new Date(Date.now() - i * 60_000));
    if (row.score >= 1) await award(firm.id, null, row.moduleId, LAUNCH_BADGES.tier1.id, row.submission.id, row.score);
    for (const staged of STAGED_FIRM_MODULES) {
      const stagedQuestions = await questionsFor(staged.key);
      const stagedAnswers = Object.fromEntries(stagedQuestions.map((q) => [q.id, answerForSegment(segment, q.order, i + 1)]));
      await createSubmission(firm.id, null, staged.key, stagedAnswers, new Date(Date.now() - i * 60_000 - 1_000));
    }
    const maturityScore = segment === "weak" ? 24 + (i % 8) : segment === "mid" ? 52 + (i % 10) : 78 + (i % 12);
    const maturityTier = segment === "weak" ? "FOUNDATIONAL" : segment === "mid" ? "SCALING" : "ADVANCED";
    const bandMin = segment === "weak" ? 0 : segment === "mid" ? 50 : 75;
    const bandMax = segment === "weak" ? 49 : segment === "mid" ? 74 : 100;
    await prisma.firmMaturityIndex.upsert({ where: { companyId_version: { companyId: firm.id, version: 1 } }, update: { score: maturityScore, tier: maturityTier, bandMin, bandMax, computedAt: new Date() }, create: { id: id("fmi", firm.id), companyId: firm.id, score: maturityScore, tier: maturityTier, bandMin, bandMax, version: 1, computedAt: new Date() } });
    await prisma.firmMaturitySnapshot.upsert({ where: { id: id("fmi-snapshot", firm.id) }, update: { score: maturityScore, tier: maturityTier, bandMin, bandMax, computedAt: new Date() }, create: { id: id("fmi-snapshot", firm.id), companyId: firm.id, score: maturityScore, tier: maturityTier, bandMin, bandMax, version: 1, computedAt: new Date() } });
    await prisma.firmMaturityMomentum.upsert({ where: { companyId_version: { companyId: firm.id, version: 1 } }, update: { trend: segment === "strong" ? "UP" : "FLAT", velocity: segment === "strong" ? "ACCELERATING" : "STABLE", stability: segment === "weak" ? "VARIABLE" : "STABLE", avgDelta: segment === "weak" ? 0.2 : segment === "mid" ? 0.9 : 1.8, computedAt: new Date() }, create: { id: id("fmi-momentum", firm.id), companyId: firm.id, version: 1, delta1: segment === "strong" ? 2 : segment === "mid" ? 1 : 0, delta2: segment === "strong" ? 1 : 0, accel: segment === "strong" ? 0.7 : 0.2, avgDelta: segment === "weak" ? 0.2 : segment === "mid" ? 0.9 : 1.8, volatility: segment === "weak" ? 1.1 : 0.5, trend: segment === "strong" ? "UP" : "FLAT", velocity: segment === "strong" ? "ACCELERATING" : "STABLE", stability: segment === "weak" ? "VARIABLE" : "STABLE", computedAt: new Date() } });
  }
  for (const [i, product] of products.entries()) {
    const segment = productSegment(i);
    const answers = Object.fromEntries(productQuestions.map((q) => [q.id, answerForSegment(segment, q.order, i)]));
    const row = await createSubmission(product.companyId, product.id, PRODUCT_BASELINE_MODULE_KEY, answers, new Date(Date.now() - i * 30_000));
    if (row.score >= 1) await award(product.companyId, product.id, row.moduleId, LAUNCH_BADGES.product.id, row.submission.id, row.score);
    if (!externalReviewModuleId) {
      throw new Error(`Missing SurveyModule for module key: ${PRODUCT_EXTERNAL_REVIEW_MODULE_KEY}`);
    }
    await prisma.externalReviewSubmission.upsert({
      where: { id: id("external-review", product.id) },
      update: { reviewerCompanyId: firms[i % firms.length].id, subjectCompanyId: product.companyId, subjectProductId: product.id, moduleId: externalReviewModuleId, answers: { reviewer: segment === "weak" ? 2 : segment === "mid" ? 3 : 5 }, score: segment === "weak" ? 32 + (i % 8) : segment === "mid" ? 56 + (i % 10) : 80 + (i % 10), weightedAvg: segment === "weak" ? 1.8 : segment === "mid" ? 3 : 4.5, scoreVersion: 1, signalIntegrityScore: 0.92, reviewStatus: "FINALIZED", updatedAt: new Date() },
      create: { id: id("external-review", product.id), reviewerCompanyId: firms[i % firms.length].id, subjectCompanyId: product.companyId, subjectProductId: product.id, moduleId: externalReviewModuleId, answers: { reviewer: segment === "weak" ? 2 : segment === "mid" ? 3 : 5 }, normalizedDimensions: { workflowFit: segment === "weak" ? 35 + (i % 10) : segment === "mid" ? 58 + (i % 10) : 82 + (i % 10) }, score: segment === "weak" ? 32 + (i % 8) : segment === "mid" ? 56 + (i % 10) : 80 + (i % 10), weightedAvg: segment === "weak" ? 1.8 : segment === "mid" ? 3 : 4.5, scoreVersion: 1, signalIntegrityScore: 0.92, reviewStatus: "FINALIZED" },
    });
    await prisma.externalObservedSignalRollup.upsert({
      where: { targetScopeKey_moduleId_rollupVersion: { targetScopeKey: buildTargetScopeKey({ companyId: product.companyId, productId: product.id }), moduleId: externalReviewModuleId, rollupVersion: 1 } },
      update: { reviewCount: 3, scoreAvg: segment === "weak" ? 32 + (i % 8) : segment === "mid" ? 56 + (i % 10) : 80 + (i % 10), weightedAvgAvg: segment === "weak" ? 1.8 : segment === "mid" ? 3 : 4.5, signalIntegrityAvg: 0.91, latestReviewAt: new Date() },
      create: { id: id("rollup", product.id), moduleId: externalReviewModuleId, subjectCompanyId: product.companyId, subjectProductId: product.id, targetScopeKey: buildTargetScopeKey({ companyId: product.companyId, productId: product.id }), reviewCount: 3, scoreAvg: segment === "weak" ? 32 + (i % 8) : segment === "mid" ? 56 + (i % 10) : 80 + (i % 10), weightedAvgAvg: segment === "weak" ? 1.8 : segment === "mid" ? 3 : 4.5, signalIntegrityAvg: 0.91, latestReviewAt: new Date(), rollupVersion: 1 },
    });
  }
}

async function seedBenchmarks() {
  const cohorts = [
    { id: id("cohort", "firms"), key: `${P}_firms`, title: "Demo Market Firms", companyType: CompanyType.FIRM },
    { id: id("cohort", "vendors"), key: `${P}_vendors`, title: "Demo Market Vendors", companyType: CompanyType.VENDOR },
    { id: id("cohort", "products"), key: `${P}_products`, title: "Demo Market Products", companyType: CompanyType.VENDOR },
  ];
  for (const cohort of cohorts) {
    await prisma.benchmarkCohort.upsert({
      where: { key: cohort.key },
      update: { title: cohort.title, companyType: cohort.companyType, updatedAt: new Date() },
      create: { ...cohort, updatedAt: new Date() },
    });
  }
  for (const [i, firm] of firms.entries()) {
    await prisma.companyBenchmarkCohort.upsert({ where: { companyId_cohortId: { companyId: firm.id, cohortId: cohorts[0].id } }, update: {}, create: { id: id("company-cohort", firm.id), companyId: firm.id, cohortId: cohorts[0].id } });
    await prisma.companyBenchmark.upsert({ where: { companyId_cohortId_metricKey_version: { companyId: firm.id, cohortId: cohorts[0].id, metricKey: "firm_maturity_index", version: 1 } }, update: { score: 45 + (i % 40), percentile: i + 1, computedAt: new Date() }, create: { id: id("company-benchmark", firm.id), companyId: firm.id, cohortId: cohorts[0].id, metricKey: "firm_maturity_index", version: 1, score: 45 + (i % 40), percentile: i + 1, computedAt: new Date() } });
  }
  for (const [i, vendor] of vendors.entries()) {
    await prisma.companyBenchmarkCohort.upsert({ where: { companyId_cohortId: { companyId: vendor.id, cohortId: cohorts[1].id } }, update: {}, create: { id: id("company-cohort", vendor.id), companyId: vendor.id, cohortId: cohorts[1].id } });
    await prisma.companyBenchmark.upsert({ where: { companyId_cohortId_metricKey_version: { companyId: vendor.id, cohortId: cohorts[1].id, metricKey: "vendor_product_count", version: 1 } }, update: { score: 3 + (i % 3), percentile: 55 + i * 4, computedAt: new Date() }, create: { id: id("company-benchmark", vendor.id), companyId: vendor.id, cohortId: cohorts[1].id, metricKey: "vendor_product_count", version: 1, score: 3 + (i % 3), percentile: 55 + i * 4, computedAt: new Date() } });
  }
  await prisma.benchmarkRun.upsert({ where: { cohortId_metricKey_version: { cohortId: cohorts[0].id, metricKey: "firm_maturity_index", version: 1 } }, update: { n: firms.length, mean: 63, stdev: 11, p10: 40, p25: 51, p50: 64, p75: 75, p90: 87, computedAt: new Date() }, create: { id: id("benchmark-run", "firm"), cohortId: cohorts[0].id, metricKey: "firm_maturity_index", version: 1, n: firms.length, mean: 63, stdev: 11, p10: 40, p25: 51, p50: 64, p75: 75, p90: 87, computedAt: new Date() } });
  await prisma.benchmarkRun.upsert({ where: { cohortId_metricKey_version: { cohortId: cohorts[1].id, metricKey: "vendor_product_count", version: 1 } }, update: { n: vendors.length, mean: 4, stdev: 1, p10: 3, p25: 3, p50: 4, p75: 5, p90: 5, computedAt: new Date() }, create: { id: id("benchmark-run", "vendor"), cohortId: cohorts[1].id, metricKey: "vendor_product_count", version: 1, n: vendors.length, mean: 4, stdev: 1, p10: 3, p25: 3, p50: 4, p75: 5, p90: 5, computedAt: new Date() } });
  await prisma.benchmarkRun.upsert({ where: { cohortId_metricKey_version: { cohortId: cohorts[2].id, metricKey: "product_market_signal", version: 1 } }, update: { n: products.length, mean: 68, stdev: 9, p10: 48, p25: 58, p50: 69, p75: 77, p90: 88, computedAt: new Date() }, create: { id: id("benchmark-run", "product"), cohortId: cohorts[2].id, metricKey: "product_market_signal", version: 1, n: products.length, mean: 68, stdev: 9, p10: 48, p25: 58, p50: 69, p75: 77, p90: 88, computedAt: new Date() } });
}

async function resetDemo() {
  const companyIds = [...vendors.map((v) => v.id), ...firms.map((f) => f.id)];
  const productIds = products.map((p) => p.id);
  const cohortKeys = [`${P}_firms`, `${P}_vendors`, `${P}_products`];
  await prisma.unlockEvidence.deleteMany({ where: { OR: [{ companyBadge: { companyId: { in: companyIds } } }, { surveySubmission: { companyId: { in: companyIds } } }] } });
  await prisma.companyCapabilityScore.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.companyBadge.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.surveySubmission.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.externalObservedSignalRollup.deleteMany({ where: { subjectCompanyId: { in: companyIds } } });
  await prisma.externalReviewSubmission.deleteMany({ where: { OR: [{ reviewerCompanyId: { in: companyIds } }, { subjectCompanyId: { in: companyIds } }] } });
  await prisma.companyBenchmark.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.companyBenchmarkCohort.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.benchmarkRun.deleteMany({ where: { BenchmarkCohort: { key: { in: cohortKeys } } } });
  await prisma.benchmarkCohort.deleteMany({ where: { key: { in: cohortKeys } } });
  await prisma.firmMaturityMomentum.deleteMany({ where: { companyId: { in: firms.map((f) => f.id) } } });
  await prisma.firmMaturitySnapshot.deleteMany({ where: { companyId: { in: firms.map((f) => f.id) } } });
  await prisma.firmMaturityIndex.deleteMany({ where: { companyId: { in: firms.map((f) => f.id) } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
}

async function main() {
  if (RESET) await resetDemo();
  await upsertCore();
  const moduleIds = await upsertModules();
  await upsertMappings(moduleIds);
  await upsertInsightsAndBadges(moduleIds);
  await seedSignals(moduleIds);
  await seedBenchmarks();
  for (const firm of firms) await evaluateInsights(firm.id, null);
  for (const product of products) await evaluateInsights(product.companyId, product.id);
  console.log("DEMO_MARKET_SEED_OK", {
    vendors: vendors.length,
    firms: firms.length,
    products: products.length,
    moduleKeys: [FIRM_BASELINE_MODULE_KEY, PRODUCT_BASELINE_MODULE_KEY, PRODUCT_EXTERNAL_REVIEW_MODULE_KEY, ...STAGED_FIRM_MODULES.map((m) => m.key)],
    badgeNames: [LAUNCH_BADGES.tier1.name, LAUNCH_BADGES.product.name],
    insightKeys: [...LAUNCH_INSIGHTS.firm, ...LAUNCH_INSIGHTS.product].map((v) => v.key),
  });
}

main().then(() => prisma.$disconnect()).catch(async (error) => {
  console.error("DEMO_MARKET_SEED_ERROR", error);
  await prisma.$disconnect();
  process.exit(1);
});
