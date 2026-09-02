import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicApiKey } from "@/lib/agents/llm";
import { estimateCostUsd } from "@/lib/agents/costRates";

/**
 * Pat chat model layer (Phase 0 foundation, 2026-06-18).
 *
 * Confidence-gated cascade: Haiku handles the bulk of simple "where do I find X /
 * how do I do this" questions cheaply; we escalate to Sonnet only when Haiku
 * signals it cannot answer confidently from the retrieved context (the
 * INSUFFICIENT_CONTEXT sentinel) — i.e. when it would otherwise risk a
 * hallucination. This keeps ~75–80% of traffic on the cheap model while reserving
 * the strong model for the hard cases, per the agreed design.
 *
 * Secret handling reuses lib/agents/llm.ts: the key is runtime-env only, never
 * logged/persisted. Missing key throws so callers can degrade (the chat surface
 * stays hidden behind PAT_ENABLE_PAT_ASSISTANT until a key is present anyway).
 */

export const PAT_CHAT_MODEL_FAST = "claude-haiku-4-5-20251001";
export const PAT_CHAT_MODEL_STRONG = "claude-sonnet-4-6";

export const PAT_CHAT_TIMEOUT_MS = 20_000;

/**
 * The sentinel a model must emit (alone) when the provided context does not
 * support a confident answer. Used both as the grounding instruction and as the
 * escalation/fallback trigger. Callers treat a final INSUFFICIENT_CONTEXT result
 * as "show the contact-support fallback," never as an answer.
 */
export const INSUFFICIENT_CONTEXT = "INSUFFICIENT_CONTEXT";

export type PatModelTier = "fast" | "strong";

export type PatReply = {
  /** Answer text, or INSUFFICIENT_CONTEXT if neither tier could answer from context. */
  text: string;
  modelUsed: PatModelTier;
  /** True when the fast model punted and we escalated to the strong model. */
  escalated: boolean;
  /** True when even the strong tier could not answer — caller shows the fallback. */
  insufficientContext: boolean;
  /**
   * Real USD cost of the call(s), derived from the token counts the SDK returns.
   *
   * Added for the public tier, whose daily spend cap is only meaningful if it is
   * fed actual cost. A cap fed zeros is decoration: it would never trip, and the
   * ledger would report a free service while the bill said otherwise. Includes
   * BOTH tiers when the cascade escalated, because that is what the call cost.
   */
  costUsd: number;
};

const GROUNDING_RULES = [
  `You are Pat, Patalign's in-product guide. Answer ONLY using the provided context.`,
  `Be concise, plain-language, and friendly for a non-technical professional audience.`,
  `If the context does not clearly support an answer, do NOT guess: reply with exactly "${INSUFFICIENT_CONTEXT}" and nothing else.`,
].join(" ");

/**
 * Decide whether a fast-tier reply should escalate to the strong tier. Pure +
 * exported so the cascade policy is unit-testable without an API call. Escalates
 * when the reply is empty or signals insufficient context (sentinel as the whole
 * reply, or as the leading token).
 */
export function shouldEscalate(reply: string): boolean {
  const trimmed = reply.trim();
  if (!trimmed) return true;
  const upperLeadingToken = trimmed.toUpperCase().split(/[\s.:,!]/)[0];
  return upperLeadingToken === INSUFFICIENT_CONTEXT;
}

function isInsufficient(reply: string): boolean {
  // Same predicate shape as shouldEscalate, reused for the strong tier's verdict.
  return shouldEscalate(reply);
}

function buildSystem(baseSystem: string | undefined): string {
  return baseSystem ? `${baseSystem}\n\n${GROUNDING_RULES}` : GROUNDING_RULES;
}

async function callModel(input: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  context: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<{ text: string; costUsd: number }> {
  const client = new Anthropic({ apiKey: input.apiKey, timeout: input.timeoutMs, maxRetries: 0 });
  const userContent = input.context
    ? `Context:\n${input.context}\n\nQuestion:\n${input.prompt}`
    : input.prompt;

  const response = await client.messages.create({
    model: input.model,
    max_tokens: input.maxTokens,
    thinking: { type: "disabled" },
    system: input.system,
    messages: [{ role: "user", content: userContent }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return {
    text,
    costUsd: estimateCostUsd(input.model, response.usage.input_tokens, response.usage.output_tokens),
  };
}

/**
 * Generate a grounded Pat reply with Haiku→Sonnet cascade. Throws if no API key
 * is present (caller degrades). Never let the raw model decide side-effects —
 * this only produces text.
 */
export async function generatePatReply(input: {
  system?: string;
  prompt: string;
  /** Retrieved, role-scoped help context (already citation-bearing chunks joined). */
  context?: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** Allow escalation to the strong tier (default true). */
  allowEscalation?: boolean;
}): Promise<PatReply> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not present in the runtime env");
  }

  const system = buildSystem(input.system);
  const context = input.context ?? "";
  const maxTokens = input.maxTokens ?? 600;
  const timeoutMs = input.timeoutMs ?? PAT_CHAT_TIMEOUT_MS;
  const allowEscalation = input.allowEscalation ?? true;

  const fast = await callModel({
    apiKey,
    model: PAT_CHAT_MODEL_FAST,
    system,
    prompt: input.prompt,
    context,
    maxTokens,
    timeoutMs,
  });

  if (!allowEscalation || !shouldEscalate(fast.text)) {
    return {
      text: fast.text,
      modelUsed: "fast",
      escalated: false,
      insufficientContext: isInsufficient(fast.text),
      costUsd: fast.costUsd,
    };
  }

  const strong = await callModel({
    apiKey,
    model: PAT_CHAT_MODEL_STRONG,
    system,
    prompt: input.prompt,
    context,
    maxTokens,
    timeoutMs,
  });

  const insufficient = isInsufficient(strong.text);
  return {
    text: insufficient ? INSUFFICIENT_CONTEXT : strong.text,
    modelUsed: "strong",
    escalated: true,
    insufficientContext: insufficient,
    // BOTH tiers: an escalated answer cost the fast call as well as the strong
    // one, and charging only the second would under-report every escalation.
    costUsd: fast.costUsd + strong.costUsd,
  };
}
