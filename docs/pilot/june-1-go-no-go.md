# June 1 Pilot Go/No-Go Runbook

Use this page before approving PAT for a controlled June 1 pilot. This is not public-live launch proof. It is an operator decision record that must be checked against the current repo, generated launch proof, admin launch control plane, and any public/staging evidence available on decision day.

## Source Of Truth

- Canonical repo root: `/Users/camerongarrett/work/c2acct-live`
- Package manager: `pnpm`
- Canonical sign-in route: `/sign-in`
- Compatibility-only sign-in route: `/login`
- Release proof: `artifacts/launch-proof/4.26.26-launch-proof.md`
- Repo map: `docs/active-repo-map.md`
- Build guide: `docs/CORE_BUILD_AAE.md`
- Admin proof surface: `/admin/launch`
- Pilot cohort plan: `docs/pilot/pilot-cohort-plan.md`

## Current Proof Snapshot

Update this section from generated proof before sign-off. Do not hand-edit proof artifacts to hide failures.

| Item | Current required status | Current repo truth to verify |
| --- | --- | --- |
| Release source of truth | COMPLETE and clean | Launch proof must show one branch, commit, build ID, build timestamp, canonical root, start command, auth mode, and `gitDirty: clean`. |
| Public or staging fingerprint | COMPLETE or explicit no-go exception | `PAT_PUBLIC_LIVE_URL=<url> pnpm launch:proof -- --public-live-url <url>` must prove `/`, `/sign-in`, `/vendor`, `/firm`, `/user`, `/admin`, `/api/release-fingerprint`, `/api/health/db`, and `/release` serve the expected release. Current 4.26.26 proof is `UNVERIFIED` when no URL is supplied. |
| AAE forbidden markers | COMPLETE | Public/staging root and checked source must not show forbidden AAE launch markers. Historical filenames may remain only where documented as historical. |
| Stripe payment proof | COMPLETE, PARTIAL, or UNVERIFIED explicitly | Current source has provider-backed Stripe architecture. Current runtime payment truth remains scaffold-only unless Stripe env and provider roundtrip proof exist. Fixture-only proof is `PARTIAL`, not live billing proof. |
| Official PAT.png | COMPLETE or MISSING explicitly | Current launch proof records `pat-png-brand-asset` as `COMPLETE` only when exact `public/PAT.png` hash proof exists. |
| Pilot cohort | COMPLETE for controlled pilot | `/admin/launch` must show the June 1 pilot cohort, member counts, data boundary, provisioning states, owner, and support contact. Demo records must not be counted as pilot behavior. |
| Support path | COMPLETE for controlled pilot | A named owner and support contact must exist for the cohort and be visible in `/admin/launch`. Current fixture owner is `Pilot Operations <pilot.ops@pat.local>` and support is `PAT Support <support@pat.local>` or `PAT Pilot Support <pilot.support@pat.local>`. Replace local addresses before real external pilot use. |
| Rollback path | COMPLETE | Revert the prompt/release commit, regenerate proof with `pnpm launch:proof`, and do not hand-edit proof artifacts. Use release/source-integrity guards and startup dirty-tree guard. |
| Final legal/commercial policy | COMPLETE or DEFERRED explicitly | Current policy surfaces are draft/trust-stage surfaces and do not claim final commercial terms, compliance certifications, uptime guarantees, or customer proof. |

## Go Criteria

All items below must be true for a controlled pilot go decision.

- Release proof is current, generated, internally consistent, and clean.
- Public or staging fingerprint proof is present for the exact URL that pilot users will access, or the decision is explicitly limited to local-only pilot QA with no external users.
- No forbidden AAE markers appear on the live or staging root.
- Stripe proof status is explicitly recorded as `COMPLETE`, `PARTIAL`, or `UNVERIFIED`, and checkout UI matches that truth.
- If Stripe provider roundtrip is not `COMPLETE`, checkout must retain scaffold/no-live-charge copy and no pilot user may be told a live charge will occur.
- Official `PAT.png` status is explicit in launch proof.
- June 1 pilot cohort is seeded or manually provisioned with `PILOT` data boundary and no mixed demo/production member records.
- `/admin/launch` shows pilot counts separately from deterministic demo counts.
- Support owner and support contact are assigned for every pilot cohort row.
- Rollback owner knows the exact commit to revert and the proof regeneration command.
- Legal/commercial policy status is explicit and no page claims final policy, compliance, customers, or uptime proof unless those artifacts exist.

## No-Go Conditions

Any item below blocks controlled pilot entry.

- Release tree is dirty according to the release dirty-state reader.
- `README.md`, `docs/active-repo-map.md`, `docs/CORE_BUILD_AAE.md`, or generated launch proof is missing.
- Public URL serves the wrong release fingerprint, wrong build ID, wrong commit, or missing `/api/release-fingerprint`.
- Checkout claims live charge, active provider billing, or paid conversion while Stripe provider proof is absent or only fixture-level.
- Forbidden AAE launch markers appear on the public or staging root.
- Demo data is presented as pilot data without a clear label.
- Pilot cohort rows are missing, unowned, unsupported, or mixed with `DEMO` or `PRODUCTION` data boundary members.
- Admin launch control cannot be opened by an operator.
- Release/source-integrity or startup dirty-tree guards have been removed or bypassed.
- Final legal/commercial policy is represented as complete without source proof.

## Decision Procedure

1. Pull the intended branch and confirm the root is `/Users/camerongarrett/work/c2acct-live`.
2. Run `pnpm lint:test`.
3. Run `pnpm typecheck`.
4. Run `pnpm launch:proof`.
5. If a public or staging URL exists, run `PAT_PUBLIC_LIVE_URL=<url> pnpm launch:proof -- --public-live-url <url>`.
6. Inspect `artifacts/launch-proof/4.26.26-launch-proof.md`.
7. Sign in as an admin and inspect `/admin/launch`.
8. Confirm `/sign-in` is canonical and `/login` is compatibility-only.
9. Confirm checkout copy matches Stripe proof state.
10. Record the decision below.

## Operator Sign-Off

| Check | Status | Evidence |
| --- | --- | --- |
| Current release proof clean | TODO | Commit/build from `artifacts/launch-proof/4.26.26-launch-proof.md` |
| Public/staging fingerprint proof present | TODO | Public-live artifact path or `UNVERIFIED` no-go exception |
| No AAE forbidden markers | TODO | Launch proof and public/staging surface proof |
| Stripe proof status explicit | TODO | `COMPLETE`, `PARTIAL`, or `UNVERIFIED` from launch proof |
| Checkout copy matches payment proof | TODO | Manual check or route proof |
| Official PAT.png status explicit | TODO | Launch proof brand section |
| Pilot cohort seeded/provisioned | TODO | `/admin/launch` pilot cohort table |
| Demo and pilot data separated | TODO | `/admin/launch` pilot/demo sections |
| Support path ready | TODO | Owner/support contact in cohort row |
| Rollback path documented | TODO | Commit to revert and proof regeneration command |
| Legal/commercial status explicit | TODO | Trust/legal policy status |

Decision: `GO` / `NO-GO`

Operator: `TODO`

Date/time: `TODO`

Notes: `TODO`

