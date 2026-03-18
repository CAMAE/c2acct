import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  LAUNCH_BADGES,
  LAUNCH_COMPANY,
  LAUNCH_INSIGHTS,
  LAUNCH_MODULES,
  LAUNCH_OWNER_FALLBACK_EMAIL,
} from "../lib/launch-config";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();
const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function requireEnv(name: (typeof REQUIRED_ENV_VARS)[number]) {
  const value = process.env[name]?.trim();
  if (!value) {
    fail(`Missing required env var: ${name}`);
  }
  return value;
}

function validateEnvContract() {
  const databaseUrl = requireEnv("DATABASE_URL");
  const authUrl = requireEnv("AUTH_URL");
  requireEnv("AUTH_SECRET");
  requireEnv("AUTH_GITHUB_ID");
  requireEnv("AUTH_GITHUB_SECRET");

  if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    fail("DATABASE_URL must start with postgres:// or postgresql://");
  }

  if (!/^https?:\/\//i.test(authUrl)) {
    fail("AUTH_URL must be an absolute http(s) URL");
  }
}

async function main() {
  validateEnvContract();

  const company = await prisma.company.findUnique({
    where: { id: LAUNCH_COMPANY.id },
    select: { id: true, name: true },
  });
  if (!company) fail(`Launch company missing: ${LAUNCH_COMPANY.id}`);

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase() || LAUNCH_OWNER_FALLBACK_EMAIL;
  const owner = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    select: { id: true, email: true, companyId: true, role: true },
  });
  if (!owner) fail(`Launch owner missing: ${ownerEmail}`);
  if (owner.companyId !== company.id) fail(`Launch owner is not attached to ${company.id}`);

  const moduleSummaries = [];
  for (const moduleDef of [LAUNCH_MODULES.firm, LAUNCH_MODULES.product]) {
    const moduleRecord = await prisma.surveyModule.findUnique({
      where: { key: moduleDef.key },
      select: { id: true, key: true, scope: true, active: true, version: true },
    });
    if (!moduleRecord) fail(`SurveyModule missing: ${moduleDef.key}`);
    if (!moduleRecord.active) fail(`SurveyModule inactive: ${moduleDef.key}`);

    const questionCount = await prisma.surveyQuestion.count({
      where: { moduleId: moduleRecord.id },
    });
    if (questionCount < moduleDef.questions.length) {
      fail(`SurveyModule ${moduleDef.key} has ${questionCount} questions; expected at least ${moduleDef.questions.length}`);
    }

    moduleSummaries.push({ ...moduleRecord, questionCount });
  }

  const firmModule = moduleSummaries.find((moduleRecord) => moduleRecord.key === LAUNCH_MODULES.firm.key);
  const productModule = moduleSummaries.find((moduleRecord) => moduleRecord.key === LAUNCH_MODULES.product.key);
  if (!firmModule || !productModule) fail("Launch module verification did not resolve both required modules.");

  const badgeSummaries = [];
  for (const [badgeKey, badgeDef] of Object.entries(LAUNCH_BADGES)) {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeDef.id },
      select: { id: true, name: true },
    });
    if (!badge) fail(`Badge missing: ${badgeDef.id}`);
    if (badge.name !== badgeDef.name) fail(`Badge name drift for ${badgeDef.id}: expected "${badgeDef.name}" got "${badge.name}"`);

    const moduleId = badgeKey === "tier1" ? firmModule.id : productModule.id;
    const rule = await prisma.badgeRule.findUnique({
      where: { badgeId_moduleId: { badgeId: badge.id, moduleId } },
      select: { id: true, required: true, minScore: true },
    });
    if (!rule) fail(`BadgeRule missing for badge=${badge.id} module=${moduleId}`);

    badgeSummaries.push({ badge, rule });
  }

  const expectedInsightKeys = [...LAUNCH_INSIGHTS.firm, ...LAUNCH_INSIGHTS.product].map((insight) => insight.key);
  const activeInsights = await prisma.insight.findMany({
    where: { key: { in: expectedInsightKeys }, active: true },
    select: { key: true },
  });
  const presentInsightKeys = new Set(activeInsights.map((insight) => insight.key));
  const missingInsightKeys = expectedInsightKeys.filter((key) => !presentInsightKeys.has(key));
  if (missingInsightKeys.length > 0) fail(`Insights missing: ${missingInsightKeys.join(", ")}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        company,
        owner,
        moduleSummaries,
        badgeSummaries,
        insightCount: activeInsights.length,
        usingFallbackOwnerEmail: ownerEmail === LAUNCH_OWNER_FALLBACK_EMAIL,
      },
      null,
      2
    )
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Missing required env var:")) {
      console.error("VERIFY_LAUNCH_BOOTSTRAP_ERROR", message);
    } else if (message.includes("DATABASE_URL must start")) {
      console.error("VERIFY_LAUNCH_BOOTSTRAP_ERROR", message);
    } else if (message.includes("AUTH_URL must be an absolute")) {
      console.error("VERIFY_LAUNCH_BOOTSTRAP_ERROR", message);
    } else if (message.includes("Can't reach database server")) {
      console.error(
        "VERIFY_LAUNCH_BOOTSTRAP_ERROR Launch verification could not reach the database. Check DATABASE_URL in .env.local and make sure Postgres is listening on localhost:5433."
      );
    } else {
      console.error("VERIFY_LAUNCH_BOOTSTRAP_ERROR", message);
    }
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  });
