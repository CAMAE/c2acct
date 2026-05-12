# E2E parallelism

How `test:e2e:local-review` reached its current runtime envelope. Reflects Day-19's AUDIT-D18-002 closure (standalone webServer) and Day-20's AUDIT-D19-001 closure (per-run consultant identity).

## Current state

`package.json`'s `test:e2e:local-review` runs at `workers=2` locally (Playwright config-level cap), `workers=1` on CI (via the `${CI:+--workers=1}` shell expansion). Headline measurements:

- **Runtime: ~27-29s** at workers=2 (down from ~3m at the Day-18 baseline). 6× speedup overall.
- **Runtime: ~40s** at workers=1 (CI path), still 4-5× faster than the dev-server baseline thanks to the standalone build.
- **15 passed / 1 skipped** across 3 consecutive sequential runs at workers=2 (verified Day-20 Block 3).
- Default Playwright parallelism would be `Math.ceil(os.cpus().length / 2)` — on a 10-CPU Mini that's 5 workers. AUDIT-D20-001 tracks raising the cap above 2 once a higher-order race surfaces a diagnosis. workers=2 is the empirically-safe upper bound today.

## How parallelism was unblocked Day 20 (AUDIT-D19-001)

**Cam's pick: Option A with localReview allowlist tweak.** Option B (Playwright project serial coordination) would have left the cross-file shared-identity smell in place; Option A removes the shared state.

Two coordinated changes:

### 1. Pattern match in `lib/auth/localReview.ts`

`findLocalReviewUserByEmail` previously did an exact-string lookup against the hardcoded `LOCAL_REVIEW_USERS` array. Day-20 added a narrow pattern after the exact-match check:

```ts
const LOCAL_REVIEW_CONSULTANT_ADMINCREATE_PATTERN =
  /^review\.consultant\+admincreate-[a-z0-9.-]{1,64}@pat\.local$/;
```

If a normalized email matches the pattern, the matcher returns a synthesized consultant entry with the timestamped email substituted in. The credentials provider treats it like any other local-review user.

The suffix is bounded (`[a-z0-9.-]{1,64}`) so this isn't a general escape hatch. The `+admincreate-` prefix is the only suffix that triggers the synthesis; canonical demo-bench consultants (`+sentinel`, `+bridgepath`) stay on their existing pilot-password-hash path in `auth.config.ts` and are NOT reclassified.

Locked in by `tests/local-review-pattern.test.ts` (14 unit tests covering exact-match preservation, admincreate acceptance, case normalization, length cap, character-class boundaries, and non-reclassification of canonical consultant suffixes).

### 2. Per-run unique identity in `e2e/local-review-auth.spec.ts:382`

The admin-create-and-assignment test now generates:

```ts
const adminCreatedConsultantEmail = `review.consultant+admincreate-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}@pat.local`;
```

Every reference inside this test that previously hit `review.consultant@pat.local` moved to `adminCreatedConsultantEmail`. The `signInAsRole` helper grew an optional `overrideEmail` parameter so the consultant-side sign-in (still on the local-review credentials path) accepts the timestamped identity.

`scripts/test-cleanup-e2e-fixtures.ts` extended: between BriefEditChoice sweep and Company sweep, `prisma.user.deleteMany` removes rows whose email starts with `review.consultant+admincreate-`. Cascade chain handles ConsultantProfile + ConsultantAssignment via the FK relationships.

### 3. Workers cap in `playwright.config.ts`

`workers: process.env.CI ? 1 : 2`. The Day-20 verification proved 3 sequential runs at workers=2 all 15/1. workers=5 (Playwright default on a 10-CPU host) still flakes — there's a higher-order race that's likely Prisma connection-pool saturation under heavy parallel admin operations. Filed AUDIT-D20-001 for raising the cap once that race is diagnosed; the marginal speed-up from workers=2 → workers=5 is modest (~5 seconds), so the cap is non-urgent.

## How the wrapper script handles env vars

`scripts/e2e/run-playwright-standalone.sh` does what `next dev` did automatically when the e2e suite ran in dev mode:

1. **Verify the build.** If `.next/standalone/server.js` is missing, runs `pnpm build`.
2. **Capture PLAYWRIGHT_PORT BEFORE sourcing `.env.local`.** The project's `.env.local` carries `PORT=3000` for the standalone:local proof path; if sourced after the capture, it would clobber the Playwright-requested port. The wrapper captures into a local var first, then re-exports after sourcing.
3. **Source `.env.local`** for DATABASE_URL and the rest of the dev-vars.
4. **Strip `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`** after the source. The standalone server in NODE_ENV=production enables the GitHub provider button on /sign-in when those creds are set; `e2e/release-integrity.spec.ts:43` asserts the button is NOT visible. The dev server hid it automatically; standalone doesn't, so the wrapper strips them explicitly.
5. **Force `HOSTNAME=127.0.0.1`.** macOS bash sets HOSTNAME to the system hostname ("Camerons-Mini" etc.) by default, which Next.js would bind to the non-loopback interface. Explicit `127.0.0.1` keeps the binding loopback-only.
6. **Set `NODE_ENV=production`** so Auth.js + Next.js apply production semantics.
7. **Apply default fallbacks** for AUTH_URL, NEXTAUTH_URL, AUTH_SECRET, PAT_ENABLE_LOCAL_REVIEW_AUTH, PAT_LOCAL_REVIEW_PASSWORD. Explicit env from the `test:e2e:*` command wins.

Adding a new env var to the e2e environment: add the `KEY=value` prefix to the relevant `test:e2e:*` script in `package.json`. If it needs a default for ad-hoc invocations, add a `export KEY="${KEY:-default}"` line to the wrapper script after the .env.local source.

## Lessons learned

- **The Day-14 `--workers=1` pin survived to Day 20 across three diagnostic Day-Ns.** Each one isolated a different layer:
  - Day 14: filing — symptom-level diagnosis.
  - Day 18: ruled out fixture leak as the primary cause; surfaced `next dev --webpack` JIT as the root.
  - Day 19: architectural fix (standalone webServer); discovered the JIT was actually a co-factor with the cross-file consultant-identity race.
  - Day 20: closed the race; lifted the pin.
- **Prompt prediction vs reality.** The Day-19 prompt expected the pin to lift after fixing fixture leak. It didn't — the race surfaced. The Day-20 prompt expected the race-fix to lift the pin entirely; it lifted it most of the way (workers=2 safe, workers=5 still flakes). Each Day-N's discipline ("Don't paper over with retries") kept the chain honest.
- **Pattern-match escape hatches need bounds.** The localReview allowlist tweak is a 2-line regex with a 64-char suffix cap and a `+admincreate-` prefix lock. It's the smallest possible widening of the allowlist semantic. A future contributor adding another pattern should keep the same discipline: narrow prefix, bounded length, locked-down character class.
- **Architectural switches need env audits.** Day-19 surfaced two env bugs (PORT clobber, GitHub creds bleed) when switching webServers. Day-20 didn't surface any new env bugs because the architectural surface didn't change — only test logic and a small auth allowlist tweak. Pattern: budget for env diagnosis on infra switches, not on test refactors.

## Validate-launch path

The Day-19 `PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1` env gate (see `scripts/validate-launch.ts`) skips the three mac-mini tail steps on dev workstations:
- `scripts/mac-mini/restart-app.sh` (requires launchctl target)
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/port-owner-proof.sh`

On dev workstations, set `PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1` in `.env.local` or inline; the chain reaches the `validate-launch` step's COMPLETE write and the bucket map shows `local-validation-chain` as COMPLETE. Mac-mini hosts leave the env var unset and run the full chain unchanged.
