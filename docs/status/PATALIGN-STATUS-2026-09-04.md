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

## Gated queue
See `CLAUDE.md` → "Gated queue". First work for the successor: the V7 arc, and only on Mythos's 21a PASS.

## Known open, not blocking
- `e2e/pat-panel-history.spec.ts` and its stale siblings (`docs/e2e-known-stale.md`) fail on HEAD independent of any change; a product decision, not a selector fix. Sibling stray `waitForTimeout` at `e2e/firm-portal-toggle-visual.spec.ts:107` on the OPTIONAL-POLISH register.
- `AGENT_APPROVAL_HMAC_SECRET` added to the deploy-night rotation set (Mythos ruling 2026-09-04); the preflight specs do not yet list it.
- This Mac's Vercel CLI holds a credential since 2026-09-04 (a read-only probe triggered the device-login flow); the preflight is guarded against repeating that.
- Forge's 2026-09 ledger entries were appended at the file's tail; the file header says newest-first.
