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
const BILLING_PROOF_DIR = "artifacts/billing";
const STRIPE_ROUNDTRIP_PROOF_PATTERN = /^stripe-roundtrip-.+\.json$/;
const DEMO_VERSION_PATTERN = /DEMO_PAT_ECOSYSTEM_VERSION\s*=\s*"([^"]+)"/;
const PUBLIC_LIVE_ROUTES = Object.freeze([
  "/",
  "/sign-in",
  "/vendor",
  "/firm",
  "/user",
  "/admin",
  "/api/release-fingerprint",
  "/api/health/db",
  "/release",
]);
const PUBLIC_LIVE_HTML_ROUTES = new Set(["/", "/sign-in", "/release"]);
const PUBLIC_LIVE_REDIRECT_ROUTES = new Set(["/vendor", "/firm", "/user", "/admin"]);
const PUBLIC_FINGERPRINT_FIELDS = Object.freeze([
  "schemaVersion",
  "releaseId",
  "commitSha",
  "commitShort",
  "branch",
  "canonicalRootName",
  "buildTimestamp",
  "authMode",
  "buildSourceType",
  "buildId",
  "releaseFingerprintSeed",
  "startCommand",
  "gitDirty",
]);
const PUBLIC_HEALTH_FINGERPRINT_FIELDS = Object.freeze([
  "releaseId",
  "commitSha",
  "branch",
  "canonicalRootName",
  "buildTimestamp",
  "authMode",
  "buildSourceType",
  "buildId",
  "releaseFingerprintSeed",
  "startCommand",
  "gitDirty",
]);

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
      dotenv.config({ path: envPath, override: false, quiet: true });
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

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function timestampForFileName(value) {
  return value.replace(/[:.]/g, "-");
}

function normalizePublicLiveUrl(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function compactSnippet(value, maxLength = 700) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeMarkerText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function htmlContainsForbiddenMarker(html, marker) {
  const normalizedHtml = normalizeMarkerText(html);
  const normalizedMarker = normalizeMarkerText(marker);
  if (!normalizedMarker) {
    return false;
  }

  if (/^[a-z0-9]{1,3}$/i.test(String(marker).trim())) {
    const escaped = normalizedMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i").test(normalizedHtml);
  }

  return normalizedHtml.includes(normalizedMarker);
}

function extractBrowserReleaseId(html) {
  const dataAttributeMatch = html.match(/data-release-fingerprint="([^"]+)"/);
  if (dataAttributeMatch?.[1]) {
    return dataAttributeMatch[1];
  }

  const textMatch = html.match(/Release ([A-Za-z0-9:_-]+)/);
  return textMatch?.[1] ?? null;
}

function extractCallbackTarget(location, baseUrl) {
  if (!location) return null;
  try {
    const parsed = new URL(location, baseUrl);
    return parsed.searchParams.get("redirectTo") ?? parsed.searchParams.get("callbackUrl");
  } catch {
    return null;
  }
}

function normalizeRedirectPath(location, baseUrl) {
  if (!location) return "";
  try {
    const parsed = new URL(location, baseUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return location;
  }
}

function comparePublicFingerprint(actual, expected, fields = PUBLIC_FINGERPRINT_FIELDS, scope = "public_fingerprint") {
  if (!actual) {
    return [`${scope}:missing`];
  }

  return fields.flatMap((field) => {
    const actualValue = actual?.[field];
    const expectedValue = expected?.[field];
    if (actualValue === expectedValue) {
      return [];
    }
    return [`${scope}:${field}_mismatch:${String(actualValue ?? "missing")}:${String(expectedValue ?? "missing")}`];
  });
}

export function classifyPublicLiveProof({ publicLiveUrl, failures = [], partialReasons = [], fingerprintMatches = false }) {
  if (!publicLiveUrl) {
    return {
      status: "UNVERIFIED",
      reason: "No PAT_PUBLIC_LIVE_URL or --public-live-url was supplied; public-live QA remains unverified.",
    };
  }

  if (failures.length > 0) {
    return {
      status: "CONFLICTING",
      reason: failures.join("; "),
    };
  }

  if (fingerprintMatches && partialReasons.length > 0) {
    return {
      status: "PARTIAL",
      reason: partialReasons.join("; "),
    };
  }

  if (fingerprintMatches) {
    return {
      status: "COMPLETE",
      reason: "Public/staging URL served the expected PAT release fingerprint across required routes and APIs.",
    };
  }

  return {
    status: "UNVERIFIED",
    reason: "Public/staging URL was supplied, but release fingerprint proof was not captured.",
  };
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

function readStripeRoundtripProofArtifacts(root) {
  const proofDir = path.join(root, BILLING_PROOF_DIR);
  if (!fs.existsSync(proofDir)) {
    return [];
  }

  return fs
    .readdirSync(proofDir)
    .filter((fileName) => STRIPE_ROUNDTRIP_PROOF_PATTERN.test(fileName))
    .map((fileName) => {
      const fullPath = path.join(proofDir, fileName);
      const proof = readOptionalJson(fullPath);
      if (!proof) return null;
      const stat = fs.statSync(fullPath);
      return {
        proof,
        artifactPath: path.relative(root, fullPath),
        generatedAt: proof.generatedAt ?? stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs,
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = Date.parse(left.generatedAt) || left.mtimeMs;
      const rightTime = Date.parse(right.generatedAt) || right.mtimeMs;
      return rightTime - leftTime;
    });
}

export function summarizeStripeRoundtripProofArtifact(artifact) {
  const proof = artifact?.proof;
  if (!proof) {
    return null;
  }

  const artifactPath = artifact.artifactPath ?? "unknown";
  if (proof.mode === "stripe-cli" && proof.status === "COMPLETE") {
    return {
      status: "COMPLETE",
      reason: `Stripe CLI/test-mode provider roundtrip proof captured in ${artifactPath}.`,
      artifactPath,
      generatedAt: proof.generatedAt ?? null,
      mode: proof.mode,
      checks: proof.checks ?? [],
    };
  }

  if (proof.mode === "fixture" && proof.status === "PARTIAL") {
    return {
      status: "PARTIAL",
      reason: `Signed Stripe-like fixture proof captured in ${artifactPath}; this proves local verification/reconciliation but is not a live or Stripe CLI provider roundtrip.`,
      artifactPath,
      generatedAt: proof.generatedAt ?? null,
      mode: proof.mode,
      checks: proof.checks ?? [],
    };
  }

  if (proof.status === "UNVERIFIED") {
    return {
      status: "UNVERIFIED",
      reason: `Stripe roundtrip proof artifact ${artifactPath} is UNVERIFIED: ${proof.stripeCliRun?.reason ?? "provider proof is incomplete"}.`,
      artifactPath,
      generatedAt: proof.generatedAt ?? null,
      mode: proof.mode ?? "unknown",
      checks: proof.checks ?? [],
    };
  }

  return {
    status: "CONFLICTING",
    reason: `Stripe roundtrip proof artifact ${artifactPath} is not acceptable for launch proof: mode=${proof.mode ?? "unknown"} status=${proof.status ?? "missing"}.`,
    artifactPath,
    generatedAt: proof.generatedAt ?? null,
    mode: proof.mode ?? "unknown",
    checks: proof.checks ?? [],
  };
}

function selectStripeRoundtripProof(root, billingConfigured) {
  const artifacts = readStripeRoundtripProofArtifacts(root);
  const cliComplete = artifacts.find((artifact) =>
    artifact.proof?.mode === "stripe-cli" && artifact.proof?.status === "COMPLETE"
  );
  const fixturePartial = artifacts.find((artifact) =>
    artifact.proof?.mode === "fixture" && artifact.proof?.status === "PARTIAL"
  );
  const selected = cliComplete ?? fixturePartial ?? artifacts[0] ?? null;
  const summary = summarizeStripeRoundtripProofArtifact(selected);
  if (summary) {
    return summary;
  }

  return {
    status: "UNVERIFIED",
    reason: billingConfigured
      ? "Stripe runtime configuration is present, but no durable Stripe roundtrip proof artifact was found under artifacts/billing."
      : "Stripe runtime env is absent and no durable Stripe roundtrip proof artifact was found under artifacts/billing.",
    artifactPath: null,
    generatedAt: null,
    mode: null,
    checks: [],
  };
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

function buildBillingProof(env, databaseProof, root) {
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

  const roundtripProof = selectStripeRoundtripProof(root, configured);

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
    liveProviderRoundtrip: roundtripProof,
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
  const authoritativePatAsset = "public/brand/pat/pat-logo-accounting.png";
  const authoritativePatAssetPath = path.join(root, authoritativePatAsset);
  const expectedSha256 = sha256File(expectedPatPng);
  const authoritativeSha256 = sha256File(authoritativePatAssetPath);
  const hasExpectedPatPng = fs.existsSync(expectedPatPng);
  const matchesAuthoritativeSource = Boolean(expectedSha256 && authoritativeSha256 && expectedSha256 === authoritativeSha256);
  let status = "MISSING";
  let note =
    "Exact public/PAT.png asset is absent. Operator action: supply the official PAT.png from an approved brand source; existing PAT brand assets are listed without treating them as PAT.png proof.";
  if (hasExpectedPatPng && matchesAuthoritativeSource) {
    status = "COMPLETE";
    note = "Exact public/PAT.png asset exists and is hash-checked against the repo-authoritative PAT implementation asset.";
  } else if (hasExpectedPatPng) {
    status = "CONFLICTING";
    note =
      "Exact public/PAT.png exists but does not hash-match the repo-authoritative PAT implementation asset; do not treat it as official proof.";
  }
  const discoveredAssets = [
    authoritativePatAsset,
    "public/brand/combined/c2-pat-logo-combined.png",
  ].filter((assetPath) => fs.existsSync(path.join(root, assetPath)));

  return {
    status,
    expectedPath: "public/PAT.png",
    sha256: expectedSha256,
    authoritativeSourcePath: authoritativePatAsset,
    authoritativeSourceSha256: authoritativeSha256,
    matchesAuthoritativeSource,
    discoveredPatBrandAssets: discoveredAssets,
    note,
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

    const demoRouteReady =
      vendors >= 10 &&
      products >= 30 &&
      firms >= 10 &&
      productProfiles >= 30 &&
      vendorProductPlans >= 30 &&
      firmProductPlans >= 30 &&
      completedSurveySubmissions >= 130;

    return {
      status: "COMPLETE",
      error: null,
      counts,
      demoRouteReady,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: "UNVERIFIED",
      error: `${errorMessage}\n\nDatabase proof is blocked. Start and verify the local DB with: pnpm db:up && pnpm db:wait, then rerun migrations/seeds and pnpm launch:proof.`,
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
    browserReleaseId: result.browserReleaseId ?? null,
    routeEvidence: result.routeEvidence,
    apiFingerprint: result.apiFingerprint ?? null,
    healthFingerprint: result.healthFingerprint ?? null,
    healthStatus: result.healthStatus ?? null,
    operatorFingerprint: result.operatorFingerprint ?? null,
    sourceIntegrity: result.sourceIntegrity ?? null,
    failures: result.failures ?? [],
  };
}

export function summarizeRouteSmokeKnownItemProof(routeSmoke) {
  if (routeSmoke.ok === true) {
    return routeSmoke.apiFingerprint?.releaseId ?? "route smoke passed";
  }

  if (Array.isArray(routeSmoke.failures) && routeSmoke.failures.length > 0) {
    return routeSmoke.failures.join("; ");
  }

  return routeSmoke.reason ?? "Route smoke proof was not recorded for this launch bundle.";
}

async function fetchPublicLiveRoute(baseUrl, routePath) {
  const url = `${baseUrl}${routePath}`;
  const fetchedAt = new Date().toISOString();
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "user-agent": "PAT launch-proof public-live validator",
      accept: routePath.startsWith("/api/") ? "application/json" : "text/html,application/xhtml+xml",
    },
  });
  const bodyText = await response.text();

  return {
    path: routePath,
    url,
    fetchedAt,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    location: response.headers.get("location") ?? "",
    responseHashSha256: sha256Text(bodyText),
    bodyText,
  };
}

function buildPublicLiveRouteEvidence(response, includeSnippet) {
  return {
    path: response.path,
    url: response.url,
    fetchedAt: response.fetchedAt,
    status: response.status,
    contentType: response.contentType,
    location: response.location || null,
    responseHashSha256: response.responseHashSha256,
    snippet: includeSnippet ? compactSnippet(response.bodyText) : null,
  };
}

function parsePublicJson(response) {
  try {
    return JSON.parse(response.bodyText);
  } catch {
    return null;
  }
}

function writePublicLiveProofArtifact(root, proof) {
  const outputDir = path.join(root, DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(outputDir, { recursive: true });
  const artifactPath = path.join(
    outputDir,
    `public-live-${timestampForFileName(proof.generatedAt)}.json`
  );
  fs.writeFileSync(artifactPath, `${JSON.stringify(proof, null, 2)}\n`);
  return path.relative(root, artifactPath);
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
      proof: summarizeRouteSmokeKnownItemProof(routeSmoke),
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
      key: "provider-backed-billing-readiness",
      status: "PARTIAL",
      label: "Provider-backed billing architecture exists, but launch proof is not a live provider roundtrip.",
      proof: billingProof.providerConfigured
        ? "Stripe env is configured; live provider roundtrip remains unverified."
        : "Stripe code path exists, but runtime env is absent so launch payment truth is scaffold-only.",
    },
    {
      key: "stripe-live-roundtrip",
      status: billingProof.liveProviderRoundtrip.status,
      label: "Stripe signed webhook or CLI/test-mode provider roundtrip proof.",
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

export async function buildPublicLiveQA(publicLiveUrl, expectedReleaseFingerprint, options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const normalizedUrl = normalizePublicLiveUrl(publicLiveUrl);
  if (!publicLiveUrl) {
    return {
      status: "UNVERIFIED",
      url: null,
      reason: "No PAT_PUBLIC_LIVE_URL or --public-live-url was supplied; public-live QA remains unverified.",
      evidence: [],
      artifactPath: null,
      checkedAt: generatedAt,
      routeEvidence: {},
      apiFingerprint: null,
      healthFingerprint: null,
      failures: [],
      partialReasons: [],
    };
  }

  if (!normalizedUrl) {
    return {
      status: "CONFLICTING",
      url: publicLiveUrl,
      reason: "PAT_PUBLIC_LIVE_URL or --public-live-url is not a valid http(s) URL.",
      evidence: [],
      artifactPath: null,
      checkedAt: generatedAt,
      routeEvidence: {},
      apiFingerprint: null,
      healthFingerprint: null,
      failures: ["public_live_url:invalid"],
      partialReasons: [],
    };
  }

  const manifest = loadManifest(root);
  const failures = [];
  const partialReasons = [];
  const routeEvidence = {};
  let apiFingerprint = null;
  let healthFingerprint = null;
  let releasePageReleaseId = null;

  try {
    for (const routePath of PUBLIC_LIVE_ROUTES) {
      const response = await fetchPublicLiveRoute(normalizedUrl, routePath);
      const includeSnippet = PUBLIC_LIVE_HTML_ROUTES.has(routePath);
      const evidence = buildPublicLiveRouteEvidence(response, includeSnippet);
      routeEvidence[routePath] = evidence;

      if (PUBLIC_LIVE_HTML_ROUTES.has(routePath)) {
        if (response.status !== 200) {
          failures.push(`${routePath}:unexpected_status:${response.status}`);
        }

        const forbiddenMarkers = (manifest.globalForbiddenMarkers ?? [])
          .filter((marker) => htmlContainsForbiddenMarker(response.bodyText, marker));
        evidence.forbiddenMarkers = forbiddenMarkers;
        if (forbiddenMarkers.length > 0) {
          failures.push(`${routePath}:forbidden_markers:${forbiddenMarkers.join("|")}`);
        }

        const browserReleaseId = extractBrowserReleaseId(response.bodyText);
        evidence.releaseId = browserReleaseId;
        if (routePath === "/release") {
          releasePageReleaseId = browserReleaseId;
        }
        continue;
      }

      if (PUBLIC_LIVE_REDIRECT_ROUTES.has(routePath)) {
        const redirectPath = normalizeRedirectPath(response.location, normalizedUrl);
        const callbackTarget = extractCallbackTarget(response.location, normalizedUrl);
        evidence.redirectPath = redirectPath;
        evidence.callbackTarget = callbackTarget;

        if (![301, 302, 303, 307, 308].includes(response.status)) {
          failures.push(`${routePath}:expected_redirect_status:${response.status}`);
        }
        if (!redirectPath.startsWith("/sign-in")) {
          failures.push(`${routePath}:bad_redirect_target:${redirectPath || "missing"}`);
        }
        if (callbackTarget !== routePath) {
          failures.push(`${routePath}:bad_callback_target:${callbackTarget || "missing"}`);
        }
        continue;
      }

      if (routePath === "/api/release-fingerprint") {
        if (response.status !== 200) {
          failures.push(`${routePath}:unexpected_status:${response.status}`);
        }
        const payload = parsePublicJson(response);
        evidence.payload = payload;
        apiFingerprint = payload?.fingerprint ?? null;
        evidence.fingerprint = apiFingerprint;
        failures.push(
          ...comparePublicFingerprint(
            apiFingerprint,
            expectedReleaseFingerprint,
            PUBLIC_FINGERPRINT_FIELDS,
            "public_api_fingerprint"
          )
        );
        continue;
      }

      if (routePath === "/api/health/db") {
        const payload = parsePublicJson(response);
        evidence.payload = payload;
        healthFingerprint = payload?.release ?? null;
        evidence.release = healthFingerprint;
        failures.push(
          ...comparePublicFingerprint(
            healthFingerprint,
            expectedReleaseFingerprint,
            PUBLIC_HEALTH_FINGERPRINT_FIELDS,
            "public_health_fingerprint"
          )
        );
        if (response.status !== 200 || payload?.ok !== true) {
          partialReasons.push(`/api/health/db returned ${response.status} ok=${String(payload?.ok ?? "missing")}`);
        }
      }
    }

    if (releasePageReleaseId && releasePageReleaseId !== expectedReleaseFingerprint.releaseId) {
      failures.push(`public_release_page:release_id_mismatch:${releasePageReleaseId}:${expectedReleaseFingerprint.releaseId}`);
    }
  } catch (error) {
    failures.push(`public_live_fetch_error:${error?.code ?? "unknown"}:${error?.message ?? String(error)}`);
  }

  const fingerprintMatches = failures.filter((failure) => failure.includes("fingerprint")).length === 0
    && Boolean(apiFingerprint?.releaseId)
    && apiFingerprint.releaseId === expectedReleaseFingerprint.releaseId;
  const classification = classifyPublicLiveProof({
    publicLiveUrl: normalizedUrl,
    failures,
    partialReasons,
    fingerprintMatches,
  });
  const proof = {
    schemaVersion: 1,
    proofName: "PAT public/staging live release proof",
    generatedAt,
    checkedAt: new Date().toISOString(),
    url: normalizedUrl,
    status: classification.status,
    reason: classification.reason,
    expectedReleaseFingerprint,
    apiFingerprint,
    healthFingerprint,
    routesChecked: PUBLIC_LIVE_ROUTES,
    routeEvidence,
    failures,
    partialReasons,
  };
  const artifactPath = writePublicLiveProofArtifact(root, proof);

  return {
    status: classification.status,
    url: normalizedUrl,
    reason: classification.reason,
    evidence: [artifactPath],
    artifactPath,
    checkedAt: proof.checkedAt,
    routeEvidence,
    apiFingerprint,
    healthFingerprint,
    failures,
    partialReasons,
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
  const releaseFingerprint = sourceIntegrity.artifactAgreement.expected;
  const publicLiveQA = await buildPublicLiveQA(
    options.publicLiveUrl ?? process.env.PAT_PUBLIC_LIVE_URL ?? "",
    releaseFingerprint,
    {
      root,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
    }
  );
  const billingProof = buildBillingProof(process.env, databaseProof, root);
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
  required(bundle?.paymentMode?.liveProviderRoundtrip?.status, "paymentMode.liveProviderRoundtrip.status", failures);
  required(bundle?.paymentMode?.liveProviderRoundtrip?.reason, "paymentMode.liveProviderRoundtrip.reason", failures);
  required(bundle?.billing?.provider, "billing.provider", failures);
  required(bundle?.brandIntegration?.patPng?.status, "brandIntegration.patPng.status", failures);
  required(bundle?.publicLiveQA?.status, "publicLiveQA.status", failures);
  required(bundle?.publicLiveQA?.reason, "publicLiveQA.reason", failures);
  required(bundle?.publicLiveQA?.checkedAt, "publicLiveQA.checkedAt", failures);
  required(bundle?.publicLiveQA?.evidence, "publicLiveQA.evidence", failures);
  required(bundle?.publicLiveQA?.routeEvidence, "publicLiveQA.routeEvidence", failures);
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
    `- Stripe provider roundtrip: ${bundle.paymentMode.liveProviderRoundtrip.status}. ${bundle.paymentMode.liveProviderRoundtrip.reason}`,
    `- Public-live QA: ${bundle.publicLiveQA.status}. ${bundle.publicLiveQA.reason}`,
    `- Public-live artifact: ${bundle.publicLiveQA.artifactPath ?? "none"}`,
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
