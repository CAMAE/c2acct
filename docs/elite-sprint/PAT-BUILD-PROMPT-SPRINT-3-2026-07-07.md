# PAT Build Prompt — Sprint 3 (paste into a fresh Claude Code session)
### 2026-07-07 · repo ~/work/c2acct-live · branch feat/elite-sprint (continue on it; everything rides Wednesday's deploy)
### Context: recall memory + read docs/elite-sprint/*. Sprint 2 (A-E + Leslie copy pass) is committed and chain-green. Same discipline: pnpm only, flags OFF, additive migrations, single commit per block, full chain per block, CLAUDE.md output ledger.

## Block F — Vendor Sales Card v1 (the headline)

Route `app/vendor/sales-card/page.tsx`, flag `PAT_ENABLE_SALES_CARD` (default OFF).

**⚠️ Tenancy boundary — read twice.** v1 ranks ONLY firms inside the vendor's own ecosystem (data the vendor is already entitled to see in aggregate). No cross-ecosystem firm data, ever — the open-data marketplace phase is later and deliberate. Any platform-wide context appears only as anonymized aggregates that already exist on vendor surfaces (e.g., market averages). Add a leak test asserting the sales-card query can never return firms outside the vendor's ecosystem.

**Content per ranked firm (Bullet Theory: one claim, one evidence line, one action):**
- Fit rank + alignment delta between the firm's module shape and this vendor's product strengths (existing delta math; confidence band when sample-thin — AAE discipline).
- "Where you close their gap": top 1-2 firm capability gaps this vendor's products cover, with the score evidence.
- One suggested next action ("Firm is at 40% on modules 4-5 — a completed assessment sharpens this card").

**Entitlement split (mirrors the Alignment Board):**
- ELITE: firm names revealed (they're in the vendor's own ecosystem — already permissible), full detail cards (five facts max, Tinder-card pattern from the Board).
- PRO: same ranking as **"Secret Firm 1/2/3"** — shape, deltas, and gap categories visible; identity hidden; CTA "Reveal with Elite" → membership.
- e2e: elite sees names (demo-vendor needs a local ELITE variant — reuse the preview-setup pattern), pro sees Secret Firms, cross-tenant 404, leak test green.

## Block G — Nav / icon cleanup (the deferred ticket)

The portal header icons and menu Cam dislikes. Scope: replace the three ambiguous header icon buttons with labeled controls (icon + text on desktop, icon-only with aria-labels + tooltips on mobile); the hamburger menu gets a clean dropdown grouped Workspace / Membership / Help / "Return to C2Acct" / Sign out; active-state styling consistent with the pill toggles. No route changes. Screenshot before/after for Cam's verdict — he has final say on icons, so treat this as a proposal commit he can redline.

## Block H — Help corpus depth + prod seeding path

1. Expand the local `help_doc` corpus to cover: every explainer page topic, membership/billing questions, assessment how-tos (vendor + firm), the ecosystem definition, divergence/gap explanations, and "what does Pat do / not do" (consent framing). Target ~30-40 concise articles, plain language, grade-8 reading level, each with a stable slug for citations.
2. Write `scripts/patAssistant/seed-help-prod.ts` — idempotent (contentHash), safe to run against prod Neon Wednesday night after the deploy. Dry-run mode by default; `--apply` to write. Do NOT run against prod in this sprint.
3. Local smoke: 10 representative questions through /api/pat, each answering with citation or correctly falling back.

## Validation + ledger
Full chain per block; grep-sweeps for new strings; standard CLAUDE.md ledger every block; update the Wednesday checklist in the incident doc with: gated prebuilt deploy → qa-smoke expectation revert → `seed-help-prod --apply` → flag flips (assistant + pings in-app; sales-card and alignment-board flags stay Cam's call for the demo) → prod smoke.

## NOT in this sprint
Adaptive firm module tree (Sprint 4 — needs Cam's question content first) · data-aware Elite Pat (Phase C) · email pings/Resend · PWA · any prod deploy (Wednesday only).
