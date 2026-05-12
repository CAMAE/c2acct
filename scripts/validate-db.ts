import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "db:wait"]],
  ["npm", ["run", "prisma:migrate:local"]],
  ["npm", ["run", "seed:baseline"]],
  ["npm", ["run", "seed:pat-runtime"]],
  ["node", ["scripts/check-question-count.js"]],
  ["node", ["--import", "tsx", "scripts/check-pat-runtime-consistency.ts"]],
  ["node", ["--import", "tsx", "scripts/check-capability-mappings.ts"]],
  ["node", ["--import", "tsx", "scripts/check-product-commercial-contracts.ts"]],
  ["node", ["scripts/verify-firm-capability-mappings.js"]],
  ["node", ["scripts/verify-firm-capability-submit.js"]],
  ["node", ["--import", "tsx", "scripts/verify-firm-insight-unlocks.ts"]],
  ["node", ["--import", "tsx", "scripts/smoke-score-unlock-contract.ts"]],
  ["node", ["--import", "tsx", "scripts/smoke-vendor-alignment-engine.ts"]],
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
