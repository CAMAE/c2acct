# PATALIGN status — 2026-09-04 (Forge handoff snapshot)

**Branch** `feature/engagement-v1` · **HEAD = origin** `98081bd3` · **Prod** `0157d40` untouched (Vercel + Neon, live since 2026-07-28) · **Distance** 62 commits, 6 migrations, all flag-dark.

Supersedes `PATALIGN-STATUS-2026-06-02.md`. Every item below was Mythos-verified on-disk before push; the commit bodies carry the reasoning.

## Shipped dark this era (2026-08-20 → 2026-09-04)

| Area | Commits | State |
|---|---|---|
| Agent substrate hardening | `21b9c118` | async approval pause/resume, real cost, deny-by-default |
| Eval harness | `e61b933f`, `f1d87f1c` | 100 deterministic + 25 retrieval goldens; **132/132** is the bar |
| Perf fixture | `11bb5b90`, `c015e79f` | 47-firm scale seed with `--depth=demo` (37 products, 1,739 reviews) |
| Adaptive modules Blocks A/B, registry v3, qbank preflight | `d66cebc7`, `9d707cd3`, `42332123` | behind `PAT_ENABLE_ADAPTIVE_MODULES` |
| Vertical packs PF-1/PF-2 | `ab810558`, `cd8ef439` | resolver + flag, cohort isolation invariant |
| Corpus infra + B1v3 shelf | `258d0e89`, `8beb6a28`, `90284cca`, `0215d2c8` | depthTier + public walls, decline log, import lint, H2 chunking; B1v3 indexed dark |
| Answer ladder | `e3d5aff7` (rungs 1+4), `d05961f3` (rung 3 web tier) | `PAT_ENABLE_PAT_LADDER`, `PAT_ENABLE_PAT_WEB_TIER`; caps `PAT_WEB_TIER_DAILY_CAP_USD` default 2 |
| Public tier + `/ask` | `0731c905`, `0156f2d4`, `5ad777d6` | `PAT_ENABLE_PUBLIC_TIER`; salt required (`PAT_PUBLIC_IP_HASH_SALT`), rungs 1+4 only |
| Ask Pat markdown | `57bdeba2` | XSS-safe rendering |
| Close-the-shorts | `fcc3fbe9` | sign-in email remembered locally (never the password); admin-nav role guard pinned |
| **Perf arc (BOX 4) — CLOSED** | `92c4be90`, `d2f2f193`, `647d7163`, `6686f4b6` | ecosystem route p50 **8.9s → 0.67s** at 47 firms / demo depth; 29,865 → 1,380 prisma ops; 514 MB → 26 MB decoded; byte-identical output proof |
| Deploy-night readiness | `85a80b64`, `98081bd3` | `docs/DEPLOY-NIGHT.md` runbook; `pnpm deploy-night:preflight` read-only PASS/FAIL table |
| Assessment UX (Leslie) | `5729147d`, `8fabe6eb` | firm modules on one page, no pagination/help/section labels/"Required", title once; payload byte-identical; help-text seed copy without "required" (reaches prod via ensure path on deploy) |

## Validation state at handoff
`pnpm validate:launch` green on 2026-09-04 (Mac-mini steps skipped). `test:unit` 1500/1500 (174 files). `eval` 132/132. `lint:repo`, `tsc` clean. `secrets:scan` clean.

## Deploy-night preflight, current (expected partly FAIL)
9 PASS · 10 FAIL · 2 WARN · 6 SKIP. FAILs: the five un-rotated secrets (by design — they are the pre-rotation values whose fingerprints are recorded), `PAT_PUBLIC_IP_HASH_SALT` / `PAT_WEB_TIER_DAILY_CAP_USD` / `PAT_PUBLIC_DAILY_CAP_USD` absent in Vercel Production, audit 3 critical / 24 high. Vercel Production presence read 2026-09-04: tier flags LADDER / WEB_TIER / PUBLIC_TIER absent (off); ASSISTANT, PINGS, BATTLECARD, CONSULTANT_ACCESS, ALIGNMENT_BOARD, SELF_SIGNUP present.

## Handoff — laws, queue, tooling
The repo-root `CLAUDE.md` is git-ignored (local project memory on the Mac mini); this section is the tracked copy of its handoff content.

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


## Known open, not blocking
- `e2e/pat-panel-history.spec.ts` and its stale siblings (`docs/e2e-known-stale.md`) fail on HEAD independent of any change; a product decision, not a selector fix. Sibling stray `waitForTimeout` at `e2e/firm-portal-toggle-visual.spec.ts:107` on the OPTIONAL-POLISH register.
- `AGENT_APPROVAL_HMAC_SECRET` added to the deploy-night rotation set (Mythos ruling 2026-09-04); the preflight specs do not yet list it.
- This Mac's Vercel CLI holds a credential since 2026-09-04 (a read-only probe triggered the device-login flow); the preflight is guarded against repeating that.
- Forge's 2026-09 ledger entries were appended at the file's tail; the file header says newest-first.
