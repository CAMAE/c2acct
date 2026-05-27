# PAT Slice A Landing Audit (2026-04-02)

## Decision

Slice A is explicitly deferred prelaunch.

It should **not** be landed before launch on the current rollback recovery branch.

## Why deferral is the lower-risk choice

The current launch contract is already:

- canonical sign-in at `/sign-in`
- `/login` compatibility-only
- production auth mode `github`
- development-only local-review auth behind `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`

The mixed-copy Slice A material is not a narrow hardening patch. It would introduce all of the following at once:

- `passwordHash` schema expansion on `User`
- a new credentials-auth path beyond the current local-review-only credentials provider
- explicit bootstrap-user env and seed behavior
- additional bootstrap password and email env contract
- invitee and sign-in behavior changes tied to that broader credentials path

That is a real auth-contract change, not a no-risk cleanup.

## Current branch evidence

Current rollback branch already has the launch-safe pieces of Slice A that matter today:

- `auth.config.ts` keeps `/sign-in` canonical
- `auth.ts` requires a provisioned user or explicit local-review request
- `lib/auth/localReview.ts` gates deterministic review users behind non-production local-review flow
- `prisma/seed.ts` and `scripts/seed-pat-runtime.ts` seed local-review users only through the existing deterministic review path

This means there is no missing prelaunch safety gap that requires a credentials-first or bootstrap-user restore to make launch safer.

## Mixed-copy Slice A changes that would raise prelaunch risk

Reviewed from `/private/tmp/c2acct-main-auth`:

- `lib/auth/credentials.ts`
- `lib/auth/passwords.ts`
- `lib/auth/signInActions.ts`
- `lib/auth/localReview.ts`
- `lib/auth/env.ts`
- `prisma/migrations/20260401133000_add_user_password_hash/migration.sql`
- `prisma/seed.ts`
- `scripts/seed-bootstrap-users.ts`
- sign-in route files under `app/sign-in/**`

Risk introduced by landing these now:

1. `passwordHash` migration would change the live schema immediately before launch.
2. Bootstrap-user envs such as `PAT_BOOTSTRAP_*` and `PAT_BOOTSTRAP_DEFAULT_PASSWORD` would expand the runtime/seed contract during launch hardening.
3. Credentials auth would become a broader live concern instead of the current isolated local-review path.
4. Sign-in and invitee flows from the mixed tree would need separate PAT-surface proof.
5. None of those changes are required to preserve the recovered PAT baseline or the current clean launch path.

## Explicit prelaunch outcome

Prelaunch recommendation for Slice A:

- do not land password hashing before launch
- do not land bootstrap-user seeding before launch
- do not broaden credentials auth before launch
- do not import mixed-copy sign-in or invitee files before launch

Keep the current launch mode:

- production: `github`
- non-production QA: local-review credentials only

## What can be reconsidered after clean launch

Post-launch Slice A review can safely evaluate:

- `passwordHash` support
- explicit bootstrap-user seeding
- cleanup guidance for deterministic local-review users
- invitee-path reduction or removal

But that review should be treated as an auth-contract program with its own migration, seed, runtime, and PAT-surface validation.

## Validation

The baseline remained unchanged for this decision. Validation should therefore stay focused on the current auth and seed contract:

- `npm run test:unit -- tests/auth-env.contract.test.ts tests/local-review-auth.contract.test.ts`
- optional local-review e2e validation in non-production mode

## Conclusion

Landing Slice A before launch would increase the number of moving parts in auth, seed, and schema with no clear launch-confidence gain over the current rollback recovery branch.

The correct prelaunch decision is:

- Slice A deferred with proof
