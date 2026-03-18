# Read Path Purity Contract

Generated: 2026-03-16

## Canonical read paths in this hardening slice

- `app/api/results/route.ts`
- `app/api/badges/earned/route.ts`
- `app/api/insights/unlocked/route.ts`
- `app/api/outputs/product-dimensions/route.ts`
- `lib/intelligence/getProductIntelligencePageData.ts`

## Purity rule

- Canonical GET/read paths must not create, update, upsert, or delete Prisma records.
- Read paths may derive computed views from existing persisted records.
- Unlock evidence persistence belongs to write-time assessment/review processing, not read-time page hydration.

## Current implementation truth

- `app/api/insights/unlocked/route.ts` now uses `evaluateUnlockedInsights`, which is read-only.
- `lib/intelligence/getProductIntelligencePageData.ts` now uses `evaluateUnlockedInsights`, which is read-only.
- `lib/engine/evaluateInsightUnlocks.ts` no longer writes `UnlockEvidence` from read contexts.

## Allowed write paths

- `app/api/survey/submit/route.ts`
- `app/api/external-reviews/submit/route.ts`
- `app/api/network/invite-codes/route.ts`
- `app/api/network/invite-codes/claim/route.ts`

## Verification

- `node --experimental-strip-types scripts/verify-read-path-purity.ts`
