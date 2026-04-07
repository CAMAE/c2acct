#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

export function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    port: 3310,
    timeoutMs: 45000,
    baseUrl: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      args.root = argv[index + 1];
      index += 1;
    } else if (argv[index] === "--port") {
      args.port = Number(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--timeout-ms") {
      args.timeoutMs = Number(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--base-url") {
      args.baseUrl = String(argv[index + 1] ?? "");
      index += 1;
    }
  }

  return args;
}

export function loadManifest(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "ops/release/pat-surface-manifest.json"), "utf8")
  );
}

function parseKeyValueOutput(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex <= 0) {
          return [line, ""];
        }
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ");
}

export function validateRouteHtml(routeKey, html, routeConfig, globalForbiddenMarkers) {
  const failures = [];
  const normalizedHtml = normalizeText(html);

  for (const marker of routeConfig.positiveMarkers ?? []) {
    if (!normalizedHtml.includes(marker)) {
      failures.push(`${routeKey}:missing_positive:${marker}`);
    }
  }

  for (const marker of [...(globalForbiddenMarkers ?? []), ...(routeConfig.forbiddenMarkers ?? [])]) {
    if (normalizedHtml.includes(marker)) {
      failures.push(`${routeKey}:forbidden_marker:${marker}`);
    }
  }

  return failures;
}

export function validateLoginCompatibility(response, manifestRoute) {
  const failures = [];
  const location = response.headers.get("location") ?? "";
  const body = normalizeText(response.bodyText ?? "");

  if (![301, 302, 307, 308].includes(response.status)) {
    failures.push(`/login:expected_redirect_status:${response.status}`);
  }

  if (!location.startsWith(manifestRoute.expectedRedirectPrefix)) {
    failures.push(`/login:bad_redirect_target:${location || "missing"}`);
  }

  for (const marker of manifestRoute.forbiddenMarkers ?? []) {
    if (body.includes(marker)) {
      failures.push(`/login:forbidden_body_marker:${marker}`);
    }
  }

  return failures;
}

export function validateFingerprintAgreement(browserReleaseId, apiFingerprint, operatorStatus) {
  const failures = [];

  if (!browserReleaseId) {
    failures.push("fingerprint:browser_missing");
  }
  if (!apiFingerprint?.releaseId) {
    failures.push("fingerprint:api_missing");
  }
  if (!operatorStatus.release_id) {
    failures.push("fingerprint:operator_missing");
  }

  if (browserReleaseId && apiFingerprint?.releaseId && browserReleaseId !== apiFingerprint.releaseId) {
    failures.push(`fingerprint:browser_api_mismatch:${browserReleaseId}:${apiFingerprint.releaseId}`);
  }

  if (browserReleaseId && operatorStatus.release_id && browserReleaseId !== operatorStatus.release_id) {
    failures.push(`fingerprint:browser_operator_mismatch:${browserReleaseId}:${operatorStatus.release_id}`);
  }

  if (apiFingerprint?.releaseId && operatorStatus.release_id && apiFingerprint.releaseId !== operatorStatus.release_id) {
    failures.push(`fingerprint:api_operator_mismatch:${apiFingerprint.releaseId}:${operatorStatus.release_id}`);
  }

  if (apiFingerprint?.commitSha && operatorStatus.fingerprint_commit_sha && apiFingerprint.commitSha !== operatorStatus.fingerprint_commit_sha) {
    failures.push(`fingerprint:commit_mismatch:${apiFingerprint.commitSha}:${operatorStatus.fingerprint_commit_sha}`);
  }

  if (apiFingerprint?.authMode && operatorStatus.fingerprint_auth_mode && apiFingerprint.authMode !== operatorStatus.fingerprint_auth_mode) {
    failures.push(`fingerprint:auth_mode_mismatch:${apiFingerprint.authMode}:${operatorStatus.fingerprint_auth_mode}`);
  }

  if (
    apiFingerprint?.releaseFingerprintSeed
    && operatorStatus.fingerprint_release_fingerprint_seed
    && apiFingerprint.releaseFingerprintSeed !== operatorStatus.fingerprint_release_fingerprint_seed
  ) {
    failures.push(
      `fingerprint:seed_mismatch:${apiFingerprint.releaseFingerprintSeed}:${operatorStatus.fingerprint_release_fingerprint_seed}`
    );
  }

  return failures;
}

async function waitForServer(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/release-fingerprint`, {
        redirect: "manual",
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`release fingerprint endpoint returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(500);
  }

  throw lastError ?? new Error("Timed out waiting for standalone server");
}

async function readTextResponse(url, init) {
  const response = await fetch(url, init);
  return {
    status: response.status,
    headers: response.headers,
    bodyText: await response.text(),
  };
}

function isRedirectStatus(status) {
  return [301, 302, 303, 307, 308].includes(status);
}

function extractCallbackTarget(location) {
  if (!location) return null;
  try {
    const parsed = new URL(location, "http://127.0.0.1");
    const callbackUrl = parsed.searchParams.get("callbackUrl");
    const redirectTo = parsed.searchParams.get("redirectTo");
    return redirectTo ?? callbackUrl;
  } catch {
    return null;
  }
}

function startStandaloneServer(root, port) {
  const serverPath = path.join(root, ".next", "standalone", "server.js");
  const child = spawn("node", [serverPath], {
    cwd: root,
    env: {
      ...process.env,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return { child, getLogs: () => ({ stdout, stderr }) };
}

function extractBrowserReleaseId(html) {
  const dataAttributeMatch = html.match(/data-release-fingerprint="([^"]+)"/);
  if (dataAttributeMatch?.[1]) {
    return dataAttributeMatch[1];
  }

  const textMatch = html.match(/Release ([A-Za-z0-9:_-]+)/);
  return textMatch?.[1] ?? null;
}

function readOperatorStatus(root, port) {
  const output = execFileSync("bash", ["scripts/mac-mini/status.sh"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      MAC_MINI_PORT: String(port),
    },
    encoding: "utf8",
  });

  return parseKeyValueOutput(output);
}

export async function runPatSurfaceValidation({ root, port, timeoutMs, baseUrl: requestedBaseUrl }) {
  const manifest = loadManifest(root);
  const baseUrl = requestedBaseUrl?.replace(/\/$/, "") || `http://127.0.0.1:${port}`;
  const failures = [];
  const routeEvidence = {};
  const shouldStartServer = !requestedBaseUrl;
  const runtime = shouldStartServer ? startStandaloneServer(root, port) : null;

  try {
    if (shouldStartServer) {
      await waitForServer(baseUrl, timeoutMs);
    }

    const routeKeys = Object.keys(manifest.routes).filter((routeKey) => routeKey !== "header" && routeKey !== "/login");

    for (const routeKey of routeKeys) {
      const response = await readTextResponse(`${baseUrl}${routeKey}`, { redirect: "manual" });
      routeEvidence[routeKey] = { status: response.status };

      if (routeKey === "/" || routeKey === "/sign-in") {
        if (response.status !== 200) {
          failures.push(`${routeKey}:unexpected_status:${response.status}`);
          continue;
        }

        failures.push(
          ...validateRouteHtml(
            routeKey,
            response.bodyText,
            manifest.routes[routeKey],
            manifest.globalForbiddenMarkers
          )
        );
        routeEvidence[routeKey].releaseId = extractBrowserReleaseId(response.bodyText);
        continue;
      }

      if (response.status === 200) {
        failures.push(
          ...validateRouteHtml(
            routeKey,
            response.bodyText,
            manifest.routes[routeKey],
            manifest.globalForbiddenMarkers
          )
        );
        routeEvidence[routeKey].releaseId = extractBrowserReleaseId(response.bodyText);
        continue;
      }

      if (!isRedirectStatus(response.status)) {
        failures.push(`${routeKey}:unexpected_status:${response.status}`);
        continue;
      }

      const location = response.headers.get("location") ?? "";
      const callbackTarget = extractCallbackTarget(location);
      routeEvidence[routeKey].location = location;
      routeEvidence[routeKey].callbackTarget = callbackTarget;

      if (!location.startsWith("/sign-in")) {
        failures.push(`${routeKey}:bad_redirect_target:${location || "missing"}`);
        continue;
      }

      if (callbackTarget !== routeKey) {
        failures.push(`${routeKey}:bad_callback_target:${callbackTarget || "missing"}`);
      }

      const signInResponse = await readTextResponse(`${baseUrl}${location}`);
      if (signInResponse.status !== 200) {
        failures.push(`${routeKey}:redirect_target_status:${signInResponse.status}`);
        continue;
      }

      failures.push(
        ...validateRouteHtml(
          "/sign-in",
          signInResponse.bodyText,
          manifest.routes["/sign-in"],
          manifest.globalForbiddenMarkers
        ).map((entry) => entry.replace("/sign-in:", `${routeKey}:sign-in:`))
      );
    }

    const homeResponse = await readTextResponse(`${baseUrl}/`);
    failures.push(
      ...validateRouteHtml(
        "header",
        homeResponse.bodyText,
        manifest.routes.header,
        manifest.globalForbiddenMarkers
      )
    );

    const loginResponse = await readTextResponse(`${baseUrl}/login?callbackUrl=%2Fvendor`, {
      redirect: "manual",
    });
    routeEvidence["/login"] = {
      status: loginResponse.status,
      location: loginResponse.headers.get("location") ?? "",
    };
    failures.push(...validateLoginCompatibility(loginResponse, manifest.routes["/login"]));

    const fingerprintResponse = await fetch(`${baseUrl}/api/release-fingerprint`);
    const fingerprintPayload = await fingerprintResponse.json();
    const apiFingerprint = fingerprintPayload?.fingerprint ?? null;
    const operatorStatus = readOperatorStatus(root, port);
    const browserReleaseId = routeEvidence["/"]?.releaseId ?? routeEvidence["/sign-in"]?.releaseId ?? null;

    failures.push(...validateFingerprintAgreement(browserReleaseId, apiFingerprint, operatorStatus));

    return {
      ok: failures.length === 0,
      root,
      port,
      baseUrl,
      manifest: path.join(root, "ops/release/pat-surface-manifest.json"),
      routeEvidence,
      browserReleaseId,
      apiFingerprint,
      operatorFingerprint: {
        releaseId: operatorStatus.release_id ?? null,
        commitSha: operatorStatus.fingerprint_commit_sha ?? null,
        authMode: operatorStatus.fingerprint_auth_mode ?? null,
        buildId: operatorStatus.fingerprint_build_id ?? null,
        releaseFingerprintSeed: operatorStatus.fingerprint_release_fingerprint_seed ?? null,
      },
      failures,
    };
  } catch (error) {
    const logs = runtime?.getLogs?.() ?? { stdout: "", stderr: "" };
    return {
      ok: false,
      root,
      port,
      baseUrl,
      manifest: path.join(root, "ops/release/pat-surface-manifest.json"),
      routeEvidence: {
        ...routeEvidence,
        serverLogs: logs,
      },
      failures: [
        ...(failures.length > 0 ? failures : []),
        `runtime_error:${error?.code ?? "unknown"}:${error?.message ?? String(error)}`,
      ],
    };
  } finally {
    if (runtime?.child) {
      runtime.child.kill("SIGTERM");
      await delay(250);
      if (runtime.child.exitCode === null) {
        runtime.child.kill("SIGKILL");
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runPatSurfaceValidation(args);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
