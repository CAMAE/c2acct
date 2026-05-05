#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const CRITICAL_EXPORT_PATHS = Object.freeze([
  { path: "app", kind: "dir", description: "Next.js App Router source and UI routes." },
  { path: "app/components", kind: "dir", description: "Core PAT UI component source." },
  { path: "app/globals.css", kind: "file", description: "PAT global styling source." },
  { path: "lib", kind: "dir", description: "Runtime domain, auth, billing, assessment, and release logic." },
  { path: "public", kind: "dir", description: "Public assets including PAT brand proof files." },
  { path: "auth.ts", kind: "file", description: "Auth.js runtime entrypoint." },
  { path: "auth.config.ts", kind: "file", description: "Auth.js provider configuration." },
  { path: "proxy.ts", kind: "file", description: "Canonical protected-route proxy; /login remains compatibility-only." },
  { path: "next.config.ts", kind: "file", description: "Next.js build/runtime configuration." },
  { path: "tsconfig.json", kind: "file", description: "TypeScript compiler configuration." },
  { path: "eslint.config.mjs", kind: "file", description: "ESLint validation configuration." },
  { path: "playwright.config.ts", kind: "file", description: "Browser validation configuration." },
  { path: "vitest.config.ts", kind: "file", description: "Unit/contract test configuration." },
  { path: "README.md", kind: "file", description: "Repo source-of-truth overview and runbook." },
  { path: "docs/active-repo-map.md", kind: "file", description: "Active PAT repo map." },
  { path: "docs/CORE_BUILD_AAE.md", kind: "file", description: "Current Core Build guide truth." },
  { path: "artifacts/launch-proof/4.26.26-launch-proof.json", kind: "file", description: "Machine-readable launch proof." },
  { path: "artifacts/launch-proof/4.26.26-launch-proof.md", kind: "file", description: "Human-readable launch proof." },
  { path: "package.json", kind: "file", description: "Package manager and validation scripts." },
  { path: "pnpm-lock.yaml", kind: "file", description: "Pinned pnpm dependency graph." },
  { path: "prisma/schema.prisma", kind: "file", description: "Database source-of-truth schema." },
  { path: "prisma/migrations", kind: "dir", description: "Database migration history." },
  { path: "scripts/release", kind: "dir", description: "Release validators and proof generators." },
  { path: "tests", kind: "dir", description: "Contract and validation tests." },
]);

export const EXPORT_BUNDLES = Object.freeze([
  {
    name: "01-app-root",
    zipName: "01-app-root.zip",
    description: "Application UI, runtime libraries, public assets, auth/proxy, and app/test/build configuration.",
    entries: [
      "app",
      "components",
      "lib",
      "public",
      "data",
      "middleware.ts",
      "auth.ts",
      "auth.config.ts",
      "proxy.ts",
      "next.config.ts",
      "tsconfig.json",
      "eslint.config.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "postcss.config.mjs",
    ],
  },
  {
    name: "02-db-scripts-ops-tests",
    zipName: "02-db-scripts-ops-tests.zip",
    description: "Database schema/migrations, release/ops scripts, tests, e2e, and operator configuration.",
    entries: [
      "prisma",
      "scripts",
      "tests",
      "e2e",
      "ops",
      "docker-compose.yml",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
    ],
  },
  {
    name: "03-docs-audit-artifacts",
    zipName: "03-docs-audit-artifacts.zip",
    description: "Source-of-truth docs and allowed launch proof artifacts.",
    entries: [
      "README.md",
      "docs",
      "artifacts/launch-proof",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
    ],
  },
]);

export const EXCLUDED_EXPORT_RULES = Object.freeze([
  { pattern: ".git/", rationale: "Git internals are not source handoff content." },
  { pattern: ".env*", rationale: "Environment files may contain secrets." },
  { pattern: ".envrc", rationale: "Environment loader files may contain local secrets." },
  { pattern: ".direnv/", rationale: "Local environment cache." },
  { pattern: ".vercel/", rationale: "Provider-local project metadata." },
  { pattern: ".next/", rationale: "Generated Next.js build output." },
  { pattern: "node_modules/", rationale: "Installed dependencies." },
  { pattern: "artifacts/mac-mini/", rationale: "Local Mac mini runtime state/logs are machine-specific." },
  { pattern: "artifacts/reports/", rationale: "Generated reports are not source-of-truth proof." },
  { pattern: "artifacts/audit/", rationale: "Generated audit scratch artifacts." },
  { pattern: "artifacts/release/", rationale: "Generated release scratch artifacts." },
  { pattern: "artifacts/visual/", rationale: "Generated visual artifacts." },
  { pattern: "logs/", rationale: "Runtime logs." },
  { pattern: "playwright-report/", rationale: "Generated test report." },
  { pattern: "test-results/", rationale: "Generated test artifacts." },
  { pattern: "blob-report/", rationale: "Generated Playwright blob report." },
  { pattern: "coverage/", rationale: "Generated coverage output." },
  { pattern: "tmp/", rationale: "Temporary files." },
  { pattern: ".tmp/", rationale: "Temporary files." },
  { pattern: ".venv/", rationale: "Local Python environment." },
  { pattern: ".venv311/", rationale: "Local Python environment." },
  { pattern: "venv/", rationale: "Local Python environment." },
  { pattern: "myenv/", rationale: "Local Python environment." },
  { pattern: "*.log", rationale: "Logs may contain local runtime details." },
  { pattern: "*.tmp", rationale: "Temporary files." },
  { pattern: "*.temp", rationale: "Temporary files." },
  { pattern: "*.zip", rationale: "Archives should not be nested into the export." },
  { pattern: "*.tar", rationale: "Archives should not be nested into the export." },
  { pattern: "*.tar.gz", rationale: "Archives should not be nested into the export." },
  { pattern: "*.tgz", rationale: "Archives should not be nested into the export." },
  { pattern: "*.pem", rationale: "Private keys or certificates." },
  { pattern: "*.key", rationale: "Private keys or credentials." },
  { pattern: "*.p12", rationale: "Private certificate bundle." },
  { pattern: "*.pfx", rationale: "Private certificate bundle." },
  { pattern: "*.tsbuildinfo", rationale: "Generated TypeScript cache." },
  { pattern: "*.bak*", rationale: "Backups/debris." },
  { pattern: "__pycache__/", rationale: "Generated Python cache." },
  { pattern: "docs/audit/audit_*.md", rationale: "Generated audit notes are not canonical source docs." },
  { pattern: "docs/audit/session_*.md", rationale: "Generated session notes are not canonical source docs." },
  { pattern: ".auth-*.txt", rationale: "Local auth scratch files." },
  { pattern: ".copilot-*.txt", rationale: "Local assistant scratch files." },
  { pattern: "copilot-*.txt", rationale: "Local assistant scratch files." },
  { pattern: "*_copilot*.txt", rationale: "Local assistant scratch files." },
  { pattern: "payload.json", rationale: "Scratch payload file." },
  { pattern: "generate_text.py", rationale: "Local scratch helper." },
  { pattern: "get-pip.py", rationale: "Local bootstrap helper." },
]);

const EXPORT_MANIFEST_NAME = "EXPORT_MANIFEST.json";
const EXPORT_SHA256SUMS_NAME = "SHA256SUMS.txt";
const MAX_EXCLUDED_MATCHES = 500;
const MAX_FORBIDDEN_EXAMPLES = 200;

function normalizeRel(value) {
  return value.split(path.sep).join("/").replace(/^\/+/, "");
}

function repoRootFromScript() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseArgs(argv) {
  const args = {
    sourceRoot: repoRootFromScript(),
    destination: "",
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--source") {
      args.sourceRoot = path.resolve(argv[index + 1] ?? args.sourceRoot);
      index += 1;
    } else if (!arg.startsWith("--") && !args.destination) {
      args.destination = arg;
    } else {
      throw new Error(`Unknown export argument: ${arg}`);
    }
  }

  if (!args.destination) {
    throw new Error("Usage: pnpm export:safe -- [--dry-run] <output-dir>");
  }

  return args;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function validateDestination(sourceRoot, destination) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedDestination = path.resolve(destination);

  if (resolvedDestination === resolvedSource || isInside(resolvedDestination, resolvedSource)) {
    throw new Error("Refusing to export into the repo root or a parent of the repo root.");
  }

  if (isInside(resolvedSource, resolvedDestination)) {
    throw new Error("Refusing to export into a directory inside the repo; choose /tmp or another external path.");
  }

  return resolvedDestination;
}

function basenameMatchesAny(rel, predicates) {
  const base = path.posix.basename(rel);
  return predicates.some((predicate) => predicate(base, rel));
}

function isExcludedPath(rel, isDirectory) {
  const normalized = normalizeRel(rel);
  const base = path.posix.basename(normalized);

  if (
    EXPORT_BUNDLES.some((bundle) => normalized === bundle.zipName)
    || normalized === EXPORT_SHA256SUMS_NAME
  ) {
    return false;
  }

  if (!normalized || normalized === EXPORT_MANIFEST_NAME) return false;

  const directoryPrefixes = [
    ".git",
    ".direnv",
    ".vercel",
    ".next",
    "node_modules",
    "artifacts/mac-mini",
    "artifacts/reports",
    "artifacts/audit",
    "artifacts/release",
    "artifacts/visual",
    "logs",
    "playwright-report",
    "test-results",
    "blob-report",
    "coverage",
    "tmp",
    ".tmp",
    ".venv",
    ".venv311",
    "venv",
    "myenv",
  ];

  if (directoryPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return true;
  }

  if (isDirectory && (base === "__pycache__" || base.endsWith("_bak"))) {
    return true;
  }

  if (
    normalized.startsWith("docs/audit/audit_")
    || normalized.startsWith("docs/audit/session_")
  ) {
    return true;
  }

  return basenameMatchesAny(normalized, [
    (fileName) => fileName.startsWith(".env"),
    (fileName) => fileName === ".envrc",
    (fileName) => fileName === ".DS_Store",
    (fileName) => fileName === "next-env.d.ts",
    (fileName) => fileName === "payload.json",
    (fileName) => fileName === "generate_text.py",
    (fileName) => fileName === "get-pip.py",
    (fileName) => fileName.startsWith(".auth-") && fileName.endsWith(".txt"),
    (fileName) => fileName.startsWith(".copilot-") && fileName.endsWith(".txt"),
    (fileName) => fileName.startsWith("copilot-") && fileName.endsWith(".txt"),
    (fileName) => fileName.includes("_copilot") && fileName.endsWith(".txt"),
    (fileName) => fileName.endsWith(".log"),
    (fileName) => fileName.endsWith(".tmp"),
    (fileName) => fileName.endsWith(".temp"),
    (fileName) => fileName.endsWith(".zip"),
    (fileName) => fileName.endsWith(".tar"),
    (fileName) => fileName.endsWith(".tar.gz"),
    (fileName) => fileName.endsWith(".tgz"),
    (fileName) => fileName.endsWith(".pem"),
    (fileName) => fileName.endsWith(".key"),
    (fileName) => fileName.endsWith(".p12"),
    (fileName) => fileName.endsWith(".pfx"),
    (fileName) => fileName.endsWith(".tsbuildinfo"),
    (fileName) => fileName.endsWith(".pyc"),
    (fileName) => fileName.includes(".bak"),
  ]);
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function countFiles(directoryPath) {
  let count = 0;
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(fullPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function removeIfExists(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function existingBundleEntries(destination, entries) {
  return entries.filter((entry) => fs.existsSync(path.join(destination, entry)));
}

function copySafeTree(sourceRoot, destination) {
  const copiedFiles = [];
  const excludedMatches = [];

  function walk(sourceDirectory, relativeDirectory = "") {
    fs.mkdirSync(path.join(destination, relativeDirectory), { recursive: true });

    for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
      const sourcePath = path.join(sourceDirectory, entry.name);
      const rel = normalizeRel(path.join(relativeDirectory, entry.name));
      const isDirectory = entry.isDirectory();
      if (isExcludedPath(rel, isDirectory)) {
        if (excludedMatches.length < MAX_EXCLUDED_MATCHES) {
          excludedMatches.push(rel + (isDirectory ? "/" : ""));
        }
        removeIfExists(path.join(destination, rel));
        continue;
      }

      const destinationPath = path.join(destination, rel);
      if (isDirectory) {
        walk(sourcePath, rel);
      } else if (entry.isFile()) {
        fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
        fs.copyFileSync(sourcePath, destinationPath);
        fs.chmodSync(destinationPath, fs.statSync(sourcePath).mode);
        copiedFiles.push(rel);
      }
    }
  }

  walk(sourceRoot);
  return { copiedFiles, excludedMatches };
}

function scanForbiddenPresent(destination) {
  const matches = [];
  if (!fs.existsSync(destination)) {
    return matches;
  }

  function walk(directory, relativeDirectory = "") {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const rel = normalizeRel(path.join(relativeDirectory, entry.name));
      const isDirectory = entry.isDirectory();
      if (rel === EXPORT_MANIFEST_NAME) continue;
      if (isExcludedPath(rel, isDirectory)) {
        if (matches.length < MAX_FORBIDDEN_EXAMPLES) {
          matches.push(rel + (isDirectory ? "/" : ""));
        }
        continue;
      }
      if (isDirectory) {
        walk(path.join(directory, entry.name), rel);
      }
    }
  }

  walk(destination);
  return matches;
}

function createExportBundles(destination) {
  const bundles = [];

  for (const bundle of EXPORT_BUNDLES) {
    const entries = existingBundleEntries(destination, bundle.entries);
    const zipPath = path.join(destination, bundle.zipName);
    removeIfExists(zipPath);

    if (entries.length === 0) {
      bundles.push({
        ...bundle,
        plannedEntries: bundle.entries,
        includedEntries: entries,
        presentInExport: false,
        sha256: null,
        sizeBytes: 0,
        error: "No bundle entries exist in sanitized export.",
      });
      continue;
    }

    const zipResult = spawnSync("zip", ["-qr", bundle.zipName, ...entries], {
      cwd: destination,
      encoding: "utf8",
    });
    if (zipResult.status !== 0) {
      const errorText = [zipResult.stderr, zipResult.stdout].filter(Boolean).join("\n").trim();
      throw new Error(`Failed to create ${bundle.zipName}: ${errorText || "zip command failed"}`);
    }

    bundles.push({
      ...bundle,
      plannedEntries: bundle.entries,
      includedEntries: entries,
      presentInExport: fs.existsSync(zipPath),
      sha256: fs.existsSync(zipPath) ? sha256File(zipPath) : null,
      sizeBytes: fs.existsSync(zipPath) ? fs.statSync(zipPath).size : 0,
    });
  }

  const sha256SumsPath = path.join(destination, EXPORT_SHA256SUMS_NAME);
  const lines = bundles
    .filter((bundle) => bundle.presentInExport && bundle.sha256)
    .map((bundle) => `${bundle.sha256}  ${bundle.zipName}`);
  fs.writeFileSync(sha256SumsPath, `${lines.join("\n")}\n`);

  return {
    bundles,
    sha256SumsPath,
    sha256SumsPresent: fs.existsSync(sha256SumsPath),
  };
}

function criticalPathProof(sourceRoot, destination, mode) {
  return CRITICAL_EXPORT_PATHS.map((entry) => {
    const sourcePath = path.join(sourceRoot, entry.path);
    const exportPath = path.join(destination, entry.path);
    const sourceExists = fs.existsSync(sourcePath);
    const exportExists = mode === "dry-run" ? null : fs.existsSync(exportPath);
    const proof = {
      ...entry,
      existsInSource: sourceExists,
      presentInExport: exportExists,
      plannedForExport: sourceExists && !isExcludedPath(entry.path, entry.kind === "dir"),
    };

    if (sourceExists && fs.statSync(sourcePath).isFile()) {
      proof.sourceSha256 = sha256File(sourcePath);
    }
    if (exportExists && fs.statSync(exportPath).isFile()) {
      proof.exportSha256 = sha256File(exportPath);
    }
    if (sourceExists && fs.statSync(sourcePath).isDirectory()) {
      proof.sourceFileCount = countFiles(sourcePath);
    }
    if (exportExists && fs.statSync(exportPath).isDirectory()) {
      proof.exportFileCount = countFiles(exportPath);
    }

    return proof;
  });
}

export function buildExportManifest({
  sourceRoot,
  destination,
  mode,
  copiedFiles = [],
  excludedMatches = [],
  bundles = null,
  sha256SumsPresent = null,
}) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedDestination = path.resolve(destination);
  const criticalPaths = criticalPathProof(resolvedSource, resolvedDestination, mode);
  const forbiddenPresent = mode === "dry-run" ? [] : scanForbiddenPresent(resolvedDestination);
  const missingCritical = criticalPaths.filter((entry) => {
    if (!entry.existsInSource || !entry.plannedForExport) return true;
    return mode === "dry-run" ? false : entry.presentInExport !== true;
  });
  const hashMismatches = criticalPaths.filter((entry) =>
    entry.sourceSha256 && entry.exportSha256 && entry.sourceSha256 !== entry.exportSha256
  );
  const emptyCriticalDirs = criticalPaths.filter((entry) =>
    entry.kind === "dir"
    && (entry.sourceFileCount ?? 0) === 0
  );
  const bundleProof = bundles ?? EXPORT_BUNDLES.map((bundle) => ({
    ...bundle,
    plannedEntries: bundle.entries,
    includedEntries: mode === "dry-run" ? bundle.entries : [],
    presentInExport: mode === "dry-run" ? null : false,
    sha256: null,
    sizeBytes: 0,
  }));
  const missingBundles = mode === "dry-run"
    ? []
    : bundleProof.filter((bundle) => !bundle.presentInExport || !bundle.sha256 || bundle.sizeBytes <= 0);
  const missingSha256Sums = mode === "dry-run" ? false : sha256SumsPresent !== true;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode,
    sourceRoot: resolvedSource,
    destination: resolvedDestination,
    packageManager: "pnpm",
    manifestPath: EXPORT_MANIFEST_NAME,
    criticalPaths,
    bundles: bundleProof,
    sha256SumsPath: EXPORT_SHA256SUMS_NAME,
    sha256SumsPresent: mode === "dry-run" ? null : sha256SumsPresent,
    excludedForbiddenPaths: EXCLUDED_EXPORT_RULES,
    excludedMatchesSample: excludedMatches.slice(0, MAX_EXCLUDED_MATCHES),
    copiedFileCount: mode === "dry-run" ? 0 : copiedFiles.length,
    forbiddenPresentInExport: forbiddenPresent,
    summary: {
      ok: missingCritical.length === 0
        && forbiddenPresent.length === 0
        && hashMismatches.length === 0
        && emptyCriticalDirs.length === 0
        && missingBundles.length === 0
        && !missingSha256Sums,
      missingCriticalPaths: missingCritical.map((entry) => entry.path),
      forbiddenPresentCount: forbiddenPresent.length,
      hashMismatches: hashMismatches.map((entry) => entry.path),
      emptyCriticalDirs: emptyCriticalDirs.map((entry) => entry.path),
      missingBundles: missingBundles.map((bundle) => bundle.name),
      missingSha256Sums,
    },
  };
}

export function writeExportManifest(destination, manifest) {
  fs.mkdirSync(destination, { recursive: true });
  const manifestPath = path.join(destination, EXPORT_MANIFEST_NAME);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

export function runSafeExport(args) {
  const destination = validateDestination(args.sourceRoot, args.destination);
  fs.mkdirSync(destination, { recursive: true });

  const mode = args.dryRun ? "dry-run" : "export";
  const copyResult = args.dryRun
    ? { copiedFiles: [], excludedMatches: [] }
    : copySafeTree(args.sourceRoot, destination);
  const bundleResult = args.dryRun
    ? { bundles: null, sha256SumsPresent: null }
    : createExportBundles(destination);
  const manifest = buildExportManifest({
    sourceRoot: args.sourceRoot,
    destination,
    mode,
    copiedFiles: copyResult.copiedFiles,
    excludedMatches: copyResult.excludedMatches,
    bundles: bundleResult.bundles,
    sha256SumsPresent: bundleResult.sha256SumsPresent,
  });
  const manifestPath = writeExportManifest(destination, manifest);

  if (!manifest.summary.ok) {
    const details = JSON.stringify(manifest.summary, null, 2);
    throw new Error(`Safe export manifest validation failed:\n${details}`);
  }

  return {
    destination,
    manifestPath,
    manifest,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = runSafeExport(args);
  console.log(`Sanitized export ${args.dryRun ? "dry run" : "created"} at ${result.destination}`);
  console.log(`Manifest: ${result.manifestPath}`);
  console.log(
    "Bundles: 01-app-root.zip 02-db-scripts-ops-tests.zip 03-docs-audit-artifacts.zip"
  );
  console.log(
    "Excluded: .git .env* .next node_modules logs artifacts/mac-mini temp/test/build artifacts pre-existing archives local envs secrets"
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
