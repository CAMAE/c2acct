import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnv } from "./_shared/prismaScript";

type ParsedArgs = {
  check: boolean;
  port: number;
  timeoutMs: number;
};

const SECRET_MISSING_MARKER =
  "Local review sign-in is blocked because AUTH_SECRET or NEXTAUTH_SECRET is missing.";
const DEFAULT_LOCAL_REVIEW_PASSWORD = "pat-local-review";
const DEFAULT_LOCAL_AUTH_SECRET = "pat-local-auth-secret";

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    check: false,
    port: Number(process.env.PORT ?? 3000),
    timeoutMs: 45_000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      parsed.check = true;
      continue;
    }

    if (arg === "--port") {
      parsed.port = Number(argv[index + 1] ?? parsed.port);
      index += 1;
      continue;
    }

    if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(argv[index + 1] ?? parsed.timeoutMs);
      index += 1;
    }
  }

  return parsed;
}

function isLoopbackUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function resolveStandaloneEnv(port: number) {
  loadEnv();

  const origin = `http://127.0.0.1:${port}`;
  const authUrl = origin;
  const nextAuthUrl = origin;
  const authSecret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    DEFAULT_LOCAL_AUTH_SECRET;
  const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD?.trim() || DEFAULT_LOCAL_REVIEW_PASSWORD;

  const failures: string[] = [];

  if (!isLoopbackUrl(authUrl) || !isLoopbackUrl(nextAuthUrl)) {
    failures.push(
      `PAT local standalone requires loopback AUTH_URL and NEXTAUTH_URL. Resolved AUTH_URL=${authUrl} NEXTAUTH_URL=${nextAuthUrl}.`
    );
  }

  if (!authSecret) {
    failures.push(
      "PAT local standalone requires AUTH_SECRET or NEXTAUTH_SECRET so Auth.js can create a real review session."
    );
  }

  if (!localReviewPassword) {
    failures.push(
      "PAT local standalone requires PAT_LOCAL_REVIEW_PASSWORD so deterministic review sign-in can stay honest."
    );
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" "));
  }

  return {
    HOSTNAME: process.env.HOSTNAME?.trim() || "127.0.0.1",
    PORT: String(port),
    NODE_ENV: "production",
    AUTH_URL: authUrl,
    NEXTAUTH_URL: nextAuthUrl,
    AUTH_SECRET: authSecret,
    PAT_LOCAL_ORIGIN: origin,
    PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    PAT_LOCAL_REVIEW_PASSWORD: localReviewPassword,
  };
}

function getStandaloneServerPath() {
  return path.join(process.cwd(), ".next", "standalone", "server.js");
}

function assertStandaloneBuildPresent() {
  const serverPath = getStandaloneServerPath();
  if (!fs.existsSync(serverPath)) {
    throw new Error(
      "PAT local standalone build is missing at .next/standalone/server.js. Run `pnpm build` before `pnpm standalone:local`."
    );
  }

  return serverPath;
}

async function waitForOkResponse(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.ok) {
        return response;
      }

      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function readHealthStatus(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/health/db`, { redirect: "manual" });
    const payload = await response.json().catch(() => null);
    return {
      status: response.status,
      ok: payload?.ok === true,
    };
  } catch {
    return {
      status: null,
      ok: false,
    };
  }
}

async function runStandaloneCheck(port: number, timeoutMs: number) {
  const serverPath = assertStandaloneBuildPresent();
  const env = {
    ...process.env,
    ...resolveStandaloneEnv(port),
  } as NodeJS.ProcessEnv;
  const child = spawn("node", [serverPath], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"] as const,
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const signInResponse = await waitForOkResponse(`${baseUrl}/sign-in?view=vendor`, timeoutMs);
    const signInHtml = await signInResponse.text();

    if (signInHtml.includes(SECRET_MISSING_MARKER)) {
      throw new Error(
        "PAT local standalone started, but the sign-in page still rendered the missing-secret local review warning."
      );
    }

    const health = await readHealthStatus(baseUrl);
    console.log(
      `PASS standalone:local:check: PAT standalone is serving on ${baseUrl} with local review auth secret present and db health status=${String(
        health.status ?? "unavailable"
      )} ok=${String(health.ok)}.`
    );
  } finally {
    child.kill("SIGTERM");
    await delay(250);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }

    if (child.exitCode && child.exitCode !== 0) {
      console.error(stdout);
      console.error(stderr);
      process.exit(child.exitCode);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const serverPath = assertStandaloneBuildPresent();
  const env = resolveStandaloneEnv(args.port);

  if (args.check) {
    await runStandaloneCheck(args.port, args.timeoutMs);
    return;
  }

  console.log(`Launching PAT local standalone on http://127.0.0.1:${args.port}`);
  const child = spawn("node", [serverPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    } as NodeJS.ProcessEnv,
    stdio: "inherit" as const,
  });

  const stopChild = (signal: NodeJS.Signals) => {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));

  await new Promise<void>((resolve, reject) => {
    child.once("exit", (code: number | null) => {
      if (code && code !== 0) {
        reject(new Error(`PAT local standalone exited with status ${code}.`));
        return;
      }

      resolve();
    });
    child.once("error", reject);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
