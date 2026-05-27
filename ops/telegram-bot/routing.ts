/**
 * Natural-language router for non-slash, non-reply messages. Classifies which
 * agent a free-text message is about. Deterministic keyword matching today; the
 * Haiku 4.5 seam (per the blueprint) activates when ANTHROPIC_API_KEY is set.
 *
 * Phase 1d does not auto-run agents from chat (to avoid surprise production
 * actions) — it classifies and points the operator at the right command. The
 * run-queue hand-off lands with the admin console / Pilot Ops.
 */

export type RoutableAgent = "qa-smoke" | "cloudflare-watcher" | "pilot-ops";

export function classifyAgent(text: string): RoutableAgent | null {
  const lower = text.toLowerCase();
  if (/(patalign\.com|dns|nameserver|name server|cloudflare|zone|domain)/.test(lower)) {
    return "cloudflare-watcher";
  }
  if (/(pilot|invite|invitation|signup|sign-up|provision|onboard|re-?engage)/.test(lower)) {
    return "pilot-ops";
  }
  if (/(health|sign-?in|deploy|fingerprint|smoke|qa|production|\bprod\b|release|uptime)/.test(lower)) {
    return "qa-smoke";
  }
  return null;
}

export async function routeMessage(text: string): Promise<string> {
  // Haiku seam: when ANTHROPIC_API_KEY is configured, classify ambiguous text
  // with Haiku 4.5 here. Until then, deterministic keyword routing.
  const agent = classifyAgent(text);
  if (!agent) {
    return "I couldn't route that to an agent. Try /help for commands.";
  }
  if (agent === "qa-smoke") {
    return "That looks like a QA / production-health question. Use /qa run to trigger a check or /qa status for the latest.";
  }
  if (agent === "cloudflare-watcher") {
    return "That looks like a domain / DNS question (cloudflare-watcher). It runs every 2h; /audit cloudflare-watcher shows recent checks.";
  }
  return "That looks like a Pilot Ops request. Pilot Ops (Phase 1b) is not online yet.";
}
