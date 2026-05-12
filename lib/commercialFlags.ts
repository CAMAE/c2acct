function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

export function cleanProviderEnv(value: string | undefined | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export type CommercialFeatureFlags = {
  billingEnabled: boolean;
  bankMethodsEnabled: boolean;
  paypalEnabled: boolean;
  emailSendingEnabled: boolean;
  analyticsEnabled: boolean;
  sentryEnabled: boolean;
};

export function getCommercialFeatureFlags(): CommercialFeatureFlags {
  const billingSecret =
    cleanProviderEnv(process.env.PAT_BILLING_STRIPE_SECRET_KEY) ?? cleanProviderEnv(process.env.STRIPE_SECRET_KEY);
  const analyticsKey =
    cleanProviderEnv(process.env.PAT_POSTHOG_API_KEY) ?? cleanProviderEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  const sentryDsn = cleanProviderEnv(process.env.PAT_SENTRY_DSN) ?? cleanProviderEnv(process.env.SENTRY_DSN);
  const resendKey = cleanProviderEnv(process.env.PAT_RESEND_API_KEY) ?? cleanProviderEnv(process.env.RESEND_API_KEY);
  const postmarkKey =
    cleanProviderEnv(process.env.PAT_POSTMARK_SERVER_TOKEN) ?? cleanProviderEnv(process.env.POSTMARK_SERVER_TOKEN);

  return {
    billingEnabled: parseBooleanEnv(process.env.PAT_ENABLE_BILLING, Boolean(billingSecret)),
    bankMethodsEnabled: parseBooleanEnv(process.env.PAT_ENABLE_BILLING_BANK_METHODS, false),
    paypalEnabled: parseBooleanEnv(process.env.PAT_ENABLE_BILLING_PAYPAL, false),
    emailSendingEnabled: parseBooleanEnv(
      process.env.PAT_ENABLE_TRANSACTIONAL_EMAIL,
      Boolean(resendKey || postmarkKey)
    ),
    analyticsEnabled: parseBooleanEnv(process.env.PAT_ENABLE_ANALYTICS, Boolean(analyticsKey)),
    sentryEnabled: parseBooleanEnv(process.env.PAT_ENABLE_SENTRY, Boolean(sentryDsn)),
  };
}
