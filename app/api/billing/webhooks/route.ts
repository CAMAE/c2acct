import { NextResponse } from "next/server";
import { getBillingConfig } from "@/lib/billing/config";
import { processStripeWebhookEvent } from "@/lib/billing/reconcile";
import { type StripeEvent, verifyStripeWebhookSignature } from "@/lib/billing/stripe";
import { consumeDurableRateLimit, getClientIp, rateLimitJsonResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getBillingConfig();
  if (config.mode !== "configured" || !config.webhookSecret) {
    return NextResponse.json(
      { ok: false, reason: config.webhookSecret ? "billing-disabled" : "missing-stripe-webhook-secret" },
      { status: 503 }
    );
  }

  const quota = await consumeDurableRateLimit({
    scope: "billing.webhook",
    key: getClientIp(request),
    limit: 120,
    windowMs: 60_000,
  });

  if (!quota.allowed) {
    return rateLimitJsonResponse(quota);
  }

  const payload = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const verified = verifyStripeWebhookSignature({
    payload,
    signatureHeader,
    webhookSecret: config.webhookSecret,
  });

  if (!verified) {
    return NextResponse.json({ ok: false, reason: "invalid-stripe-signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid-json-payload" }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent({ event, config });
    return NextResponse.json({
      ok: result.ok,
      duplicate: result.duplicate,
      processed: result.processed,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
        eventId: event.id,
        eventType: event.type,
      },
      { status: 500 }
    );
  }
}
