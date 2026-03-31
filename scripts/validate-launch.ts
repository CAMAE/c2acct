import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "db:recreate"]],
  ["npm", ["run", "validate:db"]],
  ["npm", ["run", "build"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "test"]],
  ["npm", ["run", "test:e2e"]],
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

console.log("\nPASS validate-launch: PAT launch validation completed.");
