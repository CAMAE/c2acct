import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnv } from "./_shared/prismaScript";
import { assertStartupRoot, renderProbeFailure, waitForPatHomepage } from "./startup-guard";

type ParsedArgs = {
  check: boolean;
  port: number;
  portWasExplicit: boolean;
  timeoutMs: number;
};

const SECRET_MISSING_MARKER =
  "Local review sign-in is blocked because AUTH_SECRET or NEXTAUTH_SECRET is missing.";
const DEFAULT_LOCAL_REVIEW_PASSWORD = "pat-local-review";
const DEFAULT_LOCAL_AUTH_SECRET = "pat-local-auth-secret";
const LOCAL_STANDALONE_PORT_ENV = "PAT_LOCAL_STANDALONE_PORT";

function parseArgs(argv: string[]): ParsedArgs {
  const configuredPort = process.env[LOCAL_STANDALONE_PORT_ENV] ?? process.env.PORT ?? "3000";
  const parsed: ParsedArgs = {
    check: false,
    port: Number(configuredPort),
    portWasExplicit: Boolean(process.env[LOCAL_STANDALONE_PORT_ENV]),
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
      parsed.portWasExplicit = true;
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

function ensureValidPort(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PAT local standalone requires a valid TCP port. Received ${String(port)}.`);
  }

  return port;
}

function probeLoopbackPort(port: number) {
  return new Promise<boolean>((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error: NodeJS.ErrnoException) => {
      server.close();
      if (error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function resolveProofPort(preferredPort: number, portWasExplicit: boolean) {
  const safePreferredPort = ensureValidPort(preferredPort);

  if (await probeLoopbackPort(safePreferredPort)) {
    return {
      port: safePreferredPort,
      fallbackFrom: null as number | null,
    };
  }

  if (portWasExplicit) {
    throw new Error(
      `PAT local standalone cannot bind to explicit proof port 127.0.0.1:${safePreferredPort} because it is already in use. Choose another loopback port with \`--port\` or \`${LOCAL_STANDALONE_PORT_ENV}=\`.`
    );
  }

  for (let offset = 1; offset <= 10; offset += 1) {
    const candidate = safePreferredPort + offset;
    if (candidate > 65_535) {
      break;
    }

    if (await probeLoopbackPort(candidate)) {
      return {
        port: candidate,
        fallbackFrom: safePreferredPort,
      };
    }
  }

  throw new Error(
    `PAT local standalone could not find a free loopback proof port starting at 127.0.0.1:${safePreferredPort}. Tried ${safePreferredPort}-${Math.min(
      safePreferredPort + 10,
      65_535
    )}.`
  );
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
  const localReviewPassword =
    process.env.PAT_LOCAL_REVIEW_PASSWORD?.trim() || DEFAULT_LOCAL_REVIEW_PASSWORD;

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
  assertStartupRoot("standalone");
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
    const homepageProbe = await waitForPatHomepage(baseUrl, "standalone", timeoutMs);
    if (!homepageProbe.ok) {
      throw new Error(renderProbeFailure(homepageProbe));
    }

    const signInResponse = await waitForOkResponse(`${baseUrl}/sign-in?view=vendor`, timeoutMs);
    const signInHtml = await signInResponse.text();

    if (signInHtml.includes(SECRET_MISSING_MARKER)) {
      throw new Error(
        "PAT local standalone started, but the sign-in page still rendered the missing-secret local review warning."
      );
    }

    const health = await readHealthStatus(baseUrl);
    console.log(
      `PASS standalone:local:check: PAT standalone is serving on ${baseUrl}${homepageProbe.releaseId ? ` (Release ${homepageProbe.releaseId})` : ""} with homepage and /api/release-fingerprint agreement proved, local review auth secret present, and db health status=${String(
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
  assertStartupRoot("standalone");
  const args = parseArgs(process.argv.slice(2));
  const serverPath = assertStandaloneBuildPresent();
  const portResolution = await resolveProofPort(args.port, args.portWasExplicit);
  const env = resolveStandaloneEnv(portResolution.port);

  if (portResolution.fallbackFrom !== null) {
    console.log(
      `PAT local standalone proof port 127.0.0.1:${portResolution.fallbackFrom} is busy; using 127.0.0.1:${portResolution.port} instead.`
    );
  }

  if (args.check) {
    await runStandaloneCheck(portResolution.port, args.timeoutMs);
    return;
  }

  console.log(`Launching PAT local standalone on http://127.0.0.1:${portResolution.port}`);
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

  const homepageProbe = await waitForPatHomepage(
    `http://127.0.0.1:${portResolution.port}`,
    "standalone",
    args.timeoutMs
  );
  if (!homepageProbe.ok) {
    stopChild("SIGTERM");
    await delay(250);
    if (child.exitCode === null) {
      stopChild("SIGKILL");
    }
    throw new Error(renderProbeFailure(homepageProbe));
  }

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
