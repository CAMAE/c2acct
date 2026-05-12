import { spawn } from "node:child_process";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id: number | string };
    from?: { username?: string; id?: number };
  };
};

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
const pollTimeoutSeconds = Number(process.env.TELEGRAM_POLL_TIMEOUT_SECONDS ?? "30");
const commandTimeoutMs = Number(process.env.TELEGRAM_COMMAND_TIMEOUT_MS ?? "120000");

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const resolvedToken = requireEnv(token, "TELEGRAM_BOT_TOKEN");
const resolvedAllowedChatId = requireEnv(allowedChatId, "TELEGRAM_ALLOWED_CHAT_ID");
const apiBase = `https://api.telegram.org/bot${resolvedToken}`;

async function telegram(method: string, payload: Record<string, unknown>) {
  const response = await fetch(`${apiBase}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`telegram_${method}_failed_${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean; result: unknown }>;
}

function formatReply(result: {
  ok: boolean;
  command?: string;
  summary?: string;
  exitCode?: number;
  durationMs?: number;
  lines?: string[];
  supported?: string[];
}) {
  if (!result.ok) {
    return [
      "PAT Mac mini chat-ops",
      `status: failed`,
      result.supported ? `supported: ${result.supported.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "PAT Mac mini chat-ops",
    `command: ${result.command}`,
    `status: ok`,
    `summary: ${result.summary}`,
    `exit_code: ${result.exitCode}`,
    `duration_ms: ${result.durationMs}`,
    "",
    ...(result.lines ?? []).slice(0, 20),
  ].join("\n");
}

async function dispatch(commandText: string, actor: string | null) {
  return new Promise<string>((resolve) => {
    const child = spawn(
      "node",
      ["--import", "tsx", "scripts/mac-mini/chatops-dispatch.ts", commandText, "--actor", actor ?? "telegram"],
      {
        cwd: process.cwd(),
        env: process.env,
      }
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, commandTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", () => {
      clearTimeout(timer);
      const output = stdout.trim() || stderr.trim();
      try {
        const parsed = JSON.parse(output) as {
          ok: boolean;
          command?: string;
          summary?: string;
          exitCode?: number;
          durationMs?: number;
          lines?: string[];
          supported?: string[];
        };
        resolve(formatReply(parsed));
      } catch {
        resolve(`PAT Mac mini chat-ops\nstatus: failed\nraw: ${output || "no output"}`);
      }
    });
  });
}

async function main() {
  let offset = Number(process.env.TELEGRAM_OFFSET ?? "0");

  while (true) {
    const updates = (await telegram("getUpdates", {
      offset,
      timeout: pollTimeoutSeconds,
      allowed_updates: ["message"],
    })) as { ok: boolean; result: TelegramUpdate[] };

    for (const update of updates.result) {
      offset = update.update_id + 1;
      const message = update.message;
      const chatId = String(message?.chat?.id ?? "");
      const text = message?.text?.trim();
      if (!text) continue;

      if (chatId !== resolvedAllowedChatId) {
        await telegram("sendMessage", {
          chat_id: message?.chat?.id,
          text: "PAT Mac mini chat-ops\nstatus: denied\nreason: unauthorized chat",
        });
        continue;
      }

      const actor = message?.from?.username
        ? `telegram:${message.from.username}`
        : `telegram:${message?.from?.id ?? "unknown"}`;
      const reply = await dispatch(text, actor);
      await telegram("sendMessage", {
        chat_id: message?.chat?.id,
        text: reply.slice(0, 3500),
      });
    }
  }
}

void main();
