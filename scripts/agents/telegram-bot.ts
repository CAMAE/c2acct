#!/usr/bin/env node
// Patalign Telegram bot poller (Phase 1d). Long-polls getUpdates for messages and
// inline-button callback queries, restricted to TELEGRAM_ALLOWED_CHAT_ID — any
// other chat is SILENTLY dropped (no reply, no callback answer).
//
// Dispatch:
//   - callback_query        → ops/telegram-bot/approvals.onCallbackQuery (HMAC-verified)
//   - reply to approval card → ops/telegram-bot/approvals.onApprovalReply
//   - /command              → ops/telegram-bot/commands.handleCommand
//   - other text            → ops/telegram-bot/routing.routeMessage
//
// This is THE bot process for the agent system (it lives with the agents + the
// AgentApproval table in c2acct-live). Only one process may poll a bot token.
import { callTelegram, sendMessage } from "@/lib/agents/telegram";
import {
  onApprovalReply,
  onCallbackQuery,
  type TelegramCallbackQuery,
  type TelegramMessage,
} from "@/ops/telegram-bot/approvals";
import { handleCommand } from "@/ops/telegram-bot/commands";
import { routeMessage } from "@/ops/telegram-bot/routing";
import { loadEnv } from "../_shared/prismaScript";
import "./register-agents";

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const POLL_TIMEOUT_SECONDS = Number(process.env.TELEGRAM_POLL_TIMEOUT_SECONDS ?? "30");

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function handleUpdate(token: string, allowedChatId: string, update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = String(query.message?.chat?.id ?? "");
    if (chatId !== allowedChatId) {
      return; // silent drop
    }
    await onCallbackQuery(query);
    return;
  }

  const message = update.message;
  if (!message) {
    return;
  }
  const chatId = String(message.chat?.id ?? "");
  if (chatId !== allowedChatId) {
    return; // silent drop — do NOT reply to unauthorized chats
  }

  // Reply to an approval card?
  if (await onApprovalReply(message)) {
    return;
  }

  const text = (message.text ?? "").trim();
  if (text === "") {
    return;
  }
  const requestedBy = message.from?.username
    ? `telegram:${message.from.username}`
    : message.from?.id !== undefined
      ? `telegram:${message.from.id}`
      : "telegram:unknown";
  const reply = text.startsWith("/") ? await handleCommand(text, requestedBy) : await routeMessage(text);
  await sendMessage(token, chatId, reply.slice(0, 3500));
}

async function main() {
  loadEnv();
  const token = requireEnv(process.env.TELEGRAM_BOT_TOKEN, "TELEGRAM_BOT_TOKEN");
  const allowedChatId = requireEnv(process.env.TELEGRAM_ALLOWED_CHAT_ID, "TELEGRAM_ALLOWED_CHAT_ID");

  // Skip backlog: on a fresh start, jump past any updates that arrived before we
  // came online (e.g. messages to the previous bot) so we don't replay them.
  let offset: number;
  if (process.env.TELEGRAM_OFFSET) {
    offset = Number(process.env.TELEGRAM_OFFSET);
  } else {
    const drain = await callTelegram(token, "getUpdates", { offset: -1, timeout: 0 });
    const pending = (drain.result ?? []) as TelegramUpdate[];
    offset = pending.length > 0 ? pending[pending.length - 1].update_id + 1 : 0;
  }
  console.log(`[telegram-bot] started. Polling getUpdates (message + callback_query) from offset ${offset}.`);

  while (true) {
    const response = await callTelegram(token, "getUpdates", {
      offset,
      timeout: POLL_TIMEOUT_SECONDS,
      allowed_updates: ["message", "callback_query"],
    });
    if (!response.ok) {
      console.error("[telegram-bot] getUpdates error:", response.description ?? "unknown");
      await sleep(2_000);
      continue;
    }

    const updates = (response.result ?? []) as TelegramUpdate[];
    for (const update of updates) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(token, allowedChatId, update);
      } catch (error) {
        console.error("[telegram-bot] update handling error:", error instanceof Error ? error.message : String(error));
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("[telegram-bot] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
