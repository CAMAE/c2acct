import crypto from "node:crypto";

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer?: string;
  subscription?: string;
};

export type StripeCustomer = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type StripePortalSession = {
  id: string;
  url: string;
};

export type StripeSubscriptionLike = {
  id: string;
  customer?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  trial_end?: number | null;
  canceled_at?: number | null;
  metadata?: Record<string, string | undefined>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
};

export type StripeInvoiceLike = {
  id: string;
  customer?: string;
  subscription?: string;
  status?: string;
  amount_due?: number;
  amount_paid?: number;
  currency?: string;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  payment_intent?: string | null | { id?: string };
  last_payment_error?: { message?: string } | null;
  metadata?: Record<string, string | undefined>;
};

export type StripeEvent = {
  id: string;
  type: string;
  api_version?: string;
  livemode?: boolean;
  created?: number;
  data: {
    object: Record<string, unknown>;
  };
};

type StripeRequestInput = {
  secretKey: string;
  path: string;
  params: URLSearchParams;
};

async function stripeRequest<T>({ secretKey, path, params }: StripeRequestInput): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message ?? `Stripe request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function buildStripeCheckoutSessionParams(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
}) {
  const params = new URLSearchParams({
    mode: "subscription",
    customer: input.customerId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.clientReferenceId,
    "line_items[0][price]": input.priceId,
    "line_items[0][quantity]": "1",
    allow_promotion_codes: "true",
    // Payment methods are intentionally NOT hardcoded. By omitting
    // payment_method_types, Stripe Checkout dynamically offers every method you've
    // enabled in the Dashboard (Settings → Payment methods) that supports
    // subscriptions — cards, wallets (Link, Cash App Pay, Amazon Pay), and US
    // business bank accounts via ACH Direct Debit. Control acceptance from the
    // Dashboard, no code change needed.
  });

  for (const [key, value] of Object.entries(input.metadata)) {
    params.set(`metadata[${key}]`, value);
    params.set(`subscription_data[metadata][${key}]`, value);
  }

  return params;
}

export async function createStripeCustomer(input: {
  secretKey: string;
  email: string;
  name: string;
  metadata: Record<string, string>;
}) {
  const params = new URLSearchParams({
    email: input.email,
    name: input.name,
  });

  for (const [key, value] of Object.entries(input.metadata)) {
    params.set(`metadata[${key}]`, value);
  }

  return stripeRequest<StripeCustomer>({
    secretKey: input.secretKey,
    path: "customers",
    params,
  });
}

export async function createStripeCheckoutSession(input: {
  secretKey: string;
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  metadata: Record<string, string>;
}) {
  return stripeRequest<StripeCheckoutSession>({
    secretKey: input.secretKey,
    path: "checkout/sessions",
    params: buildStripeCheckoutSessionParams(input),
  });
}

export async function createStripeCustomerPortalSession(input: {
  secretKey: string;
  customerId: string;
  returnUrl: string;
}) {
  return stripeRequest<StripePortalSession>({
    secretKey: input.secretKey,
    path: "billing_portal/sessions",
    params: new URLSearchParams({
      customer: input.customerId,
      return_url: input.returnUrl,
    }),
  });
}

function parseStripeSignatureHeader(header: string) {
  return Object.fromEntries(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhookSignature(input: {
  payload: string;
  signatureHeader: string | null;
  webhookSecret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}) {
  if (!input.signatureHeader) {
    return false;
  }

  const values = parseStripeSignatureHeader(input.signatureHeader);
  const timestamp = Number(values.t ?? "0");
  const signature = values.v1;
  if (!timestamp || !signature) {
    return false;
  }

  const toleranceSeconds = input.toleranceSeconds ?? 300;
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", input.webhookSecret)
    .update(`${timestamp}.${input.payload}`)
    .digest("hex");

  return safeEqual(expected, signature);
}

export function createStripeTestSignature(input: {
  payload: string;
  webhookSecret: string;
  timestamp: number;
}) {
  const signature = crypto
    .createHmac("sha256", input.webhookSecret)
    .update(`${input.timestamp}.${input.payload}`)
    .digest("hex");
  return `t=${input.timestamp},v1=${signature}`;
}
