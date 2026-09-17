Read PAT-RULES.md before any box.

# PAT (Performance Alignment Technology) — c2acct-live

## Source of truth
- Canonical audit: "~/Documents/Documents - Cameron’s Mac mini/PAT BUILD.NOW/PAT-Full-Debrief-2026-05-07-v2.md"
  (renamed colloquially as "the 5.7 audit")
- Running log: "~/Documents/Documents - Cameron’s Mac mini/PAT BUILD.NOW/PAT-5.7-Running-Log.md"
- Read both before starting work.
- Note: the directory name uses a curly apostrophe (Cameron’s, U+2019), not a
  straight one — quote the path or the shell will not find it. The old
  ~/Downloads/...-1945 export directory is gone.

## Hard rules
- Use pnpm, never npm.
- /sign-in is canonical; /login is compatibility-only.
- Never claim launch readiness unless release proof + route proof + DB proof + browser proof actually pass.
- Never fake live Stripe, legal compliance, public-live deployment, or customer usage.
- Preserve scaffold/no-live-charge copy when provider proof is absent.
- Local review auth requires PAT_ENABLE_LOCAL_REVIEW_AUTH=1 + loopback origin.

## Validation chain (run in this order)
pnpm prisma:generate
pnpm prisma:migrate:local
pnpm seed:baseline
pnpm seed:pat-runtime
pnpm lint:test
pnpm typecheck
pnpm test:unit
pnpm build
pnpm release:prelaunch
pnpm test:e2e:local-review
pnpm validate:launch
pnpm launch:proof

## Output discipline
Every reply that ships code must end with: changed files / root cause /
fix summary / validations run / pass-fail results / remaining
COMPLETE-PARTIAL-MISSING-UNVERIFIED items / rollback command.

## Pilot context
- Date: June 1, 2026
- Cohort: vendor + firm + consultant (NOT individual, NOT invitee)
- Flags off for pilot: PAT_ENABLE_INDIVIDUAL_SURFACES,
  PAT_ENABLE_INVITEE_SURFACES
- Flags ON for pilot: PAT_ENABLE_CONSULTANT_ACCESS (reversed
  2026-05-22 — consultant portal is the launch-story centerpiece)

## State at handoff — 2026-09-04 (Forge → successor)
- Branch `feature/engagement-v1`: HEAD = origin = `98081bd3`. Tree clean.
- Prod (patalign.com, Vercel + Neon) is UNTOUCHED at `0157d40` (live since
  2026-07-28). 62 commits and 6 migrations sit between prod and HEAD, all
  flag-dark. Nothing here has deployed.
- Everything below was Mythos-verified on-disk before push. Details per box are
  in the commit bodies (they carry the reasoning) and in
  `docs/status/PATALIGN-STATUS-2026-09-04.md`.

### Standing laws the successor inherits
1. **Flag-dark always.** New surfaces ship behind `PAT_ENABLE_*` flags that are
   `=== "1"` and fail closed. Flag-off must be byte-identical to today.
2. **Prod untouched** until deploy night. No prod writes, no flag flips, no
   promotion. Content reaches prod only through the deploy/import path.
3. **Typed GO gates.** Cam decides with a typed GO; Forge builds; Mythos
   verifies on-disk before any push. A GO in one box does not carry to the next.
4. **Per-box reports** carry files, tests, query/row/timing numbers where
   relevant, commit + file SHA-256 hashes, and validations actually run.
5. **Explicit NOT-CLOSED list on every report.** Silence never means closed.
6. **Behaviour-identical claims are proven, not asserted**: capture and diff the
   output/payload before and after (byte-identical serialisation), the way
   `6686f4b6` proved the ecosystem route and `5729147d` proved the survey payload.
7. **Ledger-only diffs of `PATALIGN-MEMORY/SESSION-LEDGER.md` are exempt at the
   startup gate**; they are banked as their own `ledger: bank` commits. Nothing
   else in that directory is ever committed.
8. **Nothing self-starts.** Idle is correct while gated.
9. Profile before fixing (perf): `scripts/perf/` — query shapes by FULL args,
   `--chains` attribution, row census, CPU-vs-wall, cpuprofile summary.
   Counts are exact; cumulative ms is concurrency-inflated.
10. `validate:launch` → `db:recreate` wipes the perf fixture; reseed
    `scripts/seed/perf-scale.ts --apply --depth=demo` or perf numbers lie.

### Gated queue (data — none of these self-start)
| # | Box | Gate | Spec / pointer |
|---|---|---|---|
| 1 | **V7 arc** (FIRST work) | Mythos's stalled 21a final visual verdict | Serve `:3011` with `PAT_ENABLE_NEW_FRONT_DOOR=1` and `:3000` flag-off for the verdict. On PASS build DARK: 21c (Meet PAT section −40%), 21d (sign-in redesign), trust accordion, and an Ask Pat `/ask` entry on `V7FrontDoor` (the door has no path to its own headline feature). Flag-off byte-identical assertions throughout. The flag flips exactly once, on deploy night, on Cam's typed GO — never in this arc. Port 3011 was held by another node process on 2026-09-04; check `lsof -nP -iTCP:3011` first. |
| 2 | Audit-triage box | Cam's GO | `pnpm audit --prod`: 3 critical / 24 high. Bump or WRITTEN acceptance per advisory; no silent acceptances. Preflight FAILs until then. |
| 3 | Corpus imports B2–B9 | Cam/Leslie review sign-offs | Shelves authored (see ledger); import via the flag-dark lint-gated path used for B1v3 (`90284cca`). |
| 4 | Optional-polish perf box | Idle queue only, or a surface >1s p50 | `lib/firmPat.ts getFirmProductCatalog` re-reads vendor assessments per firm (48 calls / 20 MB) + module lookups ×94 at `firmPat.ts:1158/:1162`; context-less callers in `briefs.ts`, `firmBriefs.ts`, ecosystem list card. Same `AdminBriefingContext` pattern. |
| 5 | Other module types flat-adopt | After Cam + Leslie see the firm module live (one screenshot round → GO) | `isFlatAssessmentLayout` in `lib/assessmentDisplay.ts`; extend the key predicate. |
| 6 | Open-ended multiple-choice redesign | Leslie's option-set decisions (question doc in her inbox 2026-09-04) | Not started. |
| 7 | Deploy night | Cam's date + typed GO per phase | `docs/DEPLOY-NIGHT.md`; `pnpm deploy-night:preflight` (read-only). Expected FAILs before the night: 5 un-rotated secrets, 3 tier vars absent in Vercel Production, audit. |

### Tooling added this era
- `pnpm deploy-night:preflight` (+ `--night-env=`, `--record-old-fingerprints`);
  `scripts/deploy-night/known-old-fingerprints.json` holds one-way fingerprints
  of the 2026-09-04 secrets.
- `scripts/perf/`: `profile-query-shapes.ts`, `row-census.ts`, `profile-phases.ts`,
  `route-once.ts` + `summarize-cpuprofile.mjs`, `route-datalayer.ts` (17/3 harness).
- `pnpm eval` golden set: 132/132 is the bar. `test:unit` count at handoff: 1500 / 174 files.
- Known-stale e2e specs: `docs/e2e-known-stale.md` (the validation chain does not run them).
