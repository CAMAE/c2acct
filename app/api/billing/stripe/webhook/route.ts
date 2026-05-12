import { NextResponse } from "next/server";
import { processStripeWebhook } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");
  const result = await processStripeWebhook({
    rawBody,
    signatureHeader,
  });

  return NextResponse.json(
    {
      ok: result.ok,
      message: result.message,
    },
    { status: result.status }
  );
}
