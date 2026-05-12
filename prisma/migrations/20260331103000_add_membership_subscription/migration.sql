-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('FREE', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'TRIAL', 'PENDING_CHECKOUT', 'PAST_DUE', 'CANCELED');

-- CreateTable
CREATE TABLE "MembershipSubscription" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "plan" "MembershipPlan" NOT NULL,
    "status" "MembershipStatus" NOT NULL,
    "provider" TEXT,
    "externalCustomerRef" TEXT,
    "externalSubscriptionRef" TEXT,
    "checkoutSessionRef" TEXT,
    "checkoutRequestedPlan" "MembershipPlan",
    "startedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipSubscription_subjectId_key" ON "MembershipSubscription"("subjectId");

-- CreateIndex
CREATE INDEX "MembershipSubscription_plan_status_idx" ON "MembershipSubscription"("plan", "status");

-- CreateIndex
CREATE INDEX "MembershipSubscription_subjectId_status_idx" ON "MembershipSubscription"("subjectId", "status");

-- AddForeignKey
ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
