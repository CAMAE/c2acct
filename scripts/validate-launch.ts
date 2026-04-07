import { spawnSync } from "node:child_process";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const steps = [
  [packageManagerCommand, ["db:recreate"]],
  [packageManagerCommand, ["validate:db"]],
  [packageManagerCommand, ["build"]],
  [packageManagerCommand, ["standalone:local:check"]],
  [packageManagerCommand, ["typecheck"]],
  [packageManagerCommand, ["test"]],
  [packageManagerCommand, ["test:e2e"]],
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
