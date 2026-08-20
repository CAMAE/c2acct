/**
 * Minimal Telegram Bot API client used by agents' `telegram.send_message` tool.
 * Generic (Pilot Ops / approvals in later phases reuse it). Outbound only.
 */

export interface TelegramSendPayload {
  chat_id: string;
  text: string;
  disable_web_page_preview: boolean;
}

export interface TelegramSendResult {
  sent: boolean;
  status?: number;
  reason?: string;
}

export function buildTelegramSendPayload(chatId: string, text: string): TelegramSendPayload {
  return { chat_id: chatId, text, disable_web_page_preview: true };
}

export async function sendTelegramMessage(
  token: string,
  payload: TelegramSendPayload
): Promise<TelegramSendResult> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return { sent: true, status: response.status };
    }
    // Carry Telegram's own explanation ("chat not found", "bot was blocked",
    // "wrong file identifier") instead of just an HTTP number. The status alone
    // told an operator that something failed but never what, which is the
    // difference between a fixable alert and a mystery.
    const reason = await describeFailure(response);
    return { sent: false, status: response.status, reason };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/** Pull Telegram's `description` out of an error response; fall back to the body text. */
async function describeFailure(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { description?: string };
    if (body?.description) {
      return `${response.status} ${body.description}`;
    }
    return `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

// --- Generic Bot API transport (used by the approval round-trip + poller) ---

export interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

/**
 * Low-level Bot API call. Returns the parsed envelope (never throws on HTTP).
 *
 * A failed call is now LOGGED rather than silently returned. Every caller below
 * ignored the envelope, so a bot token rotation, a blocked bot, or a bad chat id
 * turned the entire operator notification channel — approval cards included —
 * into a no-op that reported nothing anywhere.
 */
export async function callTelegram(
  token: string,
  method: string,
  payload: Record<string, unknown>
): Promise<TelegramApiResponse> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const envelope = (await response.json()) as TelegramApiResponse;
    if (!envelope.ok) {
      console.error(
        `[telegram] ${method} failed (HTTP ${response.status}): ${envelope.description ?? "no description"}`
      );
    }
    return envelope;
  } catch (error) {
    const description = error instanceof Error ? error.message : String(error);
    console.error(`[telegram] ${method} threw: ${description}`);
    return { ok: false, description };
  }
}

/** Send a plain text message; returns the new message_id (or null). */
export async function sendMessage(token: string, chatId: string, text: string): Promise<number | null> {
  const res = await callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
  return messageIdOf(res);
}

/**
 * Send an approval card (text + inline keyboard); returns the message_id.
 *
 * Throws when the card does not reach the operator. A card that silently failed
 * to send left a run paused on a decision nobody could see and nobody knew was
 * pending; the caller (lib/agents/approvals.ts) catches this and writes the
 * failure into the audit trail so the silence is explainable.
 */
export async function sendApprovalCard(
  token: string,
  params: { chat_id: string; text: string; inline_keyboard: InlineKeyboardButton[][] }
): Promise<number | null> {
  const res = await callTelegram(token, "sendMessage", {
    chat_id: params.chat_id,
    text: params.text,
    reply_markup: { inline_keyboard: params.inline_keyboard },
  });
  if (!res.ok) {
    throw new Error(`telegram approval card was not delivered: ${res.description ?? "unknown error"}`);
  }
  return messageIdOf(res);
}

export async function editMessageText(
  token: string,
  params: { chat_id: string; message_id: number; text: string }
): Promise<void> {
  await callTelegram(token, "editMessageText", {
    chat_id: params.chat_id,
    message_id: params.message_id,
    text: params.text,
  });
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<void> {
  await callTelegram(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

function messageIdOf(response: TelegramApiResponse): number | null {
  const result = response.result;
  if (result && typeof result === "object" && "message_id" in result) {
    const id = (result as { message_id: unknown }).message_id;
    return typeof id === "number" ? id : null;
  }
  return null;
}
