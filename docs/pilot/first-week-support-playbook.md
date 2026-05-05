# First-Week Pilot Support Playbook

Use this playbook during the first controlled PAT pilot week. The goal is boring operations: check the same surfaces every day, keep evidence attached, escalate by failure type, and avoid inventing product, billing, legal, or public-live proof that does not exist.

## Operator Surfaces

- Admin launch control: `/admin/launch`
- Public build proof: `/release`
- Release fingerprint API: `/api/release-fingerprint`
- DB health API: `/api/health/db`
- Runtime status command: `pnpm ops:mac-mini:status`
- Runtime health command: `pnpm ops:mac-mini:health`
- Nightly verification command: `pnpm ops:mac-mini:verify`
- Launch proof command: `pnpm launch:proof`
- Full launch validation command: `pnpm validate:launch`
- Incident template: `docs/pilot/pilot-incident-template.md`
- Release integrity incident template: `docs/incidents/PAT_release_integrity_incident_template.md`

## Daily Check Cadence

Run these checks once at pilot-day start and again after any code, seed, billing, auth, or runtime change.

| Check | Where to look | Healthy result | Escalate when |
| --- | --- | --- | --- |
| Admin launch control plane | `/admin/launch` | Summary cards load; pilot and demo counts are separated; release identity is visible. | Page errors, query error banner, missing pilot table, or demo/pilot boundary confusion. |
| Release fingerprint | `/release`, `/api/release-fingerprint`, `pnpm ops:mac-mini:status` | Branch, commit, build ID, build timestamp, auth mode, start command, and git dirty state agree with generated proof. | Any mismatch, unknown build ID, dirty state, wrong branch, or stale expected/last-known-good release. |
| Health route | `/api/health/db`, `pnpm ops:mac-mini:health` | HTTP 200 and DB health body is readable. | Non-200 response, timeout, missing DB body, or repeated intermittent failure. |
| Failed webhooks | `/admin/launch` failed webhook table | No failed webhook events, or failures have an owner and incident link. | Any new failed Stripe webhook, unreconciled provider subscription, or payment status mismatch. |
| Signup and onboarding friction | `/`, `/sign-in`, `/onboarding`, `/onboarding/[audience]` | Pilot users can identify their role, sign in through `/sign-in`, and reach a first assessment path. | Users cannot sign in, `/login` is treated as canonical, role paths dead-end, or checkout copy overclaims live billing. |
| Assessment completion | `/admin/launch`, role dashboards | Vendor product, firm alignment, and firm product completion move forward without blocked submissions. | Completion stalls, final submission fails, autosave confusion repeats, or product creation is mistaken for assessment completion. |
| Insight empty-state rate | `/admin/launch`, `/firm/insights`, `/vendor/product-insight`, `/vendor/alignment-insights` | Empty states explain missing evidence and do not overclaim. | Users see unsupported insight claims, locked Elite content appears live, or empty states fail to explain next action. |
| Support tickets | Support inbox or tracker used by the pilot team | Tickets have category, owner, severity, next action, and evidence link. | No owner, repeated duplicate tickets, unresolved P1/P0, or product copy creates billing/legal confusion. |

## Exact Operator Commands

Run from `/Users/camerongarrett/work/c2acct-live`.

```bash
pnpm ops:mac-mini:status
pnpm ops:mac-mini:health
pnpm ops:mac-mini:verify
pnpm launch:proof
pnpm validate:launch
```

Use `pnpm ops:mac-mini:status` first when the symptom is unclear. It summarizes repo root, branch, commit, dirty state, launchd ownership, health, build ID, release fingerprint fields, and port-owner proof.

Use `pnpm ops:mac-mini:health` when the app is reachable but DB or health behavior is suspect.

Use `pnpm ops:mac-mini:verify` for nightly or post-change runtime proof. It writes a dated report under the Mac mini artifact directory and promotes last-known-good release only when the verification chain passes.

Use `pnpm launch:proof` for a machine-readable and human-readable proof bundle. If a public or staging URL exists, use the public-live URL variant documented in `docs/pilot/june-1-go-no-go.md`.

Use `pnpm validate:launch` when the pilot decision depends on the full repo/runtime/browser validation path.

## Escalation Matrix

| Issue type | First owner | First evidence to attach | Immediate action |
| --- | --- | --- | --- |
| Billing issue | Operator plus billing implementer | `/admin/launch` billing cards, failed webhook row, checkout route, Stripe proof status from launch proof. | Keep scaffold/no-live-charge copy unless Stripe proof is complete. Do not grant entitlement from client params. |
| Auth issue | Operator plus auth implementer | `/sign-in` path, session user, local review policy, affected email, role, company ID. | Preserve `/sign-in` as canonical; verify local review auth is loopback-only; do not enable public credentials auth. |
| Vendor assessment issue | Vendor workflow owner | Product ID, assessment route, mode, current step, submission status, browser console or server error. | Confirm product creation is not being counted as final assessment completion; check completed/existing/add-new/help mode. |
| Firm assessment issue | Firm workflow owner | Module key, step, autosave state, final submit status, current progress summary. | Confirm canonical five-module flow, valid step normalization, autosave clarity, and final submission evidence. |
| Insight overclaim issue | Product/content owner | Insight route, mode or surface, completed evidence, screenshot or copy excerpt. | Treat as P0 if PAT claims benchmark, projection, recommendation, customer, public-live, or Elite content without proof. |
| Runtime or deployment issue | Operator | `pnpm ops:mac-mini:status`, `pnpm ops:mac-mini:health`, launch proof, port-owner proof, app logs. | If release identity is wrong, dirty, stale, or served from wrong root, use the release integrity incident template and prepare rollback. |

## Severity Guide

- `P0`: Wrong release served, public/staging fingerprint mismatch, dirty release tree, AAE markers on live root, live charge claim without Stripe proof, unsupported insight overclaim, or auth boundary breach.
- `P1`: Pilot user blocked from sign-in, assessment submission, support path, or required role dashboard.
- `P2`: Confusing copy, slow workflow, non-critical empty state issue, or isolated support question with workaround.
- `P3`: Cosmetic issue that does not affect pilot decision, billing truth, data boundary, or assessment completion.

## Daily Log Template

Record one entry per pilot day.

```text
Date:
Operator:
Release ID:
Branch:
Commit:
Build ID:
Git dirty:
Admin launch control:
Release fingerprint:
Health route:
Failed webhooks:
Signup/onboarding friction:
Assessment completion:
Insight empty-state rate:
Support tickets:
Incidents opened:
Decision for next day:
```

## Hard Rules

- Do not claim public-live proof without a URL, fingerprint payload, response codes, and generated artifact.
- Do not claim live billing without Stripe provider roundtrip proof.
- Do not remove release/source-integrity or startup dirty-tree guards.
- Do not present demo data as pilot behavior.
- Do not treat `/login` as canonical.
- Do not hand-edit proof artifacts to hide failures.

