import { getCommercialFeatureFlags, cleanProviderEnv } from "@/lib/commercialFlags";

export type PatAnalyticsEvent =
  | "assessment_start"
  | "page_advance"
  | "draft_saved"
  | "assessment_resume"
  | "insight_card_open"
  | "membership_panel_open"
  | "payment_processing_open"
  | "checkout_started"
  | "checkout_completed"
  | "payment_failed";

type AnalyticsPayload = {
  distinctId: string;
  event: PatAnalyticsEvent;
  properties?: Record<string, unknown>;
};

export function getAnalyticsConfiguration() {
  const flags = getCommercialFeatureFlags();
  const apiKey =
    cleanProviderEnv(process.env.PAT_POSTHOG_API_KEY) ?? cleanProviderEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const host =
    cleanProviderEnv(process.env.PAT_POSTHOG_HOST) ??
    cleanProviderEnv(process.env.NEXT_PUBLIC_POSTHOG_HOST) ??
    "https://app.posthog.com";

  return {
    enabled: flags.analyticsEnabled && Boolean(apiKey),
    apiKey,
    host,
  };
}

async function sendAnalyticsEvent(input: AnalyticsPayload) {
  const config = getAnalyticsConfiguration();
  if (!config.enabled || !config.apiKey) {
    return false;
  }

  try {
    await fetch(`${config.host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.apiKey,
        distinct_id: input.distinctId,
        event: input.event,
        properties: input.properties ?? {},
      }),
      cache: "no-store",
      keepalive: true,
    });

    return true;
  } catch {
    return false;
  }
}

export async function trackServerEvent(input: AnalyticsPayload) {
  return sendAnalyticsEvent(input);
}

export async function trackClientEvent(input: AnalyticsPayload) {
  return sendAnalyticsEvent(input);
}
