import type { MembershipPlan } from "@prisma/client";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

export type BillingProvider = "stripe";
export type BillingMode = "configured" | "disabled";

export type BillingConfig = {
  mode: BillingMode;
  provider: BillingProvider;
  disabledReason: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  appBaseUrl: string;
  prices: Record<MembershipAudience, Partial<Record<MembershipPlan, string>>>;
};

function envFlagEnabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function cleanUrl(value: string | undefined) {
  return (value?.trim() || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function getBillingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
  const enabled = envFlagEnabled(env.PAT_BILLING_ENABLED);
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || null;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  const prices: BillingConfig["prices"] = {
    vendor: {
      [MEMBERSHIP_PLAN.PRO]: env.STRIPE_PRICE_VENDOR_PRO?.trim(),
      [MEMBERSHIP_PLAN.ELITE]: env.STRIPE_PRICE_VENDOR_ELITE?.trim(),
    },
    firm: {
      [MEMBERSHIP_PLAN.PRO]: env.STRIPE_PRICE_FIRM_PRO?.trim(),
      [MEMBERSHIP_PLAN.ELITE]: env.STRIPE_PRICE_FIRM_ELITE?.trim(),
    },
    individual: {
      [MEMBERSHIP_PLAN.PRO]: env.STRIPE_PRICE_INDIVIDUAL_PRO?.trim() || env.STRIPE_PRICE_USER_PRO?.trim(),
      [MEMBERSHIP_PLAN.ELITE]: env.STRIPE_PRICE_INDIVIDUAL_ELITE?.trim() || env.STRIPE_PRICE_USER_ELITE?.trim(),
    },
  };

  const disabledReason = !enabled
    ? "billing_disabled"
    : !secretKey
      ? "missing_stripe_secret_key"
      : null;

  return {
    mode: disabledReason ? "disabled" : "configured",
    provider: "stripe",
    disabledReason,
    secretKey,
    webhookSecret,
    appBaseUrl: cleanUrl(env.PAT_PUBLIC_BASE_URL || env.NEXT_PUBLIC_APP_URL || env.AUTH_URL || env.NEXTAUTH_URL),
    prices,
  };
}

export function getBillingPriceId(input: {
  config?: BillingConfig;
  audience: MembershipAudience;
  plan: MembershipPlan;
}) {
  const config = input.config ?? getBillingConfig();
  return config.prices[input.audience]?.[input.plan] ?? null;
}

export function getBillingModeForPlan(input: {
  config?: BillingConfig;
  audience: MembershipAudience;
  plan: MembershipPlan;
}) {
  const config = input.config ?? getBillingConfig();
  if (config.mode === "disabled") {
    return {
      mode: "disabled" as const,
      reason: config.disabledReason ?? "billing_disabled",
      priceId: null,
    };
  }

  const priceId = getBillingPriceId({ config, audience: input.audience, plan: input.plan });
  if (!priceId) {
    return {
      mode: "disabled" as const,
      reason: "missing_plan_price",
      priceId: null,
    };
  }

  return {
    mode: "configured" as const,
    reason: null,
    priceId,
  };
}
