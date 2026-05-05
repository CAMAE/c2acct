import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const proofPath = path.join(process.cwd(), "artifacts", "launch-proof", "validation-results.json");

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

for (const step of steps) {
  const { command, args } = step;
  const proofKey = "proofKey" in step ? step.proofKey : undefined;
  const rendered = [command, ...args].join(" ");
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
