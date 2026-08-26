import { redactToolArgs } from "@/lib/agents/redact";

/**
 * Sentry instrumentation, gated entirely on SENTRY_DSN presence.
 *
 * WITH NO DSN THIS FILE DOES NOTHING AND IMPORTS NOTHING. The SDK is loaded via
 * dynamic `import()` inside the DSN branch, so with the variable absent the
 * module is never evaluated, no transport is constructed, and no network call
 * can occur. A top-level `import * as Sentry` would defeat that: the SDK
 * installs global handlers on import, which is behaviour change in an
 * environment that opted out.
 *
 * That is the whole safety argument, and it is why the shape looks indirect.
 *
 * PII: `beforeSend` runs every event through the SAME redactor as the agent
 * audit trail (lib/agents/redact.ts) — size cap plus credential shapes — because
 * Sentry is a third-party append-only store and a secret sent there is gone.
 * `sendDefaultPii` is explicitly false.
 *
 * Nothing calls initSentry() automatically. Wiring it into an instrumentation
 * hook is a deploy-night decision, not a code default.
 */

export const SENTRY_DSN_ENV = "SENTRY_DSN";

/** True only when a DSN is actually configured. */
export function isSentryConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env[SENTRY_DSN_ENV]?.trim());
}

/** Fields Sentry attaches per event. Release ties an error to a known build. */
export interface SentryInitOptions {
  dsn: string;
  release: string | undefined;
  environment: string;
  tracesSampleRate: number;
  sendDefaultPii: false;
}

/**
 * Build the options object without touching the SDK — pure, so the DSN gate,
 * the release tag and the PII flag are all unit-testable without a network
 * stack or a real Sentry client.
 */
export function buildSentryOptions(env: NodeJS.ProcessEnv = process.env): SentryInitOptions | null {
  const dsn = env[SENTRY_DSN_ENV]?.trim();
  if (!dsn) {
    return null;
  }
  return {
    dsn,
    // Release tagging comes from the existing release fingerprint, so an event
    // names the same build id the /trust surface and launch proof already show.
    release: env.PAT_RELEASE_ID?.trim() || undefined,
    environment: env.VERCEL_ENV?.trim() || env.NODE_ENV || "development",
    // Errors only by default. Tracing is a paid-volume decision, not a default.
    tracesSampleRate: 0,
    sendDefaultPii: false,
  };
}

/** Event shape we scrub. Structural, so no SDK types are needed at rest. */
type ScrubbableEvent = {
  request?: { headers?: Record<string, unknown>; data?: unknown; cookies?: unknown } | null;
  extra?: Record<string, unknown> | null;
  tags?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
};

/**
 * Strip PII from an outbound event.
 *
 * Cookies and the user object go entirely — a session cookie is a live
 * credential and a user record is the PII this is meant not to send. Headers,
 * body and extras run through the audit redactor.
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  const scrubbed: ScrubbableEvent = { ...event };

  if (scrubbed.request) {
    const { headers, data } = scrubbed.request;
    scrubbed.request = {
      ...scrubbed.request,
      headers: headers ? (redactToolArgs(headers) as Record<string, unknown>) : undefined,
      data: data === undefined ? undefined : redactToolArgs(data as Record<string, unknown>),
      // Never forwarded, under any redaction.
      cookies: undefined,
    };
  }
  if (scrubbed.extra) {
    scrubbed.extra = redactToolArgs(scrubbed.extra) as Record<string, unknown>;
  }
  // Identity is the thing we are declining to send.
  scrubbed.user = null;

  return scrubbed as T;
}

/**
 * Initialise Sentry IF a DSN is present. Returns false when it did nothing, so a
 * caller can log the no-op rather than assume capture is live.
 */
export async function initSentry(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  const options = buildSentryOptions(env);
  if (!options) {
    return false;
  }
  // Dynamic: unreachable without a DSN, so the SDK is never evaluated.
  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    ...options,
    beforeSend: (event: unknown) => scrubSentryEvent(event as ScrubbableEvent),
  } as unknown as Parameters<typeof Sentry.init>[0]);
  return true;
}
