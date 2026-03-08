# Golden Path Repair Plan (Post-Auth Hardening)

## Objective
Repair the real browser flow end-to-end (`/survey/[key]` -> submit -> results -> outputs) after Task 1 auth hardening, while staying pre-Mac-mini, hardening-first, and build-green.

## Source Alignment
- Audit direction: `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`
- Auth/RBAC phases already landed: `docs/architecture/auth-rbac-implementation-checklist.md`, `docs/architecture/auth-rbac-phase1-file-plan.md`, `docs/architecture/auth-provider-decision.md`

## Current Broken Points In Browser Flow
1. Survey UI does not submit to API yet.
- `app/survey/[key]/page.tsx` currently loads module/questions and collects answers, but has no submit action to `app/api/survey/submit/route.ts`.

2. Browser flow is now auth-protected, but survey page has no auth-aware submit behavior.
- `app/api/survey/submit/route.ts` requires session and session company authority (401/403 enforcement).
- Client still behaves as if submit can be anonymous.

3. Results page is not company-scoped to current session in browser UX.
- `app/results/page.tsx` queries Prisma directly and shows global latest submission, not the session-scoped protected API result.
- This bypasses the new protected API contract and can show incorrect tenant data.

4. Outputs page is contract-inconsistent with protected APIs.
- `app/outputs/page.tsx` hardcodes company ID and passes company query hints now ignored by protected APIs.
- It calls `/api/insights/unlocked` with `POST` while route is `GET` (`app/api/insights/unlocked/route.ts`).
- It expects `latest` from results response, but API returns `result` (`app/api/results/route.ts`).

5. Score-contract drift risk still present.
- UI slider in `app/survey/[key]/page.tsx` is 1-5.
- Submit scoring in `app/api/survey/submit/route.ts` uses `scaleMin: 0, scaleMax: 5`.
- Core scoring mapping in `lib/scoring.ts` converts `[scaleMin..scaleMax]` to 0-100.

## Exact Files Involved
Primary repair files:
- `app/survey/[key]/page.tsx`
- `app/api/survey/submit/route.ts` (stability check only; avoid logic churn)
- `app/results/page.tsx`
- `app/outputs/page.tsx`

Auth/session context files (already hardened, rely on current behavior):
- `lib/auth/session.ts`
- `lib/authz.ts`
- `app/components/EnsureCompanySelected.tsx`
- `app/api/company/default/route.ts`
- `app/api/company/select/route.ts`

Protected read endpoints to align with (no contract breakage):
- `app/api/results/route.ts`
- `app/api/badges/earned/route.ts`
- `app/api/insights/unlocked/route.ts`

Validation helpers:
- `scripts/smoke-golden-path.ps1` (now auth-aware helper)

## Submit Flow Plan: `/survey/[key]` -> `/api/survey/submit`
1. Add submit action in `app/survey/[key]/page.tsx`.
- Build payload with `moduleKey` + `answers`.
- Keep optional `companyId` hint out of client payload by default (session is authority server-side).

2. Handle protected responses explicitly in survey UI.
- 401: redirect to `/login?callbackUrl=<current survey path>`.
- 403: show clear message (signed in but no company / not allowed).
- 400/404: surface API error details safely for debugging and user guidance.

3. Preserve server write hardening.
- Keep `app/api/survey/submit/route.ts` session-derived effective company behavior unchanged.
- Preserve success shape `{ ok: true, submission, milestoneReached }`.

## Auth/Session Implications For Browser Submit
- Browser submit is no longer anonymous by design.
- Session and session company are the only write authority.
- Client must treat `401` and `403` as first-class states instead of generic failures.
- Login callback should return users to the same survey URL to continue completion.

## Results/Outputs Consistency Plan
### Results
- Update `app/results/page.tsx` to use protected `/api/results` response path (session-scoped) rather than global Prisma query for latest submission.
- Keep page structure mostly intact.

### Outputs
- Update `app/outputs/page.tsx` to align to protected API contracts:
- Remove hardcoded company ID dependence for protected reads.
- Use `GET` for `/api/insights/unlocked`.
- Read `result` from `/api/results` response (not `latest`).
- Keep current output card rendering and unlock presentation logic where possible.

## Score-Contract Sanity Check (Required Before Closing Golden Path)
1. Decide and lock one scoring scale contract for v1 browser path.
- Option A: UI 1-5, server 1-5.
- Option B: UI 1-5, server normalization from 1-5 to 0-100 with explicit bounds.

2. Apply one contract consistently across:
- `app/survey/[key]/page.tsx` (input values)
- `app/api/survey/submit/route.ts` (scale passed to scoring)
- `lib/scoring.ts` (normalization math)

3. Verify no unlock/threshold regressions caused by scale changes.

## Smoke + Browser Validation Plan
1. Script-level preflight (non-auth bypass).
- Run `scripts/smoke-golden-path.ps1` for seed + module fetch + auth-required reminders.

2. Browser signed-in validation (manual, session-real).
- Sign in via `/login` (approved beta user with mapped `User.email`).
- Navigate `/survey/firm_alignment_v1`.
- Submit answers successfully.
- Confirm redirect/navigation to results state and latest submission visibility.
- Confirm outputs page loads without contract errors and shows unlocked/locked data based on session company.

3. Negative-path validation.
- Unauthenticated submit attempt -> 401 path to login callback.
- Authenticated user with null company -> 403 messaging in survey/results/outputs flows.

4. Build guard.
- Run `pnpm build` after each implementation slice.

## Smallest Correct Implementation Order
1. Survey submit wiring in `app/survey/[key]/page.tsx` with 401/403 handling.
2. Results page alignment to protected results contract in `app/results/page.tsx`.
3. Outputs page contract alignment in `app/outputs/page.tsx` (method/shape/company assumptions).
4. Score-contract sanity pass across `app/survey/[key]/page.tsx`, `app/api/survey/submit/route.ts`, `lib/scoring.ts`.
5. Manual signed-in browser validation + `pnpm build`.

## Done Criteria (Golden Path Next)
- Signed-in user can complete browser survey and persist submission.
- Results reflects session-scoped latest submission from protected API.
- Outputs works with protected API contracts and no hardcoded company authority.
- 401/403 states are handled intentionally in browser flow.
- Build remains green (`pnpm build`).
