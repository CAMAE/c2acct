#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      args.root = path.resolve(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

function normalize(content) {
  return content.replace(/\s+/g, " ");
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = path.join(args.root, "ops/release/pat-surface-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const failures = [];
const checks = [];
const protectedFiles = new Set();

for (const [routeKey, routeConfig] of Object.entries(manifest.routes)) {
  const files = routeConfig.sourceFiles ?? [];
  const content = normalize(
    files
      .map((filePath) => {
        protectedFiles.add(filePath);
        return fs.readFileSync(path.join(args.root, filePath), "utf8");
      })
      .join("\n")
  );

  for (const marker of routeConfig.positiveMarkers ?? []) {
    const ok = content.includes(marker);
    checks.push({ route: routeKey, type: "positive", marker, ok });
    if (!ok) {
      failures.push(`${routeKey}:missing_positive:${marker}`);
    }
  }

  for (const marker of routeConfig.forbiddenMarkers ?? []) {
    const ok = !content.includes(marker);
    checks.push({ route: routeKey, type: "forbidden", marker, ok });
    if (!ok) {
      failures.push(`${routeKey}:forbidden_marker:${marker}`);
    }
  }
}

for (const filePath of protectedFiles) {
  const content = normalize(fs.readFileSync(path.join(args.root, filePath), "utf8"));
  for (const marker of manifest.globalForbiddenMarkers ?? []) {
    if (content.includes(marker)) {
      failures.push(`${filePath}:global_forbidden_marker:${marker}`);
    }
  }
}

const result = {
  ok: failures.length === 0,
  manifest: manifestPath,
  protectedFiles: Array.from(protectedFiles),
  checks,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
