# Governance Program — Phase 1 evidence (B-table engineering gaps)

**2026-07-09.** Verify-first, then fix. Evidence per item (before → after).

## B4 — Webhook idempotency: PRESENT (race hardened)
- **Verify:** already present — `BillingWebhookEvent` with `@@unique([provider, providerEventId])` (schema.prisma) + dedupe-before-process in `lib/billing/reconcile.ts:persistStripeWebhookEvent` (already-processed → `shouldProcess:false`).
- **Gap found:** `findUnique` + `create` not atomic → concurrent same-event delivery could both pass the check.
- **Fix:** `reconcile.ts` — catch `P2002` on create, re-fetch, defer to the winner (`shouldProcess:false`). **Contract test:** `tests/webhook-idempotency.contract.test.ts` (new/processed/race).

## B5 — Transaction boundaries: 7 multi-write flows wrapped
Before: sequential `prisma.*` writes without `$transaction`. After: `prisma.$transaction` with `tx` threaded into every write + `recordOperatorAuditEvent(…, tx)`.
- `app/admin/actions.ts`: `createOrganizationAction`, `updateOrganizationMembershipAction`, `updateUserMembershipAction`, `createPilotUserAction`, `createConsultantAction`, `upsertConsultantAssignmentAction` (ecosystem+delete+create+audit). Subject helpers now accept a tx client.
- Already-correct (no change): `lib/provisioning/account.ts`, `app/api/survey/submit`, `app/api/vendor/product-assessment/submit`.

## B3 — Security headers: CSP report-only + HSTS + frame-ancestors
- Before: `vercel.json` had X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy only. No CSP, no HSTS.
- After: `next.config.ts` `headers()` — **Content-Security-Policy-Report-Only** (default-src 'self'; frame-ancestors 'none'; Stripe allowances), **Strict-Transport-Security** (2y, preload), plus the existing four. CSP ships report-only first (staged enforcement).

## B6 — Auth rate limits: added (reusing the durable limiter)
- Before: `consumeDurableRateLimit` existed but sign-in/password-change had NO throttle.
- After: `lib/security/authRateLimit.ts` (`checkAuthRateLimit`, 10/5min, keyed IP+identifier) wired into `signInWithPilotCredentials`, `updateFirstLoginPasswordAction`, `signInWithLocalReviewCredentials` (redirect `error=rate_limited`).

## B11 — Mass assignment / zod: AUDIT CLEAN (no fix needed)
- **Zero** mass-assignment sinks found — every prisma `data:` spread is over an explicitly-constructed object, never raw client input. 7 routes use zod schemas; server actions use typed field extractors (getString/getEmail/getNumber) — allowlist by construction. Documented; no change.

## B12 — Log PII: fixed the one console leak; audit-table emails are intentional
- **Console/diagnostic layer:** `lib/patDiagnostics.ts` already sanitizes (primitives only). Fixed `lib/agents/scheduler.ts` to log `error.message` only, never the raw error object (stack/cause can carry PII).
- **Operator audit table (`OperatorAudit`):** emails in `summary`/`details` are an INTENTIONAL accountability record (who acted on whom), stored in the DB — not a log-drain leak. Left as-is by design; noted here.
- **Structured IDs:** `recordPatDiagnostic` is the structured layer (area/level/status). Full request-correlation IDs + an error monitor (Sentry — audit B2) are a separate ops follow-up, not in the Phase-1 fix set.

**Validation:** lint · typecheck · 672 unit (+3 webhook idempotency) · build · prelaunch · e2e · validate:launch · launch:proof.
