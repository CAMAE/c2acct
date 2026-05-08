import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const proofPath = path.join(process.cwd(), "artifacts", "launch-proof", "validation-results.json");
const repoRoot = process.cwd();

// Closes AUDIT-D7-002. When the operator already ran `pnpm release:prelaunch` before this chain,
// canonical-root.json is fresh (mtime >= HEAD commit timestamp) AND its commitSha matches HEAD.
// In that case, validate:launch's own `build` + `standalone:local:check` + `release:prelaunch`
// steps are redundant rebuilds that mint a new BUILD_ID and create release-source-of-truth drift
// (Day-7 Block 4). Skip them when the prior prelaunch artifact already covers HEAD.
const SKIPPABLE_IF_FRESH = new Set(["build", "standalone:local:check", "release:prelaunch"]);

function isPrelaunchFresh(root: string): { fresh: boolean; reason: string } {
  try {
    const canonicalPath = path.join(root, "artifacts/mac-mini/state/canonical-root.json");
    if (!fs.existsSync(canonicalPath)) {
      return { fresh: false, reason: "canonical-root.json missing" };
    }
    const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
    const headSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (canonical.commitSha !== headSha) {
      return {
        fresh: false,
        reason: `commitSha mismatch canonical=${String(canonical.commitSha).slice(0, 7)} head=${headSha.slice(0, 7)}`,
      };
    }
    const fileMtimeMs = fs.statSync(canonicalPath).mtimeMs;
    const headTimeSec = Number(
      execFileSync("git", ["log", "-1", "--format=%ct", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim()
    );
    if (!Number.isFinite(headTimeSec)) {
      return { fresh: false, reason: "git log %ct returned non-numeric" };
    }
    const headTimeMs = headTimeSec * 1000;
    if (fileMtimeMs < headTimeMs) {
      return {
        fresh: false,
        reason: `mtime ${new Date(fileMtimeMs).toISOString()} < head ${new Date(headTimeMs).toISOString()}`,
      };
    }
    return {
      fresh: true,
      reason: `canonical-root.json matches HEAD ${headSha.slice(0, 7)} and is fresh (mtime ${new Date(fileMtimeMs).toISOString()})`,
    };
  } catch (error) {
    // Fail closed: if git is unavailable or any check throws, run the full chain.
    return {
      fresh: false,
      reason: `freshness probe error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

const steps = [
  { command: packageManagerCommand, args: ["prisma:generate"], proofKey: "prismaGenerate" },
  { command: packageManagerCommand, args: ["db:recreate"] },
  { command: packageManagerCommand, args: ["db:wait"] },
  { command: packageManagerCommand, args: ["prisma:migrate:local"], proofKey: "prismaMigrateLocal" },
  { command: packageManagerCommand, args: ["seed:baseline"] },
  { command: packageManagerCommand, args: ["seed:pat-runtime"] },
  { command: packageManagerCommand, args: ["lint:test"], proofKey: "lintTest" },
  { command: packageManagerCommand, args: ["validate:db"] },
  { command: packageManagerCommand, args: ["typecheck"], proofKey: "typecheck" },
  { command: packageManagerCommand, args: ["test:unit"], proofKey: "unit" },
  { command: packageManagerCommand, args: ["build"], proofKey: "build" },
  { command: packageManagerCommand, args: ["standalone:local:check"] },
  { command: packageManagerCommand, args: ["release:prelaunch"], proofKey: "releasePrelaunch" },
  { command: packageManagerCommand, args: ["test:e2e:local-review"], proofKey: "localReviewE2e" },
  { command: packageManagerCommand, args: ["test:e2e:release-integrity"] },
  { command: "bash", args: ["scripts/mac-mini/restart-app.sh"] },
  { command: "bash", args: ["scripts/mac-mini/launchd-check.sh"] },
  { command: "bash", args: ["scripts/mac-mini/port-owner-proof.sh"] },
] as const;

const commandResults: Record<string, {
  status: "COMPLETE" | "CONFLICTING";
  summary: string;
  completedAt: string | null;
}> = {};

function proofCommand(step: { command: string; args: readonly string[] }) {
  return `${step.command === packageManagerCommand ? "pnpm" : step.command} ${step.args.join(" ")}`;
}

const freshness = isPrelaunchFresh(repoRoot);
if (freshness.fresh) {
  console.log(`==> Prelaunch freshness: ${freshness.reason}`);
  console.log(`==> Skipping ${[...SKIPPABLE_IF_FRESH].join(", ")} — covered by recent pnpm release:prelaunch run.`);
} else {
  console.log(`==> Prelaunch freshness: stale or unknown (${freshness.reason}); running full chain.`);
}

for (const step of steps) {
  const { command, args } = step;
  const proofKey = "proofKey" in step ? step.proofKey : undefined;
  const rendered = [command, ...args].join(" ");
  const stepName = command === packageManagerCommand ? args[0] : "";

  if (freshness.fresh && SKIPPABLE_IF_FRESH.has(stepName)) {
    console.log(`\n==> ${rendered} (SKIPPED — ${freshness.reason})`);
    if (proofKey) {
      commandResults[proofKey] = {
        status: "COMPLETE",
        summary: `${proofCommand(step)} skipped — ${freshness.reason}.`,
        completedAt: new Date().toISOString(),
      };
    }
    continue;
  }

  console.log(`\n==> ${rendered}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    if (proofKey) {
      commandResults[proofKey] = {
        status: "CONFLICTING",
        summary: `${proofCommand(step)} failed with exit code ${result.status ?? 1}.`,
        completedAt: new Date().toISOString(),
      };
    }
    process.exit(result.status ?? 1);
  }

  if (proofKey) {
    commandResults[proofKey] = {
      status: "COMPLETE",
      summary: `${proofCommand(step)} passed during pnpm validate:launch.`,
      completedAt: new Date().toISOString(),
    };
  }
}

commandResults.validateLaunch = {
  status: "COMPLETE",
  summary: "pnpm validate:launch completed the full local launch validation chain.",
  completedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(proofPath), { recursive: true });
fs.writeFileSync(
  proofPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      generatedBy: "pnpm validate:launch",
      commands: commandResults,
    },
    null,
    2
  )}\n`
);

console.log("\nPASS validate-launch: PAT launch validation completed.");
