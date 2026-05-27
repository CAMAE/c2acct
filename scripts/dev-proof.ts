import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnv } from "./_shared/prismaScript";
import {
  assertStartupRoot,
  probePatHomepage,
  renderProbeFailure,
  waitForPatHomepage,
} from "./startup-guard";

type ParsedArgs = {
  port: number;
  portWasExplicit: boolean;
};

const DEFAULT_PROOF_PORT = 3001;
const MAX_FALLBACK_PORT = 3010;
const PROOF_PORT_ENV = "PAT_LOCAL_PROOF_PORT";
const DEFAULT_LOCAL_REVIEW_PASSWORD = "pat-local-review";
const DEFAULT_LOCAL_AUTH_SECRET = "pat-local-auth-secret";
const LOCK_PATH = path.join(process.cwd(), ".next", "dev", "lock");
const LOCAL_REVIEW_MARKER = "Development-only local review auth";

function parseArgs(argv: string[]): ParsedArgs {
  const configuredPort = process.env[PROOF_PORT_ENV] ?? "";
  const parsed: ParsedArgs = {
    port: Number(configuredPort || DEFAULT_PROOF_PORT),
    portWasExplicit: Boolean(configuredPort),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port") {
      parsed.port = Number(argv[index + 1] ?? parsed.port);
      parsed.portWasExplicit = true;
      index += 1;
    }
  }

  if (!Number.isInteger(parsed.port) || parsed.port < 1 || parsed.port > 65_535) {
    throw new Error(`PAT browser proof requires a valid TCP port. Received ${String(parsed.port)}.`);
  }

  return parsed;
}

function hasDevLock() {
  return fs.existsSync(LOCK_PATH);
}

function isPortFree(port: number) {
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

async function isReusableProofServer(port: number) {
  try {
    const homepageProbe = await probePatHomepage(`http://127.0.0.1:${port}`, "dev");
    if (!homepageProbe.ok) {
      return false;
    }

    const response = await fetch(`http://127.0.0.1:${port}/sign-in?view=vendor`, {
      redirect: "manual",
    });
    if (!response.ok) {
      return false;
    }

    const html = await response.text();
    return html.includes(LOCAL_REVIEW_MARKER);
  } catch {
    return false;
  }
}

function getCandidatePorts(preferredPort: number, explicit: boolean) {
  if (explicit) {
    return [preferredPort];
  }

  const ports: number[] = [];
  for (let port = preferredPort; port <= MAX_FALLBACK_PORT; port += 1) {
    ports.push(port);
  }
  return ports;
}

async function resolveProofPort(preferredPort: number, explicit: boolean) {
  const candidates = getCandidatePorts(preferredPort, explicit);

  for (const candidate of candidates) {
    if (await isReusableProofServer(candidate)) {
      return {
        mode: "reuse" as const,
        port: candidate,
      };
    }
  }

  if (hasDevLock()) {
    throw new Error(
      `PAT browser proof found an existing Next dev lock at ${LOCK_PATH}, but no reusable proof server was reachable on ${candidates
        .map((port) => `127.0.0.1:${port}`)
        .join(", ")}. Stop the other Next dev instance or remove the stale lock only if you are sure no PAT dev server is still running.`
    );
  }

  for (const candidate of candidates) {
    if (await isPortFree(candidate)) {
      return {
        mode: "launch" as const,
        port: candidate,
      };
    }
  }

  if (explicit) {
    throw new Error(
      `PAT browser proof cannot use explicit loopback port 127.0.0.1:${preferredPort} because it is already in use. Choose another port with \`--port\` or \`${PROOF_PORT_ENV}=\`.`
    );
  }

  throw new Error(
    `PAT browser proof could not find a free or reusable loopback port in 127.0.0.1:${preferredPort}-${MAX_FALLBACK_PORT}.`
  );
}

function resolveProofEnv(port: number) {
  loadEnv();

  const origin = `http://127.0.0.1:${port}`;
  const authSecret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    DEFAULT_LOCAL_AUTH_SECRET;
  const localReviewPassword =
    process.env.PAT_LOCAL_REVIEW_PASSWORD?.trim() || DEFAULT_LOCAL_REVIEW_PASSWORD;

  return {
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    AUTH_URL: origin,
    NEXTAUTH_URL: origin,
    AUTH_SECRET: authSecret,
    PAT_LOCAL_ORIGIN: origin,
    PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    PAT_LOCAL_REVIEW_PASSWORD: localReviewPassword,
  };
}

async function main() {
  assertStartupRoot("dev");
  const args = parseArgs(process.argv.slice(2));
  const resolution = await resolveProofPort(args.port, args.portWasExplicit);
  const origin = `http://127.0.0.1:${resolution.port}`;

  if (resolution.mode === "reuse") {
    console.log(
      `Reusing existing PAT browser proof server at ${origin}. Another Next dev instance already holds the workspace lock.`
    );
    return;
  }

  console.log(`Launching PAT browser proof server at ${origin}`);
  const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "next", "dev", "--webpack", "-H", "127.0.0.1", "-p", String(resolution.port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...resolveProofEnv(resolution.port),
      } as NodeJS.ProcessEnv,
      stdio: "inherit",
    }
  );

  const stopChild = (signal: NodeJS.Signals) => {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));

  await delay(250);
  const homepageProbe = await waitForPatHomepage(origin, "dev", 45_000);
  if (!homepageProbe.ok) {
    stopChild("SIGTERM");
    await delay(250);
    if (child.exitCode === null) {
      stopChild("SIGKILL");
    }
    throw new Error(renderProbeFailure(homepageProbe));
  }

  await new Promise<void>((resolve, reject) => {
    child.once("exit", (code) => {
      if (code && code !== 0) {
        reject(new Error(`PAT browser proof dev server exited with status ${code}.`));
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
