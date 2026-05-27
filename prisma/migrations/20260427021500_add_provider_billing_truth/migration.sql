-- Extend membership status for provider-backed subscription states.
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'INCOMPLETE';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'UNPAID';
ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_ACTION_REQUIRED';

-- Add provider reconciliation fields to the existing membership row.
ALTER TABLE "MembershipSubscription" ADD COLUMN "providerPriceRef" TEXT;
ALTER TABLE "MembershipSubscription" ADD COLUMN "providerStatus" TEXT;
ALTER TABLE "MembershipSubscription" ADD COLUMN "providerCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MembershipSubscription" ADD COLUMN "lastBillingEventType" TEXT;
ALTER TABLE "MembershipSubscription" ADD COLUMN "lastBillingEventAt" TIMESTAMP(3);
ALTER TABLE "MembershipSubscription" ADD COLUMN "lastWebhookEventId" TEXT;
ALTER TABLE "MembershipSubscription" ADD COLUMN "lastReconciledAt" TIMESTAMP(3);
ALTER TABLE "MembershipSubscription" ADD COLUMN "paymentActionRequiredAt" TIMESTAMP(3);

CREATE INDEX "MembershipSubscription_provider_externalCustomerRef_idx" ON "MembershipSubscription"("provider", "externalCustomerRef");
CREATE INDEX "MembershipSubscription_provider_externalSubscriptionRef_idx" ON "MembershipSubscription"("provider", "externalSubscriptionRef");

-- Provider customer identity. PAT stores provider refs only, never raw card data.
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCustomer_subjectId_provider_key" ON "BillingCustomer"("subjectId", "provider");
CREATE UNIQUE INDEX "BillingCustomer_provider_providerCustomerId_key" ON "BillingCustomer"("provider", "providerCustomerId");
CREATE INDEX "BillingCustomer_subjectId_idx" ON "BillingCustomer"("subjectId");

ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent webhook processing ledger.
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "apiVersion" TEXT,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'received',
    "processingError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingWebhookEvent_provider_providerEventId_key" ON "BillingWebhookEvent"("provider", "providerEventId");
CREATE INDEX "BillingWebhookEvent_provider_eventType_createdAt_idx" ON "BillingWebhookEvent"("provider", "eventType", "createdAt");
CREATE INDEX "BillingWebhookEvent_processingStatus_createdAt_idx" ON "BillingWebhookEvent"("processingStatus", "createdAt");

-- Invoice/payment state used to expose payment failures without storing payment method data.
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT,
    "provider" TEXT NOT NULL,
    "providerInvoiceId" TEXT NOT NULL,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "status" TEXT NOT NULL,
    "amountDue" INTEGER,
    "amountPaid" INTEGER,
    "currency" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdf" TEXT,
    "paymentIntentRef" TEXT,
    "lastPaymentError" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingInvoice_provider_providerInvoiceId_key" ON "BillingInvoice"("provider", "providerInvoiceId");
CREATE INDEX "BillingInvoice_subjectId_idx" ON "BillingInvoice"("subjectId");
CREATE INDEX "BillingInvoice_provider_providerSubscriptionId_idx" ON "BillingInvoice"("provider", "providerSubscriptionId");
CREATE INDEX "BillingInvoice_provider_providerCustomerId_idx" ON "BillingInvoice"("provider", "providerCustomerId");
CREATE INDEX "BillingInvoice_status_updatedAt_idx" ON "BillingInvoice"("status", "updatedAt");

ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
