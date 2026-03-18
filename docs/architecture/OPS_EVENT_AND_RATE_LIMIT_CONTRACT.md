# Ops Event And Rate Limit Contract

Generated: 2026-03-16

## Covered write surfaces

- `app/api/survey/submit/route.ts`
- `app/api/external-reviews/submit/route.ts`
- `app/api/network/invite-codes/route.ts`
- `app/api/network/invite-codes/claim/route.ts`

## Rate-limit contract

- Mutating routes must use DB-backed rate limiting through `lib/ops/rateLimit.ts`.
- Bucket keys must include enough identity to prevent cross-tenant bleed:
  - user id
  - effective company id
  - client IP
- On rate-limit storage failure, write routes now fail closed by default rather than silently allowing unlimited writes.
- Successful allowance remains window-based and deterministic by `bucketKey + windowStart + windowMs`.

## Audit-event contract

- Mutating routes must emit structured audit events for:
  - accepted writes
  - rate-limit blocking
- Audit payloads must include:
  - event key
  - category
  - outcome
  - actor user/company where known
  - subject company/product where relevant
  - request path and method
  - JSON details for operator review where useful

## Operator surface auth contract

- `app/admin/page.tsx` requires platform-admin authorization for both page access and create-company action.
- `app/api/health/db/route.ts` requires either:
  - platform-admin session
  - or `INTERNAL_HEALTHCHECK_KEY` via request header
- Tenant-scoped network write routes keep tenant-role and company-type checks in place.

## Verification

- `npm run verify:ops-hardening`
- `node --experimental-strip-types scripts/verify-operator-surface-auth.ts`
