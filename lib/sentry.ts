import { getCommercialFeatureFlags, cleanProviderEnv } from "@/lib/commercialFlags";

type SentryLevel = "error" | "warning" | "info";

function parseSentryDsn(dsn: string) {
  const url = new URL(dsn);
  const projectId = url.pathname.replace(/^\/+/, "");

  if (!url.username || !projectId) {
    return null;
  }

  return {
    publicKey: url.username,
    secretKey: url.password || null,
    projectId,
    storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
  };
}

export function getSentryConfiguration() {
  const flags = getCommercialFeatureFlags();
  const dsn = cleanProviderEnv(process.env.PAT_SENTRY_DSN) ?? cleanProviderEnv(process.env.SENTRY_DSN);
  const parsed = dsn ? parseSentryDsn(dsn) : null;

  return {
    enabled: flags.sentryEnabled && Boolean(parsed),
    dsn,
    parsed,
  };
}

async function sendSentryEvent(input: {
  level: SentryLevel;
  message: string;
  extra?: Record<string, unknown>;
}) {
  const config = getSentryConfiguration();
  if (!config.enabled || !config.parsed) {
    return false;
  }

  try {
    await fetch(
      `${config.parsed.storeUrl}?sentry_key=${encodeURIComponent(config.parsed.publicKey)}&sentry_version=7`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: crypto.randomUUID().replace(/-/g, ""),
          level: input.level,
          message: input.message,
          extra: input.extra ?? {},
          platform: "javascript",
          timestamp: Math.floor(Date.now() / 1000),
          environment: process.env.NODE_ENV ?? "development",
        }),
        cache: "no-store",
        keepalive: true,
      }
    );

    return true;
  } catch {
    return false;
  }
}

export async function captureException(error: unknown, extra?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  return sendSentryEvent({
    level: "error",
    message,
    extra: {
      ...(error instanceof Error ? { stack: error.stack } : {}),
      ...(extra ?? {}),
    },
  });
}

export async function captureMessage(message: string, extra?: Record<string, unknown>) {
  return sendSentryEvent({
    level: "info",
    message,
    extra,
  });
}
