import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

export type MacMiniAgentStatus = "loaded" | "not-loaded" | "unavailable" | "unknown";
export type MacMiniHealthState = "ok" | "down" | "unknown";
export type MacMiniLaunchReadinessState = "ready" | "degraded" | "blocked" | "unknown";

type EnvMap = Record<string, string>;

export type MacMiniStatusSnapshot = {
  timestamp: string | null;
  repo: string | null;
  branch: string | null;
  commit: string | null;
  gitDirty: string | null;
  publicOrigin: string | null;
  appUrl: string | null;
  launchdMode: string | null;
  launchd: {
    app: MacMiniAgentStatus;
    verify: MacMiniAgentStatus;
    chatops: MacMiniAgentStatus;
    watchdog: MacMiniAgentStatus;
  };
  listen: {
    active: boolean | null;
    host: string | null;
    port: string | null;
  };
  health: {
    state: MacMiniHealthState;
    summary: string | null;
    url: string | null;
    httpCode: string | null;
  };
  build: {
    id: string | null;
    time: string | null;
    reason: string | null;
    branch: string | null;
    commit: string | null;
    age: string | null;
  };
  preflight: {
    envFilePresent: boolean | null;
    nodeModulesPresent: boolean | null;
    buildPresent: boolean | null;
    envReady: boolean | null;
    envMissingCount: number | null;
    chatopsEnvReady: boolean | null;
    chatopsMissingCount: number | null;
  };
  lastVerifyPath: string | null;
  rawLines: string[];
};

export type MacMiniNightlySummary = {
  timestamp: string | null;
  branch: string | null;
  commit: string | null;
  gitDirty: string | null;
  host: string | null;
  port: string | null;
  publicOrigin: string | null;
  envReady: boolean | null;
  envMissingCount: number | null;
  chatopsEnvReady: boolean | null;
  chatopsMissingCount: number | null;
  releaseBuildId: string | null;
  releaseBuildTime: string | null;
  releaseBuildReason: string | null;
  releaseDrift: string | null;
  failureCount: number | null;
  failedSteps: string[];
  healthSummary: string | null;
  statusSummary: string | null;
  rawLines: string[];
};

export type MacMiniOperatorState = {
  available: boolean;
  launchReadiness: {
    state: MacMiniLaunchReadinessState;
    summary: string;
    reasons: string[];
  };
  release: {
    branch: string | null;
    commit: string | null;
    buildId: string | null;
    buildTimeUtc: string | null;
    buildReason: string | null;
    gitDirty: string | null;
  };
  status: MacMiniStatusSnapshot | null;
  nightly: MacMiniNightlySummary | null;
  recentFailures: {
    count: number | null;
    failedSteps: string[];
    healthSummary: string | null;
    watchdogFailure: string | null;
  };
  watchdog: {
    status: string | null;
    reason: string | null;
    updatedAt: string | null;
    loaded: MacMiniAgentStatus;
  };
  chatops: {
    enabled: boolean | null;
    loaded: MacMiniAgentStatus;
    envReady: boolean | null;
    latestAudit: Record<string, unknown> | null;
  };
  app: {
    health: MacMiniHealthState;
    healthSummary: string | null;
    listenActive: boolean | null;
    host: string | null;
    port: string | null;
    publicOrigin: string | null;
    startedAt: string | null;
  };
};

const stateDir = path.join(process.cwd(), "artifacts/mac-mini/state");
const reportsDir = path.join(process.cwd(), "artifacts/mac-mini/reports");

async function readText(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function parseEnvFileText(raw: string | null): EnvMap {
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key, valueParts.join("=")];
      })
  );
}

function countMissingValues(value: string | null | undefined) {
  if (!value) return 0;
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function parseStatusLine(line: string) {
  const tokens = line.match(/[A-Za-z_]+=[^\s]+/g) ?? [];
  return Object.fromEntries(tokens.map((token) => {
    const [key, value] = token.split("=", 2);
    return [key, value];
  }));
}

export function parseMacMiniStatusOutput(raw: string): MacMiniStatusSnapshot {
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const direct = new Map<string, string>();
  let envMissingCount: number | null = null;
  let chatopsMissingCount: number | null = null;

  for (const line of lines) {
    const parsed = parseStatusLine(line);
    if (line.startsWith("env_ready=")) {
      envMissingCount = countMissingValues(parsed.missing);
    }
    if (line.startsWith("chatops_env_ready=")) {
      chatopsMissingCount = countMissingValues(parsed.missing);
    }
    for (const [key, value] of Object.entries(parsed)) {
      direct.set(key, value);
    }
  }

  return {
    timestamp: direct.get("time") ?? null,
    repo: direct.get("repo") ?? null,
    branch: direct.get("branch") ?? null,
    commit: direct.get("commit") ?? null,
    gitDirty: direct.get("git_dirty") ?? null,
    publicOrigin: direct.get("public_origin") ?? null,
    appUrl: direct.get("app_url") ?? null,
    launchdMode: direct.get("launchd_mode") ?? null,
    launchd: {
      app: (direct.get("launchd_app") as MacMiniAgentStatus | undefined) ?? "unknown",
      verify: (direct.get("launchd_verify") as MacMiniAgentStatus | undefined) ?? "unknown",
      chatops: (direct.get("launchd_chatops") as MacMiniAgentStatus | undefined) ?? "unknown",
      watchdog: (direct.get("launchd_watchdog") as MacMiniAgentStatus | undefined) ?? "unknown",
    },
    listen: {
      active: direct.has("listen") ? direct.get("listen") === "yes" : null,
      host: direct.get("host") ?? null,
      port: direct.get("port") ?? null,
    },
    health: {
      state: direct.get("health") === "ok" ? "ok" : direct.has("health") ? "down" : "unknown",
      summary: lines.find((line) => line.startsWith("health=")) ?? null,
      url: direct.get("url") ?? null,
      httpCode: direct.get("http") ?? null,
    },
    build: {
      id: direct.get("build_id") ?? null,
      time: direct.get("build_time") ?? null,
      reason: direct.get("build_reason") ?? null,
      branch: direct.get("build_branch") ?? null,
      commit: direct.get("build_commit") ?? null,
      age: direct.get("build_age") ?? null,
    },
    preflight: {
      envFilePresent: direct.has("env_file") ? direct.get("env_file") === "present" : null,
      nodeModulesPresent: direct.has("node_modules") ? direct.get("node_modules") === "present" : null,
      buildPresent: direct.has("build") ? direct.get("build") === "present" : null,
      envReady: direct.has("env_ready") ? direct.get("env_ready") === "yes" : null,
      envMissingCount,
      chatopsEnvReady: direct.has("chatops_env_ready") ? direct.get("chatops_env_ready") === "yes" : null,
      chatopsMissingCount,
    },
    lastVerifyPath: direct.get("last_verify") ?? null,
    rawLines: lines,
  };
}

export function parseMacMiniNightlySummary(raw: string): MacMiniNightlySummary {
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const direct = parseEnvFileText(lines.join("\n"));

  return {
    timestamp: direct.timestamp ?? null,
    branch: direct.branch ?? null,
    commit: direct.commit ?? null,
    gitDirty: direct.git_dirty ?? null,
    host: direct.host ?? null,
    port: direct.port ?? null,
    publicOrigin: direct.public_origin ?? null,
    envReady: direct.env_ready ? direct.env_ready === "yes" : null,
    envMissingCount: direct.env_ready ? countMissingValues(direct.missing) : null,
    chatopsEnvReady: direct.chatops_env_ready ? direct.chatops_env_ready === "yes" : null,
    chatopsMissingCount: direct.chatops_env_ready ? countMissingValues(direct.missing) : null,
    releaseBuildId: direct.release_build_id ?? null,
    releaseBuildTime: direct.release_build_time ?? null,
    releaseBuildReason: direct.release_build_reason ?? null,
    releaseDrift: direct.release_drift ?? null,
    failureCount: direct.failures ? Number(direct.failures) : null,
    failedSteps: direct.failed_steps ? direct.failed_steps.split(",").map((value) => value.trim()).filter(Boolean) : [],
    healthSummary: direct.health_summary ?? null,
    statusSummary: direct.status_summary ?? null,
    rawLines: lines,
  };
}

export function deriveMacMiniLaunchReadiness(input: {
  status: MacMiniStatusSnapshot | null;
  nightly: MacMiniNightlySummary | null;
}) {
  const reasons: string[] = [];
  const { status, nightly } = input;

  if (!status && !nightly) {
    return {
      state: "unknown" as const,
      summary: "No Mac mini operator state has been emitted yet.",
      reasons,
    };
  }

  if (status?.preflight.envReady === false || nightly?.envReady === false) {
    reasons.push("Required app setup is incomplete.");
  }

  if (status?.health.state === "down") {
    reasons.push("App health is currently failing.");
  }

  if ((nightly?.failureCount ?? 0) > 0) {
    reasons.push(`Nightly verification has ${nightly?.failureCount} failed step${nightly?.failureCount === 1 ? "" : "s"}.`);
  }

  if ((nightly?.releaseDrift ?? "in-sync") !== "in-sync") {
    reasons.push("Release drift is not in sync.");
  }

  const chatopsDegraded =
    status?.launchd.chatops === "not-loaded" ||
    status?.launchd.watchdog === "not-loaded" ||
    status?.preflight.chatopsEnvReady === false ||
    nightly?.chatopsEnvReady === false;

  if (chatopsDegraded) {
    reasons.push("Chat-ops or watchdog automation is not fully active.");
  }

  if (reasons.some((reason) => /Required app setup|App health|Nightly verification/.test(reason))) {
    return {
      state: "blocked" as const,
      summary: reasons[0] ?? "Launch readiness is blocked.",
      reasons,
    };
  }

  if (reasons.length > 0) {
    return {
      state: "degraded" as const,
      summary: reasons[0] ?? "Launch readiness is degraded.",
      reasons,
    };
  }

  return {
    state: "ready" as const,
    summary: "Launch setup, health, and operator automation are in a ready state.",
    reasons,
  };
}

function parseLatestAudit(raw: string | null) {
  const latestLine = raw?.trim().split("\n").filter(Boolean).at(-1) ?? null;
  if (!latestLine) return null;

  try {
    return JSON.parse(latestLine) as Record<string, unknown>;
  } catch {
    return { raw: latestLine };
  }
}

function runMacMiniStatusScript() {
  const result = spawnSync("bash", ["scripts/mac-mini/status.sh"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (!output) {
    return null;
  }

  return parseMacMiniStatusOutput(output);
}

export async function getMacMiniOperatorState(): Promise<MacMiniOperatorState> {
  const [
    releaseText,
    watchdogText,
    latestNightlySummaryText,
    chatopsAuditText,
    watchdogFailureText,
    appLastStartText,
  ] = await Promise.all([
    readText(path.join(stateDir, "release-state.env")),
    readText(path.join(stateDir, "watchdog-state.env")),
    readText(path.join(stateDir, "latest-nightly-summary.txt")),
    readText(path.join(stateDir, "chatops-audit.jsonl")),
    readText(path.join(stateDir, "chatops-last-failure.txt")),
    readText(path.join(stateDir, "app-last-start-at.txt")),
  ]);

  const status = runMacMiniStatusScript();
  const nightly = latestNightlySummaryText ? parseMacMiniNightlySummary(latestNightlySummaryText) : null;
  const release = parseEnvFileText(releaseText);
  const watchdog = parseEnvFileText(watchdogText);
  const launchReadiness = deriveMacMiniLaunchReadiness({ status, nightly });

  return {
    available: Boolean(status || nightly || releaseText || chatopsAuditText),
    launchReadiness,
    release: {
      branch: release.BRANCH ?? status?.branch ?? null,
      commit: release.COMMIT ?? status?.commit ?? null,
      buildId: release.BUILD_ID ?? status?.build.id ?? null,
      buildTimeUtc: release.BUILD_TIME_UTC ?? status?.build.time ?? null,
      buildReason: release.BUILD_REASON ?? status?.build.reason ?? null,
      gitDirty: release.GIT_DIRTY ?? status?.gitDirty ?? null,
    },
    status,
    nightly,
    recentFailures: {
      count: nightly?.failureCount ?? null,
      failedSteps: nightly?.failedSteps ?? [],
      healthSummary: nightly?.healthSummary ?? status?.health.summary ?? null,
      watchdogFailure: watchdogFailureText?.trim() || null,
    },
    watchdog: {
      status: watchdog.STATUS ?? null,
      reason: watchdog.REASON ?? null,
      updatedAt: watchdog.UPDATED_AT ?? null,
      loaded: status?.launchd.watchdog ?? "unknown",
    },
    chatops: {
      enabled: status?.preflight.chatopsEnvReady ?? nightly?.chatopsEnvReady ?? null,
      loaded: status?.launchd.chatops ?? "unknown",
      envReady: status?.preflight.chatopsEnvReady ?? nightly?.chatopsEnvReady ?? null,
      latestAudit: parseLatestAudit(chatopsAuditText),
    },
    app: {
      health: status?.health.state ?? "unknown",
      healthSummary: status?.health.summary ?? nightly?.healthSummary ?? null,
      listenActive: status?.listen.active ?? null,
      host: status?.listen.host ?? nightly?.host ?? null,
      port: status?.listen.port ?? nightly?.port ?? null,
      publicOrigin: status?.publicOrigin ?? nightly?.publicOrigin ?? null,
      startedAt: appLastStartText?.trim() || null,
    },
  };
}
