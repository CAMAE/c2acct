# PAT Build Prompt — Elite Sprint (paste into Claude Code)
### 2026-07-07 · repo ~/work/c2acct-live · branch: create `feat/elite-sprint` from current HEAD
### Approved by Cam: consent, Pat top bar, ELITE gate, Alignment Board v1 + Secret teaser, ping voice (stretch)

Read CLAUDE.md and honor every hard rule: pnpm only, /sign-in canonical, no launch-readiness claims without proof, preserve scaffold/no-live-charge copy, flags default OFF. Read PATALIGN-ELITE-TIER-AND-PAT-CHAT-PROPOSAL-2026-07-07.md and PAT-CHAT-TOPBAR-MOBILE-AND-HOURS-2026-07-07.md in ~/Documents for full specs. Work block by block; single commit per block; halt and report on any contract-test surprise instead of papering over.

## Block A — Pat opt-in consent (default OFF)
Additive Prisma model `AiAssistantConsent` (userId unique, optedIn Boolean @default(false), consentVersion String?, grantedAt/revokedAt DateTime?, updatedAt). New `lib/patAssistant/consent.ts` with getConsent/setConsent (audit each change via recordOperatorAuditEvent). Gate BOTH `PatAssistantMount` (render null without consent) and `app/api/pat/route.ts` (404 without consent). Consent panel on the Meet Pat surface with exactly this checkbox copy: "Turn on Pat. I understand Pat is an AI assistant, not a person." Body copy per the proposal doc §1 (no "removes the chat" sentence; benchmarks reference the ToS/Privacy Policy). Unit tests: default-off, revoke-hides, API-404-without-consent, audit row written.

## Block B — Pat top bar (YouTube pattern)
New `app/components/pat/PatTopBar.tsx` replacing the floating launcher in all three portal shells: header grid = PAT lockup (fixed) | Pat input (flex-grow, max-w-[720px], centered) | existing menu/account icons (fixed). Focus expands a dropdown thread panel (same /api/pat pipeline, citations, contact-support fallback); Esc/click-out collapses. Mobile (<md): collapses to Pat icon, tap = full-width overlay input. Placeholder "Ask Pat…". Gated by the same flag + consent chain as Block A. Do not redesign the rest of the nav in this block — file icon/menu cleanup as a follow-up ticket with screenshots.

## Block C — ELITE entitlement gate
Introduce `requiredPlan: MEMBERSHIP_PLAN.ELITE` support end-to-end: extend resolveMembershipEntitlement call sites so ELITE-gated surfaces exist as a real code path (currently ~15 sites check PRO only; zero check ELITE). Sweep: remove every rendered trace of FREE tier from membership pages/copy/comparison tables (enum rank-0 stays, never rendered — Cam has killed FREE repeatedly; make it stick with a contract test that fails if user-facing copy contains "Free tier"/"Free plan"). Elite "Coming soon" placeholders stay until Block D lands behind them.

## Block D — Alignment Board v1 + Secret teaser (the headline)
Route: `app/firm/alignment-board/page.tsx`, flag `PAT_ENABLE_ALIGNMENT_BOARD` (default OFF). v1 scope: firm's current stack rendered as pieces (grid, not physics), each with live alignment score from existing delta math; a candidate rail; swap = deterministic recompute of projected firm alignment using existing engine helpers (no LLM); confidence band shown when sample-thin (AAE discipline — never fake precision). Piece click = detail card, five facts max: product + vendor, price band ("$—" until Stripe prices exist), score vs. this firm, top strength, top gap. **Entitlement split:** ELITE sees real names; PRO sees the same board with candidates anonymized as "Secret Product N" (and firm-side analogue "Secret Firms" on vendor surfaces later), detail card shows category + projected delta only, CTA "Reveal with Elite" → membership page. Tenancy: consultant bypass read-only as usual; firm sees only its own board; all queries tenancy-filtered FIRST. e2e: board renders for elite-entitled demo firm, PRO teaser hides names, cross-tenant 404.

## Block E (stretch) — Pat-voiced pings, in-app only
Wire existing `lib/notifications` trigger output through a `composePatPingCopy()` helper (template-based, deterministic, Pat's calm register: "Hi, it's Pat — [firm] is at [x]% on [modules]. Worth a nudge?"). In-app channel only; `PAT_PINGS_EMAIL_ENABLED` stays OFF. Cadence guard: max 3 nudges per task then escalation event (per Cam's locked decision).

## Validation (every block, in order)
pnpm prisma:generate → prisma:migrate:local → seed:baseline → seed:pat-runtime → lint:test → typecheck → test:unit → build → audit:pat → release:prelaunch → test:e2e:local-review → validate:launch.

## Output discipline (per CLAUDE.md, every block)
changed files / root cause / fix summary / validations run / pass-fail / COMPLETE-PARTIAL-MISSING-UNVERIFIED / rollback command.

## Also run first (2 minutes)
`node --import tsx scripts/audit/diagnose-pilot-logins.ts` — report per-account findings; with Cam's go, `--reset` and hand him pilot-login-reset.local.md to 1Password-and-delete.
