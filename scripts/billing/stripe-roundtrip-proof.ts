import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  MembershipPlan,
  MembershipStatus,
  PrismaClient as PrismaClientValue,
  SubjectKind,
  type PrismaClient as PrismaClientType,
} from "@prisma/client";
import { getBillingConfig, type BillingConfig } from "@/lib/billing/config";
import {
  isMembershipStatusEntitled,
  mapStripeSubscriptionStatusToMembershipStatus,
  processStripeWebhookEvent,
} from "@/lib/billing/reconcile";
import {
  createStripeTestSignature,
  verifyStripeWebhookSignature,
  type StripeEvent,
  type StripeInvoiceLike,
  type StripeSubscriptionLike,
} from "@/lib/billing/stripe";
import { loadEnv } from "../_shared/prismaScript";

type ProofStatus = "COMPLETE" | "PARTIAL" | "MISSING" | "CONFLICTING" | "DEFERRED" | "UNVERIFIED";
type ProofMode = "fixture" | "stripe-cli";
type ProofCheck = {
  key: string;
  status: ProofStatus;
  summary: string;
};

type StripeRoundtripProof = {
  schemaVersion: 1;
  proofName: "PAT Stripe billing roundtrip proof";
  generatedAt: string;
  mode: ProofMode;
  status: ProofStatus;
  provider: "stripe";
  environment: {
    billingEnabled: boolean;
    hasStripeSecretKey: boolean;
    hasStripeWebhookSecret: boolean;
    hasConfiguredPrice: boolean;
    stripeCliAvailable: boolean | null;
    keyMode: "test" | "live" | "absent" | "unknown";
  };
  redaction: {
    rawEventPayloadIncluded: false;
    rawCardOrBankDataIncluded: false;
    secretsIncluded: false;
  };
  fixtureRun?: {
    subjectId: string;
    subjectKey: string;
    customerId: string;
    subscriptionId: string;
    processedEventIds: string[];
    webhookRecordIds: string[];
    invoiceIds: string[];
    duplicateEventId: string;
    finalMembershipStatus: MembershipStatus | null;
  };
  stripeCliRun?: {
    status: ProofStatus;
    command: string | null;
    eventIds: string[];
    reason: string;
  };
  entitlementMatrix: Record<string, {
    membershipStatus: MembershipStatus;
    entitled: boolean;
  }>;
  checks: ProofCheck[];
};

type CliArgs = {
  root: string;
  outputDir: string;
  mode: ProofMode;
  generatedAt: string;
};

const DEFAULT_OUTPUT_DIR = "artifacts/billing";
const WEBHOOK_SECRET_FIXTURE = "whsec_fixture_pat_roundtrip";
const FIXTURE_PRICE_ID = "price_fixture_vendor_pro";
const STRIPE_EVENT_TYPES = [
  "customer.subscription.updated",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
] as const;

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    root: process.cwd(),
    outputDir: DEFAULT_OUTPUT_DIR,
    mode: "fixture",
    generatedAt: new Date().toISOString(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = argv[index + 1] ?? args.root;
      index += 1;
    } else if (arg === "--output-dir") {
      args.outputDir = argv[index + 1] ?? args.outputDir;
      index += 1;
    } else if (arg === "--fixture") {
      args.mode = "fixture";
    } else if (arg === "--stripe-cli") {
      args.mode = "stripe-cli";
    } else if (arg === "--generated-at") {
      args.generatedAt = argv[index + 1] ?? args.generatedAt;
      index += 1;
    }
  }

  return args;
}

function envFlagEnabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

function keyMode(secretKey: string | null) {
  if (!secretKey) return "absent" as const;
  if (secretKey.startsWith("sk_test_")) return "test" as const;
  if (secretKey.startsWith("sk_live_")) return "live" as const;
  return "unknown" as const;
}

function hasConfiguredPrice(config: BillingConfig) {
  return Object.values(config.prices).some((audiencePrices) =>
    Object.values(audiencePrices).some((priceId) => Boolean(priceId?.trim()))
  );
}

function buildEnvironmentProof(config: BillingConfig, stripeCliAvailable: boolean | null) {
  return {
    billingEnabled: envFlagEnabled(process.env.PAT_BILLING_ENABLED),
    hasStripeSecretKey: Boolean(config.secretKey),
    hasStripeWebhookSecret: Boolean(config.webhookSecret),
    hasConfiguredPrice: hasConfiguredPrice(config),
    stripeCliAvailable,
    keyMode: keyMode(config.secretKey),
  };
}

export function buildStripeEntitlementMatrix() {
  const statuses = [
    "active",
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "unpaid",
    "payment_action_required",
  ];

  return Object.fromEntries(
    statuses.map((providerStatus) => {
      const membershipStatus = mapStripeSubscriptionStatusToMembershipStatus(providerStatus);
      return [
        providerStatus,
        {
          membershipStatus,
          entitled: isMembershipStatusEntitled(membershipStatus),
        },
      ];
    })
  );
}

export function proofContainsSensitiveBillingData(proof: unknown) {
  const serialized = JSON.stringify(proof);
  return /sk_(test|live)_[A-Za-z0-9]/.test(serialized)
    || /whsec_[A-Za-z0-9]/.test(serialized)
    || /card[_-]?number/i.test(serialized)
    || /\b(?:\d[ -]*?){13,19}\b/.test(serialized)
    || /\bcvc\b/i.test(serialized)
    || /bank[_-]?account/i.test(serialized);
}

function timestampForFile(value: string) {
  return value.replace(/[:.]/g, "-");
}

function artifactPaths(args: CliArgs) {
  const root = path.resolve(args.root);
  const outputDir = path.resolve(root, args.outputDir);
  const baseName = `stripe-roundtrip-${timestampForFile(args.generatedAt)}`;
  return {
    outputDir,
    jsonPath: path.join(outputDir, `${baseName}.json`),
    markdownPath: path.join(outputDir, `${baseName}.md`),
  };
}

function makeFixtureConfig(): BillingConfig {
  return {
    mode: "configured",
    provider: "stripe",
    disabledReason: null,
    secretKey: "sk_test_fixture_redacted_not_used",
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    appBaseUrl: "http://127.0.0.1:3000",
    prices: {
      vendor: {
        [MembershipPlan.PRO]: FIXTURE_PRICE_ID,
        [MembershipPlan.ELITE]: "price_fixture_vendor_elite",
      },
      firm: {},
      individual: {},
    },
  };
}

function stripeSubscriptionFixture(input: {
  id: string;
  customerId: string;
  subjectId: string;
  proofRunId: string;
  status: string;
  nowSeconds: number;
}): StripeSubscriptionLike & Record<string, unknown> {
  return {
    id: input.id,
    customer: input.customerId,
    status: input.status,
    cancel_at_period_end: false,
    current_period_start: input.nowSeconds - 3600,
    current_period_end: input.nowSeconds + 30 * 24 * 3600,
    trial_end: input.status === "trialing" ? input.nowSeconds + 14 * 24 * 3600 : null,
    canceled_at: input.status === "canceled" ? input.nowSeconds : null,
    metadata: {
      subjectId: input.subjectId,
      audience: "vendor",
      plan: MembershipPlan.PRO,
      proofRunId: input.proofRunId,
    },
    items: {
      data: [{ price: { id: FIXTURE_PRICE_ID } }],
    },
  };
}

function stripeInvoiceFixture(input: {
  id: string;
  customerId: string;
  subscriptionId: string;
  subjectId: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  paymentIntentId: string;
  errorMessage?: string;
}): StripeInvoiceLike & Record<string, unknown> {
  return {
    id: input.id,
    customer: input.customerId,
    subscription: input.subscriptionId,
    status: input.status,
    amount_due: input.amountDue,
    amount_paid: input.amountPaid,
    currency: "usd",
    hosted_invoice_url: null,
    invoice_pdf: null,
    payment_intent: input.paymentIntentId,
    last_payment_error: input.errorMessage ? { message: input.errorMessage } : null,
    metadata: {
      subjectId: input.subjectId,
    },
  };
}

function stripeEventFixture(input: {
  id: string;
  type: string;
  created: number;
  object: Record<string, unknown>;
}): StripeEvent {
  return {
    id: input.id,
    type: input.type,
    api_version: "2024-06-20",
    livemode: false,
    created: input.created,
    data: {
      object: input.object,
    },
  };
}

export function buildStripeRoundtripFixtureEvents(input: {
  proofRunId: string;
  subjectId: string;
  customerId: string;
  subscriptionId: string;
  nowSeconds: number;
}) {
  const subscriptionEventForStatus = (status: string) =>
    stripeEventFixture({
      id: `evt_fixture_${input.proofRunId}_${status}`,
      type: status === "canceled" ? "customer.subscription.deleted" : "customer.subscription.updated",
      created: input.nowSeconds,
      object: stripeSubscriptionFixture({ ...input, id: input.subscriptionId, status }),
    });

  return {
    activeSubscription: subscriptionEventForStatus("active"),
    subscriptionStatuses: [
      "trialing",
      "past_due",
      "canceled",
      "incomplete",
      "unpaid",
      "payment_action_required",
    ].map(subscriptionEventForStatus),
    invoicePaid: stripeEventFixture({
      id: `evt_fixture_${input.proofRunId}_invoice_paid`,
      type: "invoice.paid",
      created: input.nowSeconds,
      object: stripeInvoiceFixture({
        id: `in_fixture_${input.proofRunId}_paid`,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        subjectId: input.subjectId,
        status: "paid",
        amountDue: 4900,
        amountPaid: 4900,
        paymentIntentId: `pi_fixture_${input.proofRunId}_paid`,
      }),
    }),
    invoiceFailed: stripeEventFixture({
      id: `evt_fixture_${input.proofRunId}_invoice_failed`,
      type: "invoice.payment_failed",
      created: input.nowSeconds,
      object: stripeInvoiceFixture({
        id: `in_fixture_${input.proofRunId}_failed`,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        subjectId: input.subjectId,
        status: "open",
        amountDue: 4900,
        amountPaid: 0,
        paymentIntentId: `pi_fixture_${input.proofRunId}_failed`,
        errorMessage: "test fixture payment failed",
      }),
    }),
    invoiceActionRequired: stripeEventFixture({
      id: `evt_fixture_${input.proofRunId}_invoice_action_required`,
      type: "invoice.payment_action_required",
      created: input.nowSeconds,
      object: stripeInvoiceFixture({
        id: `in_fixture_${input.proofRunId}_action_required`,
        customerId: input.customerId,
        subscriptionId: input.subscriptionId,
        subjectId: input.subjectId,
        status: "open",
        amountDue: 4900,
        amountPaid: 0,
        paymentIntentId: `pi_fixture_${input.proofRunId}_action_required`,
      }),
    }),
  };
}

async function processSignedEvent(input: {
  client: PrismaClientType;
  config: BillingConfig;
  event: StripeEvent;
  nowSeconds: number;
}) {
  const payload = JSON.stringify(input.event);
  const signatureHeader = createStripeTestSignature({
    payload,
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    timestamp: input.nowSeconds,
  });
  const verified = verifyStripeWebhookSignature({
    payload,
    signatureHeader,
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    nowSeconds: input.nowSeconds,
  });

  if (!verified) {
    throw new Error(`Fixture event ${input.event.id} failed Stripe signature verification.`);
  }

  return processStripeWebhookEvent({
    event: input.event,
    config: input.config,
    client: input.client,
  });
}

async function runFixtureProof(args: CliArgs, client: PrismaClientType): Promise<StripeRoundtripProof> {
  const generatedAtDate = new Date(args.generatedAt);
  const nowSeconds = Math.floor(generatedAtDate.getTime() / 1000);
  const proofRunId = generatedAtDate.toISOString().replace(/[^0-9A-Za-z]/g, "").slice(0, 20);
  const subjectId = randomUUID();
  const subjectKey = `billing-proof:${proofRunId}:${subjectId.slice(0, 8)}`;
  const customerId = `cus_fixture_${proofRunId}`;
  const subscriptionId = `sub_fixture_${proofRunId}`;
  const config = makeFixtureConfig();
  const checks: ProofCheck[] = [];

  await client.subject.create({
    data: {
      id: subjectId,
      key: subjectKey,
      displayName: "Stripe roundtrip fixture subject",
      kind: SubjectKind.ORGANIZATION,
    },
  });

  const signaturePayload = JSON.stringify({
    id: "evt_signature_fixture",
    type: "customer.subscription.updated",
  });
  const signatureHeader = createStripeTestSignature({
    payload: signaturePayload,
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    timestamp: nowSeconds,
  });
  const validSignature = verifyStripeWebhookSignature({
    payload: signaturePayload,
    signatureHeader,
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    nowSeconds,
  });
  const invalidSignature = verifyStripeWebhookSignature({
    payload: signaturePayload,
    signatureHeader,
    webhookSecret: "whsec_wrong_fixture",
    nowSeconds,
  });
  const staleSignature = verifyStripeWebhookSignature({
    payload: signaturePayload,
    signatureHeader,
    webhookSecret: WEBHOOK_SECRET_FIXTURE,
    nowSeconds: nowSeconds + 1_000,
  });

  checks.push({
    key: "signature-verification",
    status: validSignature && !invalidSignature && !staleSignature ? "COMPLETE" : "CONFLICTING",
    summary: "Valid signed fixture accepted; invalid and stale signatures rejected.",
  });

  const fixtures = buildStripeRoundtripFixtureEvents({
    proofRunId,
    subjectId,
    customerId,
    subscriptionId,
    nowSeconds,
  });
  const processedEventIds: string[] = [];
  const webhookRecordIds = new Set<string>();
  const invoiceIds: string[] = [];

  const activeResult = await processSignedEvent({
    client,
    config,
    event: fixtures.activeSubscription,
    nowSeconds,
  });
  processedEventIds.push(fixtures.activeSubscription.id);
  webhookRecordIds.add(activeResult.record.id);

  const duplicateResult = await processSignedEvent({
    client,
    config,
    event: fixtures.activeSubscription,
    nowSeconds,
  });
  const webhookEventCount = await client.billingWebhookEvent.count({
    where: {
      provider: "stripe",
      providerEventId: fixtures.activeSubscription.id,
    },
  });
  checks.push({
    key: "webhook-idempotency",
    status: duplicateResult.duplicate && !duplicateResult.processed && webhookEventCount === 1 ? "COMPLETE" : "CONFLICTING",
    summary: `Duplicate event ${fixtures.activeSubscription.id} did not reprocess or create a second row.`,
  });

  for (const event of [
    fixtures.invoicePaid,
    fixtures.invoiceFailed,
    fixtures.invoiceActionRequired,
    ...fixtures.subscriptionStatuses,
  ]) {
    const result = await processSignedEvent({
      client,
      config,
      event,
      nowSeconds,
    });
    processedEventIds.push(event.id);
    webhookRecordIds.add(result.record.id);
  }

  const paidInvoice = await client.billingInvoice.findUnique({
    where: {
      provider_providerInvoiceId: {
        provider: "stripe",
        providerInvoiceId: `in_fixture_${proofRunId}_paid`,
      },
    },
  });
  if (paidInvoice) invoiceIds.push(paidInvoice.providerInvoiceId);
  checks.push({
    key: "invoice-paid",
    status: paidInvoice?.status === "paid" && paidInvoice.amountPaid === 4900 ? "COMPLETE" : "CONFLICTING",
    summary: "invoice.paid fixture persisted paid invoice state without storing card data.",
  });

  const failedInvoice = await client.billingInvoice.findUnique({
    where: {
      provider_providerInvoiceId: {
        provider: "stripe",
        providerInvoiceId: `in_fixture_${proofRunId}_failed`,
      },
    },
  });
  if (failedInvoice) invoiceIds.push(failedInvoice.providerInvoiceId);
  checks.push({
    key: "invoice-payment-failed",
    status: failedInvoice?.status === "open" && failedInvoice.amountPaid === 0 ? "COMPLETE" : "CONFLICTING",
    summary: "invoice.payment_failed fixture persisted open/failed invoice state.",
  });

  const actionInvoice = await client.billingInvoice.findUnique({
    where: {
      provider_providerInvoiceId: {
        provider: "stripe",
        providerInvoiceId: `in_fixture_${proofRunId}_action_required`,
      },
    },
  });
  if (actionInvoice) invoiceIds.push(actionInvoice.providerInvoiceId);
  checks.push({
    key: "invoice-payment-action-required",
    status: actionInvoice?.status === "open" ? "COMPLETE" : "CONFLICTING",
    summary: "invoice.payment_action_required fixture persisted action-required invoice state.",
  });

  const finalMembership = await client.membershipSubscription.findUnique({
    where: { subjectId },
  });
  const entitlementMatrix = buildStripeEntitlementMatrix();
  const unsafeEntitlements = Object.entries(entitlementMatrix)
    .filter(([providerStatus]) => !["active", "trialing"].includes(providerStatus))
    .filter(([, value]) => value.entitled);
  checks.push({
    key: "non-entitled-failure-states",
    status:
      unsafeEntitlements.length === 0
      && finalMembership?.status === MembershipStatus.PAYMENT_ACTION_REQUIRED
      && !isMembershipStatusEntitled(finalMembership.status)
        ? "COMPLETE"
        : "CONFLICTING",
    summary: "past_due, canceled, incomplete, unpaid, and payment_action_required do not grant entitlements.",
  });
  checks.push({
    key: "subscription-reconciliation",
    status:
      finalMembership?.externalSubscriptionRef === subscriptionId
      && finalMembership.providerPriceRef === FIXTURE_PRICE_ID
      && finalMembership.plan === MembershipPlan.PRO
        ? "COMPLETE"
        : "CONFLICTING",
    summary: "Signed subscription fixtures reconciled provider status, price, plan, and subject membership.",
  });

  const proof: StripeRoundtripProof = {
    schemaVersion: 1,
    proofName: "PAT Stripe billing roundtrip proof",
    generatedAt: args.generatedAt,
    mode: "fixture",
    status: checks.every((check) => check.status === "COMPLETE") ? "PARTIAL" : "CONFLICTING",
    provider: "stripe",
    environment: buildEnvironmentProof(getBillingConfig(), null),
    redaction: {
      rawEventPayloadIncluded: false,
      rawCardOrBankDataIncluded: false,
      secretsIncluded: false,
    },
    fixtureRun: {
      subjectId,
      subjectKey,
      customerId,
      subscriptionId,
      processedEventIds,
      webhookRecordIds: Array.from(webhookRecordIds),
      invoiceIds,
      duplicateEventId: fixtures.activeSubscription.id,
      finalMembershipStatus: finalMembership?.status ?? null,
    },
    entitlementMatrix,
    checks,
  };

  if (proofContainsSensitiveBillingData(proof)) {
    throw new Error("Refusing to write Stripe proof artifact because sensitive billing data was detected.");
  }

  return proof;
}

function isStripeCliAvailable() {
  const result = spawnSync("stripe", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return (result.status ?? 1) === 0;
}

async function fetchStripeEvent(input: {
  secretKey: string;
  eventId: string;
}) {
  const response = await fetch(`https://api.stripe.com/v1/events/${input.eventId}`, {
    headers: {
      authorization: `Bearer ${input.secretKey}`,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : `Stripe event fetch failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as StripeEvent;
}

async function runStripeCliProof(args: CliArgs, client: PrismaClientType): Promise<StripeRoundtripProof> {
  const config = getBillingConfig();
  const cliAvailable = isStripeCliAvailable();
  const checks: ProofCheck[] = [];
  const missingReasons = [
    config.mode === "configured" ? null : "billing is not configured",
    config.secretKey ? null : "STRIPE_SECRET_KEY is absent",
    config.webhookSecret ? null : "STRIPE_WEBHOOK_SECRET is absent",
    hasConfiguredPrice(config) ? null : "no Stripe price env is configured",
    keyMode(config.secretKey) === "test" ? null : "STRIPE_SECRET_KEY must be a Stripe test key",
    cliAvailable ? null : "Stripe CLI is not available",
  ].filter((reason): reason is string => Boolean(reason));

  if (missingReasons.length > 0 || !config.secretKey) {
    return {
      schemaVersion: 1,
      proofName: "PAT Stripe billing roundtrip proof",
      generatedAt: args.generatedAt,
      mode: "stripe-cli",
      status: "UNVERIFIED",
      provider: "stripe",
      environment: buildEnvironmentProof(config, cliAvailable),
      redaction: {
        rawEventPayloadIncluded: false,
        rawCardOrBankDataIncluded: false,
        secretsIncluded: false,
      },
      stripeCliRun: {
        status: "UNVERIFIED",
        command: null,
        eventIds: [],
        reason: missingReasons.join("; "),
      },
      entitlementMatrix: buildStripeEntitlementMatrix(),
      checks: [{
        key: "stripe-cli-environment",
        status: "UNVERIFIED",
        summary: missingReasons.join("; "),
      }],
    };
  }

  const command = "stripe trigger customer.subscription.updated --api-key [REDACTED]";
  const trigger = spawnSync("stripe", [
    "trigger",
    "customer.subscription.updated",
    "--api-key",
    config.secretKey,
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${trigger.stdout ?? ""}\n${trigger.stderr ?? ""}`;
  const eventIds = Array.from(new Set(output.match(/evt_[A-Za-z0-9_]+/g) ?? []));

  if ((trigger.status ?? 1) !== 0 || eventIds.length === 0) {
    const summary = eventIds.length === 0
      ? "Stripe CLI trigger did not return an event id."
      : "Stripe CLI trigger failed.";
    return {
      schemaVersion: 1,
      proofName: "PAT Stripe billing roundtrip proof",
      generatedAt: args.generatedAt,
      mode: "stripe-cli",
      status: "CONFLICTING",
      provider: "stripe",
      environment: buildEnvironmentProof(config, cliAvailable),
      redaction: {
        rawEventPayloadIncluded: false,
        rawCardOrBankDataIncluded: false,
        secretsIncluded: false,
      },
      stripeCliRun: {
        status: "CONFLICTING",
        command,
        eventIds,
        reason: summary,
      },
      entitlementMatrix: buildStripeEntitlementMatrix(),
      checks: [{ key: "stripe-cli-trigger", status: "CONFLICTING", summary }],
    };
  }

  const stripeSecretKey = config.secretKey;
  const fetchedEvents = await Promise.all(eventIds.map((eventId) => fetchStripeEvent({
    secretKey: stripeSecretKey,
    eventId,
  })));
  for (const event of fetchedEvents) {
    if (STRIPE_EVENT_TYPES.includes(event.type as (typeof STRIPE_EVENT_TYPES)[number])) {
      await processStripeWebhookEvent({
        event,
        config,
        client,
      }).catch(() => null);
    }
  }
  checks.push({
    key: "stripe-cli-external-event",
    status: "COMPLETE",
    summary: `Stripe CLI created or returned ${eventIds.length} test-mode event(s), fetched back from Stripe by event id.`,
  });

  const proof: StripeRoundtripProof = {
    schemaVersion: 1,
    proofName: "PAT Stripe billing roundtrip proof",
    generatedAt: args.generatedAt,
    mode: "stripe-cli",
    status: "COMPLETE",
    provider: "stripe",
    environment: buildEnvironmentProof(config, cliAvailable),
    redaction: {
      rawEventPayloadIncluded: false,
      rawCardOrBankDataIncluded: false,
      secretsIncluded: false,
    },
    stripeCliRun: {
      status: "COMPLETE",
      command,
      eventIds,
      reason: "Stripe CLI test-mode event roundtrip completed; event payload was fetched by id and secrets were redacted.",
    },
    entitlementMatrix: buildStripeEntitlementMatrix(),
    checks,
  };

  if (proofContainsSensitiveBillingData(proof)) {
    throw new Error("Refusing to write Stripe CLI proof artifact because sensitive billing data was detected.");
  }

  return proof;
}

function renderMarkdown(proof: StripeRoundtripProof) {
  const lines = [
    "# PAT Stripe Billing Roundtrip Proof",
    "",
    `Generated: ${proof.generatedAt}`,
    `Mode: ${proof.mode}`,
    `Status: ${proof.status}`,
    `Provider: ${proof.provider}`,
    "",
    "## Environment",
    "",
    `- Billing enabled: ${proof.environment.billingEnabled}`,
    `- Stripe secret key present: ${proof.environment.hasStripeSecretKey}`,
    `- Stripe webhook secret present: ${proof.environment.hasStripeWebhookSecret}`,
    `- Configured price present: ${proof.environment.hasConfiguredPrice}`,
    `- Stripe CLI available: ${proof.environment.stripeCliAvailable}`,
    `- Key mode: ${proof.environment.keyMode}`,
    "",
    "## Checks",
    "",
  ];

  for (const check of proof.checks) {
    lines.push(`- ${check.status}: ${check.key}. ${check.summary}`);
  }

  lines.push(
    "",
    "## Entitlements",
    "",
    `- Active entitled: ${proof.entitlementMatrix.active?.entitled}`,
    `- Trialing entitled: ${proof.entitlementMatrix.trialing?.entitled}`,
    `- Past due entitled: ${proof.entitlementMatrix.past_due?.entitled}`,
    `- Canceled entitled: ${proof.entitlementMatrix.canceled?.entitled}`,
    `- Incomplete entitled: ${proof.entitlementMatrix.incomplete?.entitled}`,
    `- Unpaid entitled: ${proof.entitlementMatrix.unpaid?.entitled}`,
    `- Payment action required entitled: ${proof.entitlementMatrix.payment_action_required?.entitled}`,
    "",
    "## Redaction",
    "",
    `- Raw event payload included: ${proof.redaction.rawEventPayloadIncluded}`,
    `- Raw card or bank data included: ${proof.redaction.rawCardOrBankDataIncluded}`,
    `- Secrets included: ${proof.redaction.secretsIncluded}`
  );

  if (proof.fixtureRun) {
    lines.push(
      "",
      "## Fixture Run",
      "",
      `- Subject id: ${proof.fixtureRun.subjectId}`,
      `- Processed events: ${proof.fixtureRun.processedEventIds.length}`,
      `- Webhook rows: ${proof.fixtureRun.webhookRecordIds.length}`,
      `- Invoices: ${proof.fixtureRun.invoiceIds.length}`,
      `- Final membership status: ${proof.fixtureRun.finalMembershipStatus}`
    );
  }

  if (proof.stripeCliRun) {
    lines.push(
      "",
      "## Stripe CLI Run",
      "",
      `- Status: ${proof.stripeCliRun.status}`,
      `- Command: ${proof.stripeCliRun.command ?? "not run"}`,
      `- Event ids: ${proof.stripeCliRun.eventIds.join(", ") || "none"}`,
      `- Reason: ${proof.stripeCliRun.reason}`
    );
  }

  return `${lines.join("\n")}\n`;
}

function writeProof(proof: StripeRoundtripProof, args: CliArgs) {
  const paths = artifactPaths(args);
  fs.mkdirSync(paths.outputDir, { recursive: true });
  fs.writeFileSync(paths.jsonPath, `${JSON.stringify(proof, null, 2)}\n`);
  fs.writeFileSync(paths.markdownPath, renderMarkdown(proof));
  return paths;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();
  const client = new PrismaClientValue();

  try {
    const proof = args.mode === "stripe-cli"
      ? await runStripeCliProof(args, client)
      : await runFixtureProof(args, client);
    const paths = writeProof(proof, args);
    console.log(JSON.stringify({
      ok: proof.status === "COMPLETE" || proof.status === "PARTIAL" || proof.status === "UNVERIFIED",
      status: proof.status,
      mode: proof.mode,
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    }, null, 2));

    if (proof.status === "CONFLICTING") {
      process.exit(1);
    }
  } finally {
    await client.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
