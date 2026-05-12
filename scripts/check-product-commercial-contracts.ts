import { spawnSync } from "node:child_process";

const targets = [
  "tests/product-assessment-runtime.contract.test.ts",
  "tests/firm-product-assessment.contract.test.ts",
  "tests/vendor-product-assessment.contract.test.ts",
  "tests/vendor-product-insight.contract.test.ts",
  "tests/vendor-alignment.contract.test.ts",
  "tests/membership-content.contract.test.ts",
  "tests/membership-resolver.contract.test.ts",
  "tests/portal-panels.contract.test.ts",
  "tests/billing.contract.test.ts",
  "tests/admin-control-plane.contract.test.ts",
];

const result = spawnSync("npx", ["vitest", "run", ...targets], {
  stdio: "inherit",
  env: process.env,
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

console.log(
  `PASS check-product-commercial-contracts: ${targets.length} product, membership, billing, and operator contract suites passed.`
);
