# CORE BUILD AAE

## Purpose

This file is the repo-level build order and launch-readiness guide for the current PAT implementation. It reflects the live operator-first product shape in this repo rather than earlier assumptions from pre-PAT or partially implemented AAE notes.

The current launch truth is:

- First-party credentials is the production auth provider.
- Deterministic bootstrap users remain the intended manual QA path.
- Firm PAT uses the canonical five-module model.
- Vendor product assessment, taxonomy, dynamic assessment plans, and product insights are live enough for review.
- Membership pages and cards exist for vendor, firm, and individual audiences.
- `/admin` is the active C2Core operator control plane.
- `/admin/briefings` is the active consultant/operator briefing surface.
- Member briefing remains staged off until stronger person-side maturity exists.

## Current source-of-truth docs

- Repo entrypoint: `README.md`
- Active repo map: `docs/active-repo-map.md`
- Build guide source note: `docs/architecture/core-build-guide-source-of-truth.md`
- Historical guide artifact check: `docs/audit/Core_Build_AAE_Guide_Artifact_Check_2026-04-01.md`
- Portal visibility matrix: `docs/architecture/pat-portal-visibility-matrix-phase1.md`
- PAT assessment architecture: `docs/architecture/pat-assessment-engine-phase1.md`
- Auth contract: `docs/architecture/auth-env-contract.md`
- Runtime hardening snapshot: `docs/architecture/runtime-hardening-status-2026-03-08.md`
- Audit summary: `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`

Operator note:

- Treat this file and `docs/active-repo-map.md` as the canonical current-state truth.
- Treat `Core Build AAE Guide.pages` as historical-only if and when the actual file is available and identity-verified.
- Treat `docs/archive/**`, `scripts/archive/**`, and older planning notes as historical context only unless this file points back to them explicitly.

## Final recommended build order

### 1. Auth and local review access first

Auth is the first real dependency because every protected PAT page, submit path, admin surface, and briefing depends on a valid Auth.js session.

- Production path:
  - Credentials provider remains primary.
  - Non-provisioned or passwordless users are denied by design.
- Local QA path:
  - Enable only when `NODE_ENV !== "production"` and `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`.
  - Requires `AUTH_SECRET` plus `PAT_LOCAL_REVIEW_PASSWORD`.
  - Deterministic local review users:
    - `review.vendor@pat.local`
    - `review.firm@pat.local`
    - `review.individual@pat.local`
    - `review.admin@pat.local`
- Canonical sign-in surfaces:
  - `/sign-in`
  - `/sign-in/vendor`
  - `/sign-in/firm`
  - `/sign-in/user`
  - `/sign-in?view=admin`
- Compatibility-only sign-in alias:
  - `/login` -> redirect to `/sign-in`
- Local reset path:
  - `/api/auth/local-reset`

### 2. Identity model and tenancy boundary

After auth works, PAT depends on company/subject context being resolved correctly.

- Company-backed firm and vendor paths remain the canonical operating model.
- Subject-aware compatibility exists where needed, but company-rooted records still remain canonical for several write paths.
- Membership is now a real model with audience-aware resolution and free-tier fallback.
- Do not treat invitee access as the live authenticated production path.

Compatibility bridge note:

- The dual-read company cookie, `User.companyId` fallback, and subject/company scope fallback are still live launch bridges.
- They are intentional compatibility behavior, not the desired long-term steady-state model.
- Do not document them as retired until the runtime and migrations no longer depend on them.

### 3. Portal and role surfaces

Once auth and context resolve cleanly, the live role surfaces are:

- Firm:
  - `/firm`
  - `/firm/alignment-assessment`
  - `/firm/insights`
  - `/firm/admin`
  - `/firm/membership`
- Vendor:
  - `/vendor`
  - `/vendor/product-assessment`
  - `/vendor/alignment-insights`
  - `/vendor/product-insight`
  - `/vendor/admin`
  - `/vendor/membership`
- Individual:
  - `/user`
  - `/user/alignment-assessment`
  - `/user/insights`
  - `/user/profile`
  - `/user/membership`
- Operator:
  - `/admin`
  - `/admin/*`

Compatibility-only routes still exist, but they should not be treated as product truth:

- `/survey` -> compatibility redirect to the firm assessment path
- `/results` -> compatibility redirect to canonical role interpretation
- `/outputs` -> compatibility redirect to canonical role insights
- `/profiles` -> compatibility redirect to canonical role profile/admin

### 4. Canonical firm PAT assessment model

The only canonical firm assessment model is the five-module PAT system.

- Modules:
  - `firm_alignment_operating_model_v1`
  - `firm_alignment_automation_ai_v1`
  - `firm_alignment_data_flow_v1`
  - `firm_alignment_governance_v1`
  - `firm_alignment_strategy_v1`
- Question contract:
  - 5 modules
  - 20 questions per module
  - 100 scored firm questions total
- Section contract:
  - first-class `SurveySection`
  - section-aware pacing
  - 5-question section progression where authored

The older legacy single-module firm survey is no longer canonical and must remain compatibility-only if retained at all.

### 5. Vendor and product utility taxonomy

Product taxonomy is now real infrastructure, not a placeholder.

- Research-backed utility registry exists.
- Utility families, subcategories, and question-bank architecture are versioned.
- Product taxonomy assignments and capability mappings are operator-manageable through `/admin`.
- Utility/subcategory structure is designed for vendor-first use now and later perspective reuse from firm and individual views.

### 6. Product assessment blueprint and perspective reuse

Vendor product assessment is no longer mostly missing.

- Product profile metadata exists.
- Dynamic product assessment plans persist stable utility selections, generated question ids, section order, and version.
- Product assessment includes:
  - product-general module
  - utility-driven sections
  - final open-ended questions
- The architecture is built for future reuse from firm and individual review perspectives without reseeding every combination as static survey rows.

### 7. Scoring, badges, unlock rules, and evidence

Scoring rules stay conservative and explicit.

- Canonical score:
  - raw score remains the canonical submission score
- Confidence:
  - `signalIntegrityScore` stays separate
  - confidence does not replace canonical score
- Capability layer:
  - question-to-capability mappings are seeded
  - final PAT firm submits write capability scores
- Firm insight unlocks:
  - require completion plus capability-grounded thresholds
- Evidence:
  - insights should show module, section, cluster, and question-basis detail where current data supports it
  - unsupported benchmark or forecast claims remain off-limits

Compatibility note:

- `lib/patUnlocks.ts` and `lib/patDashboard.ts` remain only as thin compatibility helpers for older generic dashboard concepts.
- Canonical unlock logic now lives in the PAT insight engines and evaluation path, not in those legacy helper files.

### 8. Membership and portal gating

Membership is implemented enough to support UI truth now and payments later.

- Plans:
  - `FREE`
  - `PRO`
  - `ELITE`
- Statuses:
  - `ACTIVE`
  - `TRIAL`
  - `PENDING_CHECKOUT`
  - `PAST_DUE`
  - `CANCELED`
- Role-specific routes:
  - `/vendor/membership`
  - `/firm/membership`
  - `/user/membership`
  - role-specific checkout placeholders
- Membership cards are present on relevant portal/admin surfaces.
- Free fallback resolution is shared and safe when no membership row exists yet.

### 9. C2Core admin/operator control plane

Admin is not absent. `/admin` is the live operator overview and control plane.

Current operator routes:

- `/admin`
- `/admin/organizations`
- `/admin/organizations/[companyId]`
- `/admin/users`
- `/admin/taxonomy`
- `/admin/modules`
- `/admin/insights`
- `/admin/products`
- `/admin/products/[productId]`
- `/admin/runtime`
- `/admin/briefings`

Current admin capabilities include:

- company and user oversight
- membership edits
- taxonomy and bucket management
- product taxonomy assignment
- module/section/question management
- capability mapping
- insight rule management
- portal visibility updates
- runtime diagnostics

Admin mutations log `OperatorAuditEvent`.

### 10. Consultant briefing layer

The active briefing implementation is operator-facing and lives under `/admin/briefings`.

- It summarizes:
  - executive summary
  - individual layer
  - firm layer
  - product layer
  - ecosystem layer
  - insight narrative
  - risks and opportunities
  - 30/60/90 next actions
  - confidence and evidence appendix
- It uses current engine data only.
- It separates canonical score from confidence.
- It explicitly avoids unsupported benchmarks and forecasts.

Member briefing is still staged:

- Keep `PAT_ENABLE_MEMBER_BRIEFING=0` unless person-side maturity is strong enough to support a truthful member-native briefing.
- Do not repurpose the operator briefing as a member-facing launch surface.

### 11. Validation and launch-readiness checklist

Use this order for clean-machine validation:

1. `npm install`
2. `npm run db:recreate`
3. `npm run prisma:migrate:local`
4. `PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:baseline`
5. `PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:pat-runtime`
6. `npm run build`
7. `npm run typecheck`
8. `npm run test`
9. `npm run test:e2e`
10. `npm run validate:db`
11. `npm run validate:launch`

Manual operator QA should then verify:

- local review sign-in for vendor, firm, individual, admin
- protected route access after local review sign-in
- production-style sign-in for vendor, firm, individual, and admin bootstrap users
- non-admin redirect away from `/admin`
- no deterministic `review.*@pat.local` identities in production-style launch validation
- production auth origin exactly `https://patalign.com`
- reverse proxy forwarding `Host`, `X-Forwarded-Host`, `X-Forwarded-Proto=https`, and `X-Forwarded-For`
- Mac mini app bound to `127.0.0.1:3000`
- public health at `https://patalign.com/api/health/db`
- firm assessment completion and insight unlock behavior
- vendor product assessment and product insight behavior
- membership page defaulting and checkout placeholder routing
- `/admin` operator routes
- `/admin/briefings` live board-ready briefing render

## Deprecated or compatibility-only paths

These paths may stay for compatibility, but they are not canonical product surfaces:

- `/survey`
- `/results`
- `/outputs`
- `/profiles`
- `lib/patDashboard.ts`
- `lib/patUnlocks.ts`
- dual-read company cookie bridging (`pat_companyId` + `aae_companyId`)
- subject/company fallback helpers used when newer subject-layer schema is missing locally

Rules for these paths:

- keep them thin
- redirect or bridge into canonical role-specific PAT routes
- do not add new product semantics to them
- do not let them compete with the firm/vendor/user/admin surfaces

## Remaining deeper work that should not block this release

- strengthen person-side assessment modules so individual/member workflows stop leaning on company-backed compatibility
- add a truthful subject-native capability and benchmark bridge before claiming richer member-native interpretation
- continue firm/vendor/admin cleanup where older overlap still survives as compatibility-only wrappers
- add deeper product-review seeded data so operator briefing product-detail routes are always populated in local demos
- connect membership checkout placeholder rows to real payment processing when commercial flow is ready

## Operational hygiene

- Canonical baseline seed: `prisma/seed.ts`
- Canonical PAT runtime seed: `scripts/seed-pat-runtime.ts`
- Safe export:
  - `scripts/export-codebase-safe.sh`
  - `scripts/export-codebase-safe.ps1`
- Secret scan:
  - `npm run secrets:scan`
- Do not export `.env*`, `.next`, `node_modules`, `logs`, `artifacts/mac-mini`, test artifacts, or temporary local files.
