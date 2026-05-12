import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

type CommandName =
  | "status"
  | "health"
  | "restart"
  | "verify"
  | "logs"
  | "latest-deploy"
  | "current-revision"
  | "recent-failures"
  | "launch-readiness";

type DispatchResult = {
  ok: boolean;
  command: CommandName;
  summary: string;
  lines: string[];
  exitCode: number;
  durationMs: number;
  dryRun: boolean;
};

const root = process.cwd();
const stateDir = path.join(root, "artifacts/mac-mini/state");
const auditFile = path.join(stateDir, "chatops-audit.jsonl");

const COMMANDS: Record<
  CommandName,
  { summary: string; command: string[] }
> = {
  status: {
    summary: "Mac mini status snapshot",
    command: ["bash", "scripts/mac-mini/status.sh"],
  },
  health: {
    summary: "Mac mini health check",
    command: ["bash", "scripts/mac-mini/health-check.sh"],
  },
  restart: {
    summary: "Mac mini app restart",
    command: ["bash", "scripts/mac-mini/restart-app.sh"],
  },
  verify: {
    summary: "Mac mini nightly verification",
    command: ["bash", "scripts/mac-mini/nightly-verify.sh"],
  },
  logs: {
    summary: "Recent Mac mini logs",
    command: ["bash", "scripts/mac-mini/log-tail.sh"],
  },
  "latest-deploy": {
    summary: "Latest deployed build metadata",
    command: ["bash", "scripts/mac-mini/latest-deploy.sh"],
  },
  "current-revision": {
    summary: "Current branch and commit",
    command: ["bash", "scripts/mac-mini/current-revision.sh"],
  },
  "recent-failures": {
    summary: "Recent failure summary",
    command: ["bash", "scripts/mac-mini/recent-failures.sh"],
  },
  "launch-readiness": {
    summary: "Launch readiness validation",
    command: ["bash", "scripts/mac-mini/launch-readiness.sh"],
  },
};

const sensitivePatterns = [
  /(AUTH_SECRET|NEXTAUTH_SECRET|DATABASE_URL|TELEGRAM_BOT_TOKEN|PAT_BOOTSTRAP_DEFAULT_PASSWORD|PAT_LOCAL_REVIEW_PASSWORD)=([^\s]+)/g,
  /(\/\/[^:\s]+):([^@/\s]+)@/g,
];

function redact(value: string) {
  let result = value;
  result = result.replace(sensitivePatterns[0], "$1=[redacted]");
  result = result.replace(sensitivePatterns[1], "//$1:[redacted]@");
  return result;
}

function normalizeCommand(input: string): CommandName | null {
  const normalized = input.trim().toLowerCase().replace(/^\/+/, "");
  if (normalized === "help" || normalized === "start") return null;
  if (normalized === "deploy") return "latest-deploy";
  if (normalized === "revision" || normalized === "branch") return "current-revision";
  if (normalized === "failures") return "recent-failures";
  if (normalized === "launch") return "launch-readiness";
  if (normalized in COMMANDS) {
    return normalized as CommandName;
  }
  return null;
}

async function appendAudit(entry: Record<string, unknown>) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.appendFile(auditFile, `${JSON.stringify(entry)}\n`, "utf8");
}

async function runCommand(commandName: CommandName, dryRun: boolean, actor: string | null) {
  const startedAt = Date.now();
  const config = COMMANDS[commandName];

  if (dryRun) {
    const result: DispatchResult = {
      ok: true,
      command: commandName,
      summary: config.summary,
      lines: [`dry_run=true`, `exec=${config.command.join(" ")}`],
      exitCode: 0,
      durationMs: 0,
      dryRun: true,
    };
    await appendAudit({
      at: new Date().toISOString(),
      actor,
      command: commandName,
      dryRun: true,
      ok: true,
      exitCode: 0,
    });
    return result;
  }

  const [binary, ...args] = config.command;
  const child = spawn(binary, args, {
    cwd: root,
    env: process.env,
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCode: number = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

  const combined = redact([stdout, stderr].filter(Boolean).join("\n")).trim();
  const lines = combined ? combined.split("\n").slice(0, 60) : ["no output"];
  const result: DispatchResult = {
    ok: exitCode === 0,
    command: commandName,
    summary: config.summary,
    lines,
    exitCode,
    durationMs: Date.now() - startedAt,
    dryRun: false,
  };

  await appendAudit({
    at: new Date().toISOString(),
    actor,
    command: commandName,
    dryRun: false,
    ok: result.ok,
    exitCode,
    durationMs: result.durationMs,
    preview: lines.slice(0, 8),
  });

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const requested = args.find((arg) => !arg.startsWith("--")) ?? "status";
  const dryRun = args.includes("--dry-run");
  const actorIndex = args.findIndex((arg) => arg === "--actor");
  const actor = actorIndex >= 0 ? args[actorIndex + 1] ?? null : null;
  const commandName = normalizeCommand(requested);

  if (!commandName) {
    const help = {
      ok: true,
      command: "help",
      summary: "Supported chat-ops commands",
      exitCode: 0,
      durationMs: 0,
      lines: [
        "status",
        "health",
        "restart",
        "verify",
        "logs",
        "latest-deploy",
        "current-revision",
        "recent-failures",
        "launch-readiness",
      ],
      supported: Object.keys(COMMANDS),
    };
    console.log(JSON.stringify(help, null, 2));
    process.exit(0);
  }

  const result = await runCommand(commandName, dryRun, actor);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

void main();
