import { spawnSync } from "node:child_process";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const steps = [
  [packageManagerCommand, ["db:wait"]],
  [packageManagerCommand, ["prisma:migrate:local"]],
  [packageManagerCommand, ["seed:baseline"]],
  [packageManagerCommand, ["seed:pat-runtime"]],
  ["node", ["--import", "tsx", "scripts/check-question-count.ts"]],
  ["node", ["--import", "tsx", "scripts/check-pat-runtime-consistency.ts"]],
  ["node", ["--import", "tsx", "scripts/check-capability-mappings.ts"]],
  ["node", ["--import", "tsx", "scripts/verify-firm-capability-mappings.ts"]],
  ["node", ["--import", "tsx", "scripts/verify-firm-capability-submit.ts"]],
  ["node", ["--import", "tsx", "scripts/verify-firm-insight-unlocks.ts"]],
  ["node", ["--import", "tsx", "scripts/smoke-score-unlock-contract.ts"]],
  ["node", ["--import", "tsx", "scripts/smoke-vendor-alignment-engine.ts"]],
  ["node", ["--import", "tsx", "scripts/smoke-ask-pat.ts"]],
] as const;

for (const [command, args] of steps) {
  const rendered = [command, ...args].join(" ");
  console.log(`\n==> ${rendered}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nPASS validate-db: local PAT database validation completed end to end.");
