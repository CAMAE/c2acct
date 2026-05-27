import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { getPublicReleaseFingerprint, getPublicReleaseFingerprintMismatches } from "../lib/release/fingerprint";

type StartupKind = "dev" | "next-start" | "standalone";

type Contract = {
  canonicalRoot: string;
  forbiddenRoots?: string[];
  runtimeSourceType?: string;
  startCommand?: string;
};

type ManifestRoute = {
  positiveMarkers?: string[];
};

type Manifest = {
  globalForbiddenMarkers?: string[];
  routes: Record<string, ManifestRoute>;
};

export type HomepageProbeResult = {
  ok: boolean;
  baseUrl: string;
  status: number | null;
  releaseId: string | null;
  forbiddenMarkers: string[];
  missingMarkers: string[];
  failures: string[];
  fingerprintFailures: string[];
};

function repoRoot() {
  return process.cwd();
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function loadContract(root = repoRoot()): Contract {
  return JSON.parse(
    fs.readFileSync(path.join(root, "ops/release/canonical-root.json"), "utf8")
  ) as Contract;
}

function loadManifest(root = repoRoot()): Manifest {
  return JSON.parse(
    fs.readFileSync(path.join(root, "ops/release/pat-surface-manifest.json"), "utf8")
  ) as Manifest;
}

function extractReleaseId(html: string) {
  const dataAttributeMatch = html.match(/data-release-fingerprint="([^"]+)"/);
  if (dataAttributeMatch?.[1]) {
    return dataAttributeMatch[1];
  }

  const textMatch = html.match(/Release ([A-Za-z0-9:_-]+)/);
  return textMatch?.[1] ?? null;
}

function isForbiddenRoot(root: string, contract: Contract) {
  return (contract.forbiddenRoots ?? []).some((entry) => root === entry || root.startsWith(`${entry}/`));
}

export function assertStartupRoot(kind: StartupKind, root = repoRoot()) {
  const contract = loadContract(root);
  const resolvedRoot = path.resolve(root);

  if (resolvedRoot !== contract.canonicalRoot) {
    throw new Error(
      `PAT startup guard blocked ${kind}: current root ${resolvedRoot} does not match canonical root ${contract.canonicalRoot}.`
    );
  }

  if (isForbiddenRoot(resolvedRoot, contract)) {
    throw new Error(`PAT startup guard blocked ${kind}: forbidden root ${resolvedRoot} cannot serve PAT.`);
  }

  if (resolvedRoot.startsWith("/private/tmp/")) {
    throw new Error(`PAT startup guard blocked ${kind}: temporary root ${resolvedRoot} cannot serve PAT.`);
  }

  if (kind === "standalone" && !fs.existsSync(path.join(resolvedRoot, ".next", "standalone", "server.js"))) {
    throw new Error(
      "PAT startup guard blocked standalone start: .next/standalone/server.js is missing. Run `pnpm build` first."
    );
  }

  return contract;
}

async function fetchText(url: string) {
  const response = await fetch(url, { redirect: "manual" });
  return {
    status: response.status,
    text: await response.text(),
  };
}

function buildMarkerSet(manifest: Manifest) {
  return [
    ...(manifest.routes["/"]?.positiveMarkers ?? []),
    ...(manifest.routes.header?.positiveMarkers ?? []),
  ];
}

export async function probePatHomepage(baseUrl: string, kind: StartupKind): Promise<HomepageProbeResult> {
  const root = repoRoot();
  const manifest = loadManifest(root);
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  try {
    const home = await fetchText(`${normalizedBaseUrl}/`);
    const normalizedHtml = normalizeText(home.text);
    const missingMarkers = buildMarkerSet(manifest).filter(
      (marker) => !normalizedHtml.includes(normalizeText(marker))
    );
    const forbiddenMarkers = (manifest.globalForbiddenMarkers ?? []).filter((marker) =>
      normalizedHtml.includes(normalizeText(marker))
    );
    const failures: string[] = [];

    if (home.status !== 200) {
      failures.push(`homepage_status:${home.status}`);
    }

    if (missingMarkers.length > 0) {
      failures.push(`missing_pat_markers:${missingMarkers.join(",")}`);
    }

    if (forbiddenMarkers.length > 0) {
      failures.push(`served_aae_markers:${forbiddenMarkers.join(",")}`);
    }

    const releaseId = extractReleaseId(home.text);
    const fingerprintFailures: string[] = [];

    if (kind === "standalone") {
      try {
        const fingerprintResponse = await fetch(`${normalizedBaseUrl}/api/release-fingerprint`, {
          redirect: "manual",
        });
        if (!fingerprintResponse.ok) {
          fingerprintFailures.push(`release_fingerprint_status:${fingerprintResponse.status}`);
        } else {
          const payload = await fingerprintResponse.json();
          const fingerprint = payload?.fingerprint ?? null;
          const expectedFingerprint = getPublicReleaseFingerprint();
          fingerprintFailures.push(
            ...getPublicReleaseFingerprintMismatches(fingerprint, expectedFingerprint).map(
              (failure) => `release_fingerprint:${failure}`
            )
          );
        }
      } catch (error) {
        fingerprintFailures.push(
          `release_fingerprint_probe_failed:${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      ok: failures.length === 0 && fingerprintFailures.length === 0,
      baseUrl: normalizedBaseUrl,
      status: home.status,
      releaseId,
      forbiddenMarkers,
      missingMarkers,
      failures,
      fingerprintFailures,
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl: normalizedBaseUrl,
      status: null,
      releaseId: null,
      forbiddenMarkers: [],
      missingMarkers: [],
      failures: [
        `homepage_probe_failed:${error instanceof Error ? error.message : String(error)}`,
      ],
      fingerprintFailures: kind === "standalone" ? ["release_fingerprint_probe_skipped:homepage_unreachable"] : [],
    };
  }
}

export function renderProbeFailure(result: HomepageProbeResult) {
  const parts = [...result.failures, ...result.fingerprintFailures];
  if (result.forbiddenMarkers.length > 0) {
    return `PAT startup guard blocked launch because / served forbidden AAE markers: ${result.forbiddenMarkers.join(", ")}.`;
  }
  if (result.missingMarkers.length > 0) {
    return `PAT startup guard blocked launch because / did not render required PAT markers: ${result.missingMarkers.join(", ")}.`;
  }
  return `PAT startup guard blocked launch because homepage proof failed: ${parts.join(" | ") || "unknown failure"}.`;
}

export async function waitForPatHomepage(
  baseUrl: string,
  kind: StartupKind,
  timeoutMs: number
): Promise<HomepageProbeResult> {
  const startedAt = Date.now();
  let lastResult: HomepageProbeResult | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await probePatHomepage(baseUrl, kind);
    lastResult = result;
    if (result.ok) {
      return result;
    }

    await delay(500);
  }

  return (
    lastResult ?? {
      ok: false,
      baseUrl,
      status: null,
      releaseId: null,
      forbiddenMarkers: [],
      missingMarkers: [],
      failures: ["homepage_probe_timed_out"],
      fingerprintFailures: [],
    }
  );
}

type LaunchArgs = {
  kind: StartupKind;
  port: number;
  timeoutMs: number;
  childArgs: string[];
};

function parseLaunchArgs(argv: string[]): LaunchArgs {
  let kind: StartupKind = "standalone";
  const port = Number(process.env.PORT ?? "3000");
  let resolvedPort = port;
  let timeoutMs = 45_000;
  let separatorIndex = argv.indexOf("--");

  if (separatorIndex === -1) {
    separatorIndex = argv.length;
  }

  for (let index = 0; index < separatorIndex; index += 1) {
    const arg = argv[index];
    if (arg === "--kind") {
      kind = argv[index + 1] as StartupKind;
      index += 1;
    } else if (arg === "--port") {
      resolvedPort = Number(argv[index + 1] ?? resolvedPort);
      index += 1;
    } else if (arg === "--timeout-ms") {
      timeoutMs = Number(argv[index + 1] ?? timeoutMs);
      index += 1;
    }
  }

  const childArgs = separatorIndex < argv.length ? argv.slice(separatorIndex + 1) : [];
  if (childArgs.length === 0) {
    throw new Error("PAT startup guard launch requires a child command after `--`.");
  }

  return { kind, port: resolvedPort, timeoutMs, childArgs };
}

function parseVerifyArgs(argv: string[]) {
  let kind: StartupKind = "standalone";
  let baseUrl = "";
  let format: "text" | "env" = "text";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--kind") {
      kind = argv[index + 1] as StartupKind;
      index += 1;
    } else if (arg === "--base-url") {
      baseUrl = String(argv[index + 1] ?? "");
      index += 1;
    } else if (arg === "--format") {
      format = argv[index + 1] === "env" ? "env" : "text";
      index += 1;
    }
  }

  if (!baseUrl) {
    throw new Error("PAT startup guard verify-base-url requires --base-url.");
  }

  return { kind, baseUrl, format };
}

function renderEnv(result: HomepageProbeResult) {
  return [
    `homepage_probe_ok=${result.ok ? "yes" : "no"}`,
    `homepage_probe_http=${result.status ?? "missing"}`,
    `homepage_release_id=${result.releaseId ?? "missing"}`,
    `homepage_missing_pat_markers=${result.missingMarkers.join(",")}`,
    `homepage_forbidden_markers=${result.forbiddenMarkers.join(",")}`,
    `homepage_failures=${[...result.failures, ...result.fingerprintFailures].join(",")}`,
  ].join("\n");
}

async function launchWithGuard(argv: string[]) {
  const args = parseLaunchArgs(argv);
  assertStartupRoot(args.kind);

  const [command, ...commandArgs] = args.childArgs;
  const child = spawn(command, commandArgs, {
    cwd: repoRoot(),
    env: {
      ...process.env,
      PORT: String(args.port),
    },
    stdio: "inherit",
  });

  const stopChild = (signal: NodeJS.Signals) => {
    if (child.exitCode === null) {
      child.kill(signal);
    }
  };

  process.on("SIGINT", () => stopChild("SIGINT"));
  process.on("SIGTERM", () => stopChild("SIGTERM"));

  const baseUrl = `http://127.0.0.1:${args.port}`;
  const probe = await waitForPatHomepage(baseUrl, args.kind, args.timeoutMs);
  if (!probe.ok) {
    stopChild("SIGTERM");
    await delay(250);
    if (child.exitCode === null) {
      stopChild("SIGKILL");
    }
    throw new Error(renderProbeFailure(probe));
  }

  console.log(
    `PAT startup guard confirmed ${args.kind} is serving PAT on ${baseUrl}${probe.releaseId ? ` (Release ${probe.releaseId})` : ""}.`
  );

  await new Promise<void>((resolve, reject) => {
    child.once("exit", (code) => {
      if (code && code !== 0) {
        reject(new Error(`PAT ${args.kind} server exited with status ${code}.`));
        return;
      }
      resolve();
    });
    child.once("error", reject);
  });
}

async function verifyBaseUrl(argv: string[]) {
  const args = parseVerifyArgs(argv);
  assertStartupRoot(args.kind);
  const result = await probePatHomepage(args.baseUrl, args.kind);

  if (args.format === "env") {
    console.log(renderEnv(result));
  } else if (result.ok) {
    console.log(
      `PAT startup guard confirmed ${args.kind} homepage proof at ${result.baseUrl}${result.releaseId ? ` (Release ${result.releaseId})` : ""}.`
    );
  } else {
    console.error(renderProbeFailure(result));
  }

  if (!result.ok) {
    process.exit(1);
  }
}

async function preflight(argv: string[]) {
  let kind: StartupKind = "standalone";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--kind") {
      kind = argv[index + 1] as StartupKind;
      index += 1;
    }
  }

  const contract = assertStartupRoot(kind);
  console.log(`PAT startup guard preflight passed for ${kind} at ${contract.canonicalRoot}.`);
}

export async function runStartupGuardCli(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;

  if (command === "launch") {
    await launchWithGuard(rest);
    return;
  }

  if (command === "verify-base-url") {
    await verifyBaseUrl(rest);
    return;
  }

  if (command === "preflight") {
    await preflight(rest);
    return;
  }

  throw new Error("PAT startup guard requires one of: preflight, launch, verify-base-url.");
}

function isDirectCliInvocation() {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }

  return pathToFileURL(path.resolve(entryArg)).href === import.meta.url;
}

if (isDirectCliInvocation()) {
  runStartupGuardCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
