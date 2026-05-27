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
    return { sent: response.ok, status: response.status };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
