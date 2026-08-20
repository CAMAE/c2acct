/**
 * Audit-payload redaction (S6).
 *
 * Every tool call is persisted verbatim into the immutable audit trail. That is
 * the right default for accountability and exactly wrong for secrets: a single
 * `http_fetch` with an Authorization header, or a `neon` call carrying a
 * connection string, writes a live credential into an append-only table that
 * nothing is allowed to update or delete. The audit log is also indexed into the
 * knowledge corpus, which is why it is walled off from retrieval (see
 * internal-knowledge/retrieve.ts) — but the cheaper fix is to never write the
 * secret down in the first place.
 *
 * Two independent rules, applied before persistence:
 *   1. Size — a value longer than MAX_VALUE_CHARS is replaced by its length.
 *      Large blobs are where pasted keys and dumps hide, and the audit trail
 *      does not need the body to prove the call happened.
 *   2. Shape — values matching a known credential shape, or sitting under a
 *      key that names a credential, are replaced regardless of size.
 *
 * Redaction is one-way and lossy on purpose. What survives is the structure of
 * the call (which keys, which types, how big), which is what an operator
 * reconstructing an incident actually needs.
 */

/** Values longer than this are replaced by a length marker. */
export const MAX_VALUE_CHARS = Number(process.env.PAT_AUDIT_MAX_VALUE_CHARS ?? 512);

/** Keys whose value is a credential by definition, whatever it looks like. */
const SECRET_KEY_PATTERN =
  /(^|[_\-.])(secret|password|passwd|token|api[_-]?key|apikey|auth|authorization|credential|cookie|session|private[_-]?key|signature|hmac)($|[_\-.])|^key$/i;

/** Value shapes that are credentials wherever they appear. */
const SECRET_VALUE_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "anthropic-key", pattern: /\bsk-ant-[A-Za-z0-9_-]{16,}/ },
  { name: "openai-style-key", pattern: /\bsk-[A-Za-z0-9]{32,}/ },
  { name: "aws-access-key-id", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "telegram-bot-token", pattern: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/ },
  { name: "bearer-header", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i },
  // A URL carrying inline credentials (postgres://user:pass@host, https://u:p@h).
  { name: "url-credentials", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+:[^\s/@]+@/i },
  { name: "pem-private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
];

export const REDACTED_SECRET = "[redacted: secret-shaped]";
export const REDACTED_KEYNAME = "[redacted: secret-named key]";

function redactedForSize(length: number): string {
  return `[redacted: ${length} chars over ${MAX_VALUE_CHARS}-char audit limit]`;
}

/** Does this string contain anything credential-shaped? */
export function looksSecret(value: string): boolean {
  return SECRET_VALUE_PATTERNS.some(({ pattern }) => pattern.test(value));
}

function redactString(value: string, keyIsSecret: boolean): string {
  if (keyIsSecret) return REDACTED_KEYNAME;
  if (looksSecret(value)) return REDACTED_SECRET;
  if (value.length > MAX_VALUE_CHARS) return redactedForSize(value.length);
  return value;
}

/**
 * Deep-redact an arbitrary JSON-ish value. Depth is bounded so a cyclic or
 * pathological structure cannot stall the audit write that is trying to record
 * a call in flight.
 */
export function redactValue(value: unknown, keyIsSecret = false, depth = 0): unknown {
  if (depth > 8) {
    return "[redacted: max depth]";
  }
  if (typeof value === "string") {
    return redactString(value, keyIsSecret);
  }
  if (value === null || typeof value !== "object") {
    return keyIsSecret ? REDACTED_KEYNAME : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, keyIsSecret, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = redactValue(entry, keyIsSecret || SECRET_KEY_PATTERN.test(key), depth + 1);
  }
  return out;
}

/** Redact a tool-args map for persistence into the audit trail. */
export function redactToolArgs(args: unknown): Record<string, unknown> {
  const redacted = redactValue(args ?? {}, false, 0);
  if (redacted && typeof redacted === "object" && !Array.isArray(redacted)) {
    return redacted as Record<string, unknown>;
  }
  return { value: redacted };
}

/** Redact an arbitrary tool result for persistence. */
export function redactToolResult(result: unknown): unknown {
  return redactValue(result, false, 0);
}
