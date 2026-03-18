# DB Integrity Contract

Generated: 2026-03-16

## Purpose

This document defines which database invariants are expected to hold on the current schema and how they are verified.

## Contract boundaries

- Repo-shape verification is not the same as DB-backed proof.
- DB-backed proof requires:
  - a reachable PostgreSQL database
  - the current Prisma schema
  - migrations applied as far as the target DB state allows
  - a query path using `psql` or Docker-backed `psql`
- In this workspace, terminal-level DB queries succeeded, but the new Node verifier scripts are blocked by harness child-process restrictions (`EPERM`).

## Required invariants

### External review finalization

- Finalized external reviews must be unique per:
  - `reviewerCompanyId`
  - `reviewerUserId` with `NULL` normalized to `__NONE__`
  - `subjectCompanyId`
  - `subjectProductId` with `NULL` normalized to `__NONE__`
  - `moduleId`
- Enforced by migration:
  - `prisma/migrations/20260316160000_external_review_finalized_uniqueness/migration.sql`
- Current truth:
  - blocked in the local DB because duplicate finalized rows already exist

### Unlock evidence and capability provenance

- `UnlockEvidence` must not point to missing `CompanyBadge`, `SurveySubmission`, or `ExternalObservedSignalRollup` records
- `CompanyCapabilityScore` provenance links must not point to missing `SurveySubmission` or `ExternalObservedSignalRollup` records
- Current local DB result:
  - verified clean

### Target-scope uniqueness

- `CompanyBadge` must be unique on `targetScopeKey + badgeId + moduleId`
- `CompanyCapabilityScore` must be unique on `targetScopeKey + moduleId + nodeId + scoreVersion + sourceType`
- `ExternalObservedSignalRollup` must be unique on `targetScopeKey + moduleId + rollupVersion`
- `targetScopeKey` must be present and non-blank on those tables
- Current local DB result:
  - verified clean

### Sponsor and invite integrity

- `SponsorRelationship.vendorCompanyId` must reference a `VENDOR` company
- `SponsorRelationship.firmCompanyId` must reference a `FIRM` company
- `InviteCode.vendorCompanyId` must reference a `VENDOR` company
- `InviteCode.claimCount` must never be negative
- `InviteCode.claimCount` must not exceed `maxClaims`
- Active invite codes should not remain active once exhausted
- Current local DB result:
  - verified clean

### Ops table sanity

- `ApiRateLimitBucket` and `AuditEvent` tables must exist after the ops migration
- `ApiRateLimitBucket.requestCount` must not be negative
- `ApiRateLimitBucket.windowMs` must be positive
- `AuditEvent.eventKey` and `AuditEvent.outcome` must not be blank
- Current local DB result:
  - verified clean

### Migration health

- `_prisma_migrations` must not contain unresolved failed migrations
- `20260316143000_add_ops_audit_and_rate_limit` should be fully applied
- `20260316160000_external_review_finalized_uniqueness` should be fully applied
- `ExternalReviewSubmission_single_finalized_identity_idx` should exist
- Current local DB result:
  - one failed migration remains unresolved
  - ops migration is applied
  - finalized uniqueness migration is not applied
  - finalized uniqueness index is not present

## Verification surfaces

- Source-shape verifiers:
  - `scripts/verify-external-review-concurrency.ts`
  - `scripts/verify-membership-viewer-context.ts`
  - `scripts/verify-visibility-matrix.ts`
  - `scripts/verify-ops-hardening.ts`
- DB-backed verifiers added in this pass:
  - `scripts/verify-db-integrity.ts`
  - `scripts/verify-migration-health.ts`

## Current local DB findings

- Duplicate finalized-review groups: `1`
- Duplicate finalized-review rows in that blocking group: `3`
- Unlock/capability orphans: `0`
- Target-scope collisions: `0`
- Sponsor/invite referential or claim-state issues: `0`
- Ops table sanity issues: `0`
- Failed migrations in `_prisma_migrations`: `1`

## Next action required

- Deduplicate the blocking finalized-review rows in `ExternalReviewSubmission`
- Resolve the failed migration entry using Prisma migration recovery workflow
- Re-run:
  - `npm run prisma:migrate:deploy`
  - `node --experimental-strip-types scripts/verify-migration-health.ts`
  - `node --experimental-strip-types scripts/verify-db-integrity.ts`
