-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('OPEN', 'COMPLETED', 'EXPIRED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingPaymentMethodType" AS ENUM ('CARD', 'US_BANK_ACCOUNT');

-- AlterTable
ALTER TABLE "MembershipSubscription"
ADD COLUMN "defaultPaymentMethodRef" TEXT,
ADD COLUMN "externalPriceRef" TEXT;

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "provider" "BillingProvider",
    "externalCustomerRef" TEXT,
    "contactName" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "billingPhone" TEXT,
    "companyLegalName" TEXT,
    "taxId" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "region" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "consentToStoreMethod" BOOLEAN NOT NULL DEFAULT false,
    "consentAcceptedAt" TIMESTAMP(3),
    "defaultPaymentMethodRef" TEXT,
    "defaultPaymentMethodType" "BillingPaymentMethodType",
    "defaultPaymentMethodLabel" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCheckout" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" "BillingProvider" NOT NULL,
    "requestedPlan" "MembershipPlan" NOT NULL,
    "currentPlan" "MembershipPlan" NOT NULL,
    "status" "BillingCheckoutStatus" NOT NULL,
    "paymentMethodChoice" TEXT NOT NULL,
    "providerCustomerRef" TEXT,
    "providerCheckoutSessionRef" TEXT,
    "providerSubscriptionRef" TEXT,
    "enabledPaymentMethodTypes" JSONB,
    "billingProfileSnapshot" JSONB,
    "successUrl" TEXT,
    "cancelUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "latestWebhookEventRef" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPaymentMethod" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalCustomerRef" TEXT,
    "providerPaymentMethodRef" TEXT NOT NULL,
    "type" "BillingPaymentMethodType" NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "bankName" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "reusable" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingPaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "provider" "BillingProvider" NOT NULL,
    "providerInvoiceRef" TEXT NOT NULL,
    "providerPaymentIntentRef" TEXT,
    "providerChargeRef" TEXT,
    "providerReceiptUrl" TEXT,
    "hostedInvoiceUrl" TEXT,
    "invoicePdfUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "amountDue" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "amountRemaining" INTEGER NOT NULL DEFAULT 0,
    "status" "BillingInvoiceStatus" NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "providerEventRef" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL DEFAULT false,
    "status" "BillingWebhookStatus" NOT NULL,
    "signatureHeader" TEXT,
    "eventCreatedAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "checkoutId" TEXT,
    "subjectId" TEXT,
    "subscriptionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_subjectId_key" ON "BillingProfile"("subjectId");

-- CreateIndex
CREATE INDEX "BillingProfile_externalCustomerRef_idx" ON "BillingProfile"("externalCustomerRef");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCheckout_providerCheckoutSessionRef_key" ON "BillingCheckout"("providerCheckoutSessionRef");

-- CreateIndex
CREATE INDEX "BillingCheckout_provider_status_idx" ON "BillingCheckout"("provider", "status");

-- CreateIndex
CREATE INDEX "BillingCheckout_subjectId_createdAt_idx" ON "BillingCheckout"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingCheckout_subscriptionId_createdAt_idx" ON "BillingCheckout"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPaymentMethod_providerPaymentMethodRef_key" ON "BillingPaymentMethod"("providerPaymentMethodRef");

-- CreateIndex
CREATE INDEX "BillingPaymentMethod_subjectId_isDefault_idx" ON "BillingPaymentMethod"("subjectId", "isDefault");

-- CreateIndex
CREATE INDEX "BillingPaymentMethod_externalCustomerRef_idx" ON "BillingPaymentMethod"("externalCustomerRef");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_providerInvoiceRef_key" ON "BillingInvoice"("providerInvoiceRef");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_createdAt_idx" ON "BillingInvoice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BillingInvoice_subjectId_createdAt_idx" ON "BillingInvoice"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingInvoice_subscriptionId_createdAt_idx" ON "BillingInvoice"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_providerEventRef_key" ON "BillingWebhookEvent"("providerEventRef");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_provider_status_receivedAt_idx" ON "BillingWebhookEvent"("provider", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_eventType_receivedAt_idx" ON "BillingWebhookEvent"("eventType", "receivedAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_subjectId_receivedAt_idx" ON "BillingWebhookEvent"("subjectId", "receivedAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_subscriptionId_receivedAt_idx" ON "BillingWebhookEvent"("subscriptionId", "receivedAt");

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCheckout" ADD CONSTRAINT "BillingCheckout_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPaymentMethod" ADD CONSTRAINT "BillingPaymentMethod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "BillingCheckout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
