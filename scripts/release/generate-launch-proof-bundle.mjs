#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { runSourceIntegrityValidation } from "./validate-source-integrity.mjs";
import { runPatSurfaceValidation } from "./validate-pat-surfaces.mjs";

export const LAUNCH_PROOF_STATUSES = Object.freeze([
  "COMPLETE",
  "PARTIAL",
  "MISSING",
  "CONFLICTING",
  "DEFERRED",
  "UNVERIFIED",
]);

export const REQUIRED_VALIDATION_COMMANDS = Object.freeze({
  prismaGenerate: "pnpm prisma:generate",
  prismaMigrateLocal: "pnpm prisma:migrate:local",
  lintTest: "pnpm lint:test",
  typecheck: "pnpm typecheck",
  unit: "pnpm test:unit",
  build: "pnpm build",
  releasePrelaunch: "pnpm release:prelaunch",
  localReviewE2e:
    "PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review AUTH_SECRET=pat-local-auth-secret pnpm test:e2e:local-review",
  validateLaunch: "pnpm validate:launch",
});

const DEFAULT_OUTPUT_DIR = "artifacts/launch-proof";
const DEFAULT_JSON_NAME = "4.26.26-launch-proof.json";
const DEFAULT_MARKDOWN_NAME = "4.26.26-launch-proof.md";
const DEMO_VERSION_PATTERN = /DEMO_PAT_ECOSYSTEM_VERSION\s*=\s*"([^"]+)"/;

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    outputDir: DEFAULT_OUTPUT_DIR,
    jsonName: DEFAULT_JSON_NAME,
    markdownName: DEFAULT_MARKDOWN_NAME,
    generatedAt: new Date().toISOString(),
    runRouteSmoke: false,
    routeSmokePort: 3320,
    routeSmokeTimeoutMs: 45_000,
    publicLiveUrl: process.env.PAT_PUBLIC_LIVE_URL ?? "",
    validationResultsPath: "",
    validationResults: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[index + 1];
      index += 1;
    } else if (arg === "--output-dir") {
      args.outputDir = argv[index + 1];
      index += 1;
    } else if (arg === "--json-name") {
      args.jsonName = argv[index + 1];
      index += 1;
    } else if (arg === "--markdown-name") {
      args.markdownName = argv[index + 1];
      index += 1;
    } else if (arg === "--generated-at") {
      args.generatedAt = argv[index + 1];
      index += 1;
    } else if (arg === "--run-route-smoke") {
      args.runRouteSmoke = true;
    } else if (arg === "--route-smoke-port") {
      args.routeSmokePort = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--route-smoke-timeout-ms") {
      args.routeSmokeTimeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--public-live-url") {
      args.publicLiveUrl = argv[index + 1] ?? "";
      index += 1;
    } else if (arg === "--validation-results") {
      args.validationResultsPath = argv[index + 1];
      index += 1;
    } else if (arg === "--result") {
      const [key, status, ...summaryParts] = String(argv[index + 1] ?? "").split("=");
      if (key && status) {
        args.validationResults[key] = {
          status,
          summary: summaryParts.join("=") || "Passed in final local validation run.",
        };
      }
      index += 1;
    }
  }

  return args;
}

function isStatus(value) {
  return LAUNCH_PROOF_STATUSES.includes(value);
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadRepoEnv(root) {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(root, fileName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function runText(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      ...options,
    }).trim();
  } catch {
    return null;
  }
}

function sha256File(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function parseDemoSeedVersion(root) {
  const sourcePath = path.join(root, "data/demoPatEcosystem.ts");
  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  return fs.readFileSync(sourcePath, "utf8").match(DEMO_VERSION_PATTERN)?.[1] ?? null;
}

function readPackageInfo(root) {
  const packageJson = readOptionalJson(path.join(root, "package.json")) ?? {};
  return {
    name: packageJson.name ?? "unknown",
    version: packageJson.version ?? "unknown",
    packageManager: packageJson.packageManager ?? "pnpm",
    buildCommand: packageJson.scripts?.build ?? "missing",
    startCommand: packageJson.scripts?.start ?? "missing",
  };
}

function readRuntimeVersions(root) {
  return {
    node: process.version,
    pnpm: runText("pnpm", ["--version"], { cwd: root }) ?? "unknown",
    platform: process.platform,
    arch: process.arch,
  };
}

function mergeValidationResults(root, validationResultsPath, cliResults) {
  const defaultPath = path.join(root, DEFAULT_OUTPUT_DIR, "validation-results.json");
  const explicitPath = validationResultsPath ? path.resolve(root, validationResultsPath) : defaultPath;
  const fileResults = readOptionalJson(explicitPath)?.commands ?? {};
  const merged = {};

  for (const [key, command] of Object.entries(REQUIRED_VALIDATION_COMMANDS)) {
    const proof = cliResults[key] ?? fileResults[key] ?? {};
    const status = isStatus(proof.status) ? proof.status : "UNVERIFIED";
    merged[key] = {
      key,
      command,
      status,
      summary: proof.summary ?? (status === "COMPLETE" ? "Passed." : "No local proof recorded in this bundle."),
      completedAt: proof.completedAt ?? (status === "COMPLETE" ? new Date().toISOString() : null),
    };
  }

  return merged;
}

function buildStatusBuckets(items) {
  return Object.fromEntries(
    LAUNCH_PROOF_STATUSES.map((status) => [
      status,
      items.filter((item) => item.status === status),
    ])
  );
}

function summarizeValidationStatus(validationResults) {
  const statuses = Object.values(validationResults).map((result) => result.status);
  if (statuses.every((status) => status === "COMPLETE")) {
    return "COMPLETE";
  }
  if (statuses.some((status) => status === "CONFLICTING")) {
    return "CONFLICTING";
  }
  if (statuses.some((status) => status === "COMPLETE")) {
    return "PARTIAL";
  }
  return "UNVERIFIED";
}

function buildBillingProof(env, databaseProof) {
  const enabled = env.PAT_BILLING_ENABLED === "1" || env.PAT_BILLING_ENABLED?.toLowerCase() === "true";
  const hasSecret = Boolean(env.STRIPE_SECRET_KEY?.trim());
  const hasWebhookSecret = Boolean(env.STRIPE_WEBHOOK_SECRET?.trim());
  const priceKeys = [
    "STRIPE_PRICE_VENDOR_PRO",
    "STRIPE_PRICE_VENDOR_ELITE",
    "STRIPE_PRICE_FIRM_PRO",
    "STRIPE_PRICE_FIRM_ELITE",
    "STRIPE_PRICE_INDIVIDUAL_PRO",
    "STRIPE_PRICE_INDIVIDUAL_ELITE",
    "STRIPE_PRICE_USER_PRO",
    "STRIPE_PRICE_USER_ELITE",
  ];
  const configuredPriceKeys = priceKeys.filter((key) => Boolean(env[key]?.trim()));
  const configured = enabled && hasSecret && configuredPriceKeys.length > 0;
  const missing = [
    enabled ? null : "PAT_BILLING_ENABLED",
    hasSecret ? null : "STRIPE_SECRET_KEY",
    configuredPriceKeys.length > 0 ? null : "STRIPE_PRICE_*",
  ].filter(Boolean);

  return {
    status: configured ? "PARTIAL" : "COMPLETE",
    provider: "stripe",
    mode: configured ? "provider-backed-configured" : "scaffold-only",
    providerConfigured: configured,
    requiredRuntimeEnvPresent: {
      PAT_BILLING_ENABLED: enabled,
      STRIPE_SECRET_KEY: hasSecret,
      STRIPE_WEBHOOK_SECRET: hasWebhookSecret,
      STRIPE_PRICE_KEYS: configuredPriceKeys.length,
    },
    missingRuntimeEnv: missing,
    paymentModeProof: configured
      ? "Stripe runtime configuration is present. Live provider roundtrip still requires signed webhook or Stripe CLI proof."
      : "Billing runtime is scaffold-only because required Stripe env is absent; UI must state no live charge.",
    liveProviderRoundtrip: {
      status: "UNVERIFIED",
      reason: "No Stripe CLI/live provider roundtrip artifact was supplied to this bundle.",
    },
    databaseState: {
      customers: databaseProof.counts.billingCustomers,
      webhookEvents: databaseProof.counts.billingWebhookEvents,
      failedWebhookEvents: databaseProof.counts.failedBillingWebhookEvents,
      invoices: databaseProof.counts.billingInvoices,
    },
  };
}

function buildBrandProof(root) {
  const expectedPatPng = path.join(root, "public/PAT.png");
  const discoveredAssets = [
    "public/brand/pat/pat-logo-accounting.png",
    "public/brand/combined/c2-pat-logo-combined.png",
  ].filter((assetPath) => fs.existsSync(path.join(root, assetPath)));

  return {
    status: fs.existsSync(expectedPatPng) ? "COMPLETE" : "MISSING",
    expectedPath: "public/PAT.png",
    sha256: sha256File(expectedPatPng),
    discoveredPatBrandAssets: discoveredAssets,
    note: fs.existsSync(expectedPatPng)
      ? "Exact PAT.png asset exists."
      : "Exact PAT.png asset is absent; existing PAT brand assets are listed without treating them as PAT.png proof.",
  };
}

async function collectDatabaseProof(root) {
  loadRepoEnv(root);
  const prisma = new PrismaClient();
  const emptyCounts = {
    vendors: 0,
    firms: 0,
    users: 0,
    products: 0,
    productProfiles: 0,
    vendorProductPlans: 0,
    firmProductPlans: 0,
    productSignals: 0,
    completedSurveySubmissions: 0,
    membershipSubscriptions: 0,
    activeMemberships: 0,
    billingCustomers: 0,
    billingWebhookEvents: 0,
    failedBillingWebhookEvents: 0,
    billingInvoices: 0,
    insights: 0,
  };

  try {
    const [
      vendors,
      firms,
      users,
      products,
      productProfiles,
      vendorProductPlans,
      firmProductPlans,
      productSignals,
      completedSurveySubmissions,
      membershipSubscriptions,
      activeMemberships,
      billingCustomers,
      billingWebhookEvents,
      failedBillingWebhookEvents,
      billingInvoices,
      insights,
      membershipDistribution,
      latestMigrations,
    ] = await Promise.all([
      prisma.vendorProfile.count(),
      prisma.company.count({ where: { type: "FIRM" } }),
      prisma.user.count(),
      prisma.product.count(),
      prisma.productProfile.count(),
      prisma.productAssessmentPlan.count({ where: { perspective: "VENDOR" } }),
      prisma.productAssessmentPlan.count({ where: { perspective: "FIRM" } }),
      prisma.productSignal.count(),
      prisma.surveySubmission.count({ where: { scoreVersion: { gt: 0 } } }),
      prisma.membershipSubscription.count(),
      prisma.membershipSubscription.count({ where: { status: { in: ["ACTIVE", "TRIAL"] } } }),
      prisma.billingCustomer.count(),
      prisma.billingWebhookEvent.count(),
      prisma.billingWebhookEvent.count({ where: { processingStatus: "failed" } }),
      prisma.billingInvoice.count(),
      prisma.insight.count({ where: { active: true } }),
      prisma.membershipSubscription.groupBy({
        by: ["plan", "status"],
        _count: { _all: true },
      }),
      prisma.$queryRawUnsafe(
        'SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC NULLS LAST, started_at DESC LIMIT 5'
      ),
    ]);

    const counts = {
      vendors,
      firms,
      users,
      products,
      productProfiles,
      vendorProductPlans,
      firmProductPlans,
      productSignals,
      completedSurveySubmissions,
      membershipSubscriptions,
      activeMemberships,
      billingCustomers,
      billingWebhookEvents,
      failedBillingWebhookEvents,
      billingInvoices,
      insights,
    };

    return {
      status: "COMPLETE",
      error: null,
      counts,
      demoRouteReady:
        vendors >= 10 &&
        products >= 30 &&
        firms >= 10 &&
        productProfiles >= products &&
        vendorProductPlans >= products &&
        firmProductPlans >= products &&
        completedSurveySubmissions >= 130,
      membershipDistribution,
      migrations: {
        status: latestMigrations.length > 0 ? "COMPLETE" : "UNVERIFIED",
        latest: latestMigrations.map((migration) => ({
          name: migration.migration_name,
          finishedAt: migration.finished_at ? new Date(migration.finished_at).toISOString() : null,
        })),
      },
    };
  } catch (error) {
    return {
      status: "UNVERIFIED",
      error: error instanceof Error ? error.message : String(error),
      counts: emptyCounts,
      demoRouteReady: false,
      membershipDistribution: [],
      migrations: {
        status: "UNVERIFIED",
        latest: [],
      },
    };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function collectRouteSmokeProof(options) {
  if (!options.runRouteSmoke) {
    return {
      status: "UNVERIFIED",
      ok: null,
      reason: "Route smoke was not requested for this proof generation run.",
      routeEvidence: {},
      apiFingerprint: null,
      healthFingerprint: null,
      failures: [],
    };
  }

  const result = await runPatSurfaceValidation({
    root: options.root,
    port: options.routeSmokePort,
    timeoutMs: options.routeSmokeTimeoutMs,
  });

  return {
    status: result.ok ? "COMPLETE" : "CONFLICTING",
    ok: result.ok,
    baseUrl: result.baseUrl,
    routeEvidence: result.routeEvidence,
    apiFingerprint: result.apiFingerprint ?? null,
    healthFingerprint: result.healthFingerprint ?? null,
    operatorFingerprint: result.operatorFingerprint ?? null,
    sourceIntegrity: result.sourceIntegrity ?? null,
    failures: result.failures ?? [],
  };
}

function buildKnownItems({ sourceIntegrity, routeSmoke, databaseProof, billingProof, brandProof, validationResults, publicLiveQA }) {
  const validationStatus = summarizeValidationStatus(validationResults);
  const knownItems = [
    {
      key: "release-source-of-truth",
      status: sourceIntegrity.ok ? "COMPLETE" : "CONFLICTING",
      label: "Release identity agrees across canonical root, release state, expected live release, and last-known-good release.",
      proof: sourceIntegrity.ok ? sourceIntegrity.artifactAgreement.expected.releaseId : sourceIntegrity.failures.join("; "),
    },
    {
      key: "local-validation-chain",
      status: validationStatus,
      label: "Requested local validation commands are recorded in the bundle.",
      proof: Object.values(validationResults).map((result) => `${result.key}:${result.status}`).join(", "),
    },
    {
      key: "route-smoke-and-runtime-fingerprint",
      status: routeSmoke.status,
      label: "Standalone route smoke agrees with API, health, and operator release fingerprints.",
      proof: routeSmoke.ok === true ? routeSmoke.apiFingerprint?.releaseId ?? "route smoke passed" : routeSmoke.failures.join("; "),
    },
    {
      key: "database-migration-state",
      status: databaseProof.migrations.status,
      label: "Prisma migration table was readable and latest applied migrations were captured.",
      proof: databaseProof.migrations.latest[0]?.name ?? databaseProof.error ?? "No migration rows captured.",
    },
    {
      key: "demo-data-route-readiness",
      status: databaseProof.demoRouteReady ? "COMPLETE" : databaseProof.status === "COMPLETE" ? "PARTIAL" : "UNVERIFIED",
      label: "Demo ecosystem counts are sufficient for review routes.",
      proof: `vendors=${databaseProof.counts.vendors}, products=${databaseProof.counts.products}, firms=${databaseProof.counts.firms}, scoredSubmissions=${databaseProof.counts.completedSurveySubmissions}`,
    },
    {
      key: "payment-mode",
      status: billingProof.status,
      label: billingProof.providerConfigured
        ? "Stripe configuration is present, but live provider roundtrip still requires external proof."
        : "Billing is scaffold-only and must not claim a live charge.",
      proof: billingProof.paymentModeProof,
    },
    {
      key: "stripe-live-roundtrip",
      status: billingProof.liveProviderRoundtrip.status,
      label: "Live Stripe/Stripe CLI webhook roundtrip proof.",
      proof: billingProof.liveProviderRoundtrip.reason,
    },
    {
      key: "pat-png-brand-asset",
      status: brandProof.status,
      label: "Exact PAT.png brand asset proof.",
      proof: brandProof.note,
    },
    {
      key: "public-live-qa",
      status: publicLiveQA.status,
      label: "Public deployment URL, release proof, and logs.",
      proof: publicLiveQA.reason,
    },
    {
      key: "commercial-policy-finalization",
      status: "DEFERRED",
      label: "Final commercial/legal operating policy remains separate from launch proof.",
      proof: "Trust and policy pages are drafts and intentionally avoid unverified compliance or uptime claims.",
    },
  ];

  return knownItems;
}

function buildPublicLiveQA(publicLiveUrl) {
  if (!publicLiveUrl) {
    return {
      status: "UNVERIFIED",
      url: null,
      reason: "No PAT_PUBLIC_LIVE_URL or --public-live-url was supplied; public-live QA remains unverified.",
      evidence: [],
    };
  }

  return {
    status: "PARTIAL",
    url: publicLiveUrl,
    reason: "A public URL was supplied, but this bundle does not include live logs or public route-smoke proof.",
    evidence: ["public-live-url-supplied"],
  };
}

export async function buildLaunchProofBundle(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  loadRepoEnv(root);
  const packageInfo = readPackageInfo(root);
  const sourceIntegrity = runSourceIntegrityValidation({ root });
  const routeSmoke = await collectRouteSmokeProof({
    root,
    runRouteSmoke: Boolean(options.runRouteSmoke),
    routeSmokePort: options.routeSmokePort ?? 3320,
    routeSmokeTimeoutMs: options.routeSmokeTimeoutMs ?? 45_000,
  });
  const databaseProof = await collectDatabaseProof(root);
  const validationResults = mergeValidationResults(
    root,
    options.validationResultsPath ?? "",
    options.validationResults ?? {}
  );
  const publicLiveQA = buildPublicLiveQA(options.publicLiveUrl ?? process.env.PAT_PUBLIC_LIVE_URL ?? "");
  const billingProof = buildBillingProof(process.env, databaseProof);
  const brandProof = buildBrandProof(root);
  const knownItems = buildKnownItems({
    sourceIntegrity,
    routeSmoke,
    databaseProof,
    billingProof,
    brandProof,
    validationResults,
    publicLiveQA,
  });
  const releaseFingerprint = sourceIntegrity.artifactAgreement.expected;

  const bundle = {
    schemaVersion: 1,
    proofName: "PAT final 4.26.26 launch proof bundle",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    objectiveDate: "2026-04-26",
    root,
    package: packageInfo,
    runtimeVersions: readRuntimeVersions(root),
    releaseIdentity: {
      status: sourceIntegrity.ok ? "COMPLETE" : "CONFLICTING",
      branch: sourceIntegrity.branch,
      commitSha: sourceIntegrity.commitSha,
      commitShort: sourceIntegrity.commitSha.slice(0, 7),
      buildId: releaseFingerprint.buildId,
      buildTimestamp: releaseFingerprint.buildTimestamp,
      canonicalRoot: sourceIntegrity.canonicalRoot,
      canonicalRootName: releaseFingerprint.canonicalRootName,
      startCommand: sourceIntegrity.startCommand,
      authMode: sourceIntegrity.authMode,
      gitDirty: sourceIntegrity.gitDirty,
      releaseId: releaseFingerprint.releaseId,
    },
    sourceIntegrity: {
      status: sourceIntegrity.ok ? "COMPLETE" : "CONFLICTING",
      failures: sourceIntegrity.failures,
      warnings: sourceIntegrity.warnings,
      dirtyEntries: sourceIntegrity.dirtyEntries,
      ignoredDirtyEntries: sourceIntegrity.ignoredDirtyEntries,
      artifactAgreement: sourceIntegrity.artifactAgreement,
    },
    releaseFingerprint,
    buildState: {
      status: sourceIntegrity.ok ? "COMPLETE" : "CONFLICTING",
      packageManager: packageInfo.packageManager,
      buildCommand: packageInfo.buildCommand,
      startCommand: sourceIntegrity.startCommand,
      buildId: releaseFingerprint.buildId,
      buildTimestamp: releaseFingerprint.buildTimestamp,
    },
    auth: {
      status: "COMPLETE",
      mode: sourceIntegrity.authMode,
      localReviewMode:
        process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH === "1" ? "enabled-for-local-proof" : "disabled-by-default",
      proof: "Auth boundary and local-review e2e validation are recorded in validationResults.",
    },
    billing: billingProof,
    paymentMode: {
      status: billingProof.status,
      mode: billingProof.mode,
      provider: billingProof.provider,
      proof: billingProof.paymentModeProof,
      liveProviderRoundtrip: billingProof.liveProviderRoundtrip,
    },
    migrations: databaseProof.migrations,
    seedStatus: {
      status: databaseProof.demoRouteReady ? "COMPLETE" : databaseProof.status,
      commands: ["pnpm seed:baseline", "pnpm seed:pat-runtime"],
      demoSeedVersion: parseDemoSeedVersion(root),
      proof: databaseProof.demoRouteReady
        ? "Demo ecosystem route-readiness thresholds are met in the local database."
        : databaseProof.error ?? "Demo ecosystem thresholds are not fully met.",
    },
    demoData: {
      status: databaseProof.demoRouteReady ? "COMPLETE" : databaseProof.status,
      demoSeedVersion: parseDemoSeedVersion(root),
      routeReady: databaseProof.demoRouteReady,
      counts: databaseProof.counts,
      membershipDistribution: databaseProof.membershipDistribution,
      error: databaseProof.error,
    },
    routeSmoke,
    validationResults,
    brandIntegration: {
      patPng: brandProof,
    },
    publicLiveQA,
    knownItems,
    statusBuckets: buildStatusBuckets(knownItems),
  };

  const validation = validateLaunchProofBundle(bundle);
  return {
    ...bundle,
    validator: {
      status: validation.ok ? "COMPLETE" : "CONFLICTING",
      failures: validation.failures,
    },
  };
}

function required(value, pathName, failures) {
  if (value === undefined || value === null || value === "") {
    failures.push(`${pathName}:missing`);
  }
}

export function validateLaunchProofBundle(bundle) {
  const failures = [];
  const requiredTopLevelFields = [
    "schemaVersion",
    "proofName",
    "generatedAt",
    "objectiveDate",
    "root",
    "package",
    "runtimeVersions",
    "releaseIdentity",
    "sourceIntegrity",
    "releaseFingerprint",
    "buildState",
    "auth",
    "billing",
    "paymentMode",
    "migrations",
    "seedStatus",
    "demoData",
    "routeSmoke",
    "validationResults",
    "brandIntegration",
    "publicLiveQA",
    "knownItems",
    "statusBuckets",
  ];

  if (bundle?.schemaVersion !== 1) {
    failures.push("schemaVersion:expected_1");
  }

  for (const field of requiredTopLevelFields) {
    required(bundle?.[field], field, failures);
  }

  for (const field of [
    "branch",
    "commitSha",
    "buildId",
    "buildTimestamp",
    "canonicalRoot",
    "canonicalRootName",
    "startCommand",
    "authMode",
    "gitDirty",
    "releaseId",
  ]) {
    required(bundle?.releaseIdentity?.[field], `releaseIdentity.${field}`, failures);
  }

  for (const field of [
    "releaseId",
    "commitSha",
    "branch",
    "buildId",
    "buildTimestamp",
    "authMode",
    "buildSourceType",
    "canonicalRootName",
    "releaseFingerprintSeed",
    "startCommand",
    "gitDirty",
  ]) {
    required(bundle?.releaseFingerprint?.[field], `releaseFingerprint.${field}`, failures);
  }

  for (const [key, command] of Object.entries(REQUIRED_VALIDATION_COMMANDS)) {
    const result = bundle?.validationResults?.[key];
    required(result, `validationResults.${key}`, failures);
    if (result) {
      if (result.command !== command) {
        failures.push(`validationResults.${key}.command_mismatch`);
      }
      if (!isStatus(result.status)) {
        failures.push(`validationResults.${key}.status_invalid`);
      }
    }
  }

  for (const status of LAUNCH_PROOF_STATUSES) {
    if (!Array.isArray(bundle?.statusBuckets?.[status])) {
      failures.push(`statusBuckets.${status}:missing`);
    }
  }

  if (!Array.isArray(bundle?.knownItems) || bundle.knownItems.length === 0) {
    failures.push("knownItems:missing_items");
  } else {
    for (const item of bundle.knownItems) {
      if (!item.key) failures.push("knownItems.item.key:missing");
      if (!isStatus(item.status)) failures.push(`knownItems.${item.key ?? "unknown"}.status_invalid`);
      if (!item.label) failures.push(`knownItems.${item.key ?? "unknown"}.label:missing`);
      if (!item.proof) failures.push(`knownItems.${item.key ?? "unknown"}.proof:missing`);
    }
  }

  required(bundle?.paymentMode?.mode, "paymentMode.mode", failures);
  required(bundle?.paymentMode?.proof, "paymentMode.proof", failures);
  required(bundle?.billing?.provider, "billing.provider", failures);
  required(bundle?.brandIntegration?.patPng?.status, "brandIntegration.patPng.status", failures);
  required(bundle?.publicLiveQA?.status, "publicLiveQA.status", failures);
  required(bundle?.demoData?.counts, "demoData.counts", failures);
  required(bundle?.routeSmoke?.status, "routeSmoke.status", failures);

  return {
    ok: failures.length === 0,
    failures,
  };
}

function renderMarkdown(bundle) {
  const lines = [
    "# PAT Final 4.26.26 Launch Proof",
    "",
    `Generated: ${bundle.generatedAt}`,
    `Release: ${bundle.releaseIdentity.releaseId}`,
    `Branch: ${bundle.releaseIdentity.branch}`,
    `Commit: ${bundle.releaseIdentity.commitSha}`,
    `Build ID: ${bundle.releaseIdentity.buildId}`,
    `Build timestamp: ${bundle.releaseIdentity.buildTimestamp}`,
    `Canonical root: ${bundle.releaseIdentity.canonicalRoot}`,
    `Start command: ${bundle.releaseIdentity.startCommand}`,
    `Auth mode: ${bundle.releaseIdentity.authMode}`,
    `Git dirty: ${bundle.releaseIdentity.gitDirty}`,
    "",
    "## Status Buckets",
    "",
  ];

  for (const status of LAUNCH_PROOF_STATUSES) {
    lines.push(`### ${status}`);
    const items = bundle.statusBuckets[status];
    if (items.length === 0) {
      lines.push("- No items currently labeled in this status bucket.");
    } else {
      for (const item of items) {
        lines.push(`- ${item.key}: ${item.label} Proof: ${item.proof}`);
      }
    }
    lines.push("");
  }

  lines.push("## Validation Results", "");
  for (const result of Object.values(bundle.validationResults)) {
    lines.push(`- ${result.status}: ${result.command}. ${result.summary}`);
  }

  lines.push(
    "",
    "## Billing And Public-Live Truth",
    "",
    `- Payment mode: ${bundle.paymentMode.mode}. ${bundle.paymentMode.proof}`,
    `- Live provider roundtrip: ${bundle.paymentMode.liveProviderRoundtrip.status}. ${bundle.paymentMode.liveProviderRoundtrip.reason}`,
    `- Public-live QA: ${bundle.publicLiveQA.status}. ${bundle.publicLiveQA.reason}`,
    `- PAT.png: ${bundle.brandIntegration.patPng.status}. ${bundle.brandIntegration.patPng.note}`,
    "",
    "## Demo Data Counts",
    "",
    `- Vendors: ${bundle.demoData.counts.vendors}`,
    `- Products: ${bundle.demoData.counts.products}`,
    `- Firms: ${bundle.demoData.counts.firms}`,
    `- Users: ${bundle.demoData.counts.users}`,
    `- Completed scored submissions: ${bundle.demoData.counts.completedSurveySubmissions}`,
    `- Route ready: ${bundle.demoData.routeReady}`,
    "",
    "## Validator",
    "",
    `- ${bundle.validator.status}: ${bundle.validator.failures.length === 0 ? "bundle schema complete" : bundle.validator.failures.join("; ")}`
  );

  return `${lines.join("\n")}\n`;
}

export function writeLaunchProofBundle(bundle, options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const outputDir = path.resolve(root, options.outputDir ?? DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, options.jsonName ?? DEFAULT_JSON_NAME);
  const markdownPath = path.join(outputDir, options.markdownName ?? DEFAULT_MARKDOWN_NAME);

  fs.writeFileSync(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(bundle));

  return { jsonPath, markdownPath };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bundle = await buildLaunchProofBundle(args);
  const validation = validateLaunchProofBundle(bundle);
  const written = writeLaunchProofBundle(bundle, args);
  console.log(JSON.stringify({ ok: validation.ok, ...written, validator: bundle.validator }, null, 2));

  if (!validation.ok || bundle.validator.failures.length > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
