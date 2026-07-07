-- Pat AI assistant opt-in consent (Elite Sprint Block A, 2026-07-07).
-- Additive only: one row per user, default opted-out.

CREATE TABLE "AiAssistantConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "consentVersion" TEXT,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiAssistantConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiAssistantConsent_userId_key" ON "AiAssistantConsent"("userId");

ALTER TABLE "AiAssistantConsent"
    ADD CONSTRAINT "AiAssistantConsent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
