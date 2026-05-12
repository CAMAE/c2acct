import { getResolvedAuthEnv } from "@/lib/auth/env";

const expectedOrigin = "https://patalign.com";

function fail(message: string) {
  console.error(`FAIL validate-patalign-production: ${message}`);
  process.exit(1);
}

const authEnv = getResolvedAuthEnv();
const macMiniHost = process.env.MAC_MINI_HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3000";
const publicOrigin = process.env.MAC_MINI_PUBLIC_ORIGIN ?? expectedOrigin;
const productionDomain = process.env.PAT_PRODUCTION_DOMAIN ?? "patalign.com";

if (productionDomain !== "patalign.com") {
  fail(`PAT_PRODUCTION_DOMAIN must be patalign.com. Received ${productionDomain}.`);
}

if (publicOrigin !== expectedOrigin) {
  fail(`MAC_MINI_PUBLIC_ORIGIN must be ${expectedOrigin}. Received ${publicOrigin}.`);
}

if (authEnv.normalizedBaseUrl !== expectedOrigin) {
  fail(`AUTH_URL must resolve to ${expectedOrigin}. Received ${authEnv.normalizedBaseUrl ?? "missing"}.`);
}

if (!authEnv.values.secret) {
  fail("AUTH_SECRET is missing.");
}

if (macMiniHost !== "127.0.0.1") {
  fail(`MAC_MINI_HOST must stay 127.0.0.1 behind the reverse proxy. Received ${macMiniHost}.`);
}

if (!/^\d+$/.test(port)) {
  fail(`PORT must be numeric. Received ${port}.`);
}

if (authEnv.warnings.length > 0) {
  fail(`Auth env warnings must be resolved before launch: ${authEnv.warnings.join(" | ")}`);
}

console.log("PASS validate-patalign-production");
console.log(`AUTH_URL=${authEnv.normalizedBaseUrl}`);
console.log(`MAC_MINI_PUBLIC_ORIGIN=${publicOrigin}`);
console.log(`MAC_MINI_HOST=${macMiniHost}`);
console.log(`PORT=${port}`);
