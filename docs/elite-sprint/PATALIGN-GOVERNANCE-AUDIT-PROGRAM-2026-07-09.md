# PAT — Governance & Audit Program
### July 9, 2026 · Built from 4-agent research (survey SaaS audit practice · B2B security/legal bar · benchmark governance · lead-engineer checklist) + rapid repo verification · This is the standing program, not a one-time fix

## PART A — Practices we adopt (the industry-validated set)

**A1. Versioned methodology, public.** One methodology page per computed metric family (alignment index, divergence, fit/headroom, benchmarks): formula, inputs, evidence grades, rounding, suppression rules — versioned with a changelog; material changes announced before effect (IOSCO/S&P model). Our AGGREGATION-METHODOLOGY.md is the seed; it becomes a rendered, public trust artifact.
**A2. Minimum-n suppression, borrowed verbatim from comp-survey safe harbor:** no benchmark cut published below **n≥5 contributors, no single contributor >25% of a cut**. (Stricter than our current thin<5 label — this *suppresses*, not just labels.)
**A3. COI wall (the benchmark-integrity crown jewel):** a rated party's self-data never influences the peer aggregate it is compared against — Gartner/G2's core rule. For PAT: **vendor self-reports must be provably excluded from any cross-firm/peer aggregate a vendor is measured against.** Needs a dedicated contract test; distinct from the demo-boundary work.
**A4. Test/demo data as first-class schema.** DONE — `dataBoundary` is exactly Qualtrics' response-type model. Research also endorses flag-don't-delete for suspect data (keeps auditability).
**A5. Quarterly governance ritual:** 1-hour methodology + controls review, named owner (Cam or CPA founder), minutes kept; error/recalculation policy written in advance (when do we restate a published score vs. correct forward). Transparency stat later ("X% of submissions excluded").
**A6. Trust posture, staged:** now → trust page (subprocessors: Vercel, Neon, Stripe, Anthropic; encryption; policies) + completed CAIQ-Lite published; when a deal demands → SOC 2 Type I (~$12-40K, 3-6mo) rolling to Type II. Inherit Vercel/Neon SOC 2 for infra controls.
**A7. Liability posture (attorney to finalize):** MSA with 12-month-fees liability cap + consequential-damages exclusion; DPA + security addendum (FTC Safeguards: firms are financial institutions and WILL flow vendor duties to us — breach notice to the firm, audit cooperation, data return/destruction); **"informational purposes, not professional advice" rendered near outputs in-product, not just ToS**; directional language everywhere ("indicates/suggests"), no accuracy warranties; anonymized-aggregate usage rights reserved in ToS (we have the clause drafted).
**A8. Data lifecycle:** retention as config per data class, soft-delete window then hard purge, deletion receipts; a real, tested right-to-delete and tenant-export path (B2B contracts will demand both).
**A9. Ops floor:** error-rate + business-anomaly alerting (not just uptime), structured logs with PII hygiene, tested backup-restore drill with written RTO/RPO, incident runbooks (we have one incident doc; formalize).

## PART B — Gaps found (research checklist × rapid repo verification, July 9)

| # | Gap | Evidence | Severity |
|---|---|---|---|
| B1 | **No right-to-delete or tenant-export path** anywhere in lib/app/scripts | grep: zero matches | HIGH (contractual + Safeguards) |
| B2 | **No error monitoring** (no Sentry/equivalent); alerting = qa-smoke only | package.json/app | HIGH (ops) |
| B3 | **No security headers** (CSP/HSTS/frame-ancestors) in next.config/vercel.json | grep: zero | MED-HIGH |
| B4 | **Webhook idempotency unverified** — no visible event-id unique/dedupe in schema or handler | grep inconclusive — VERIFY first | HIGH if absent (double-processing billing events) |
| B5 | **$transaction in only 3 files** — multi-write flows (signup wizard, provisioning, swaps) likely lack transaction boundaries | grep count | MED-HIGH |
| B6 | **Sign-in rate limiting unverified** (survey/billing covered; auth endpoints unclear) | grep | MED |
| B7 | **COI wall untested** (A3) — vendor self-report exclusion from peer aggregates has no dedicated proof | new requirement | HIGH (benchmark credibility) |
| B8 | **No in-product disclaimers** near scores/recommendations ("informational, directional, not professional advice") | UI review | HIGH (liability) |
| B9 | **Backup-restore drill never performed**; RTO/RPO undocumented | ops history | MED-HIGH |
| B10 | **Suppression below n≥5 not enforced** — we label thin cuts, industry suppresses them | current code | MED |
| B11 | Zod present but validation breadth unknown; mass-assignment risk unaudited | package.json | VERIFY |
| B12 | Log PII hygiene + log drain unaudited | — | VERIFY |
| ✓ | No middleware-only auth (checks live in session/DAL) — avoids the CVE-2025-29927 class | no middleware.ts | GOOD |
| ✓ | No NEXT_PUBLIC secret leakage found; onDelete coverage broad (80); pooled Neon + pgbouncer already in use | greps | GOOD |

## PART C — Claude Code implementation prompt (paste when un-halting into this program)

> Read docs/elite-sprint/PATALIGN-GOVERNANCE-AUDIT-PROGRAM-2026-07-09.md. Execute in three phases, full chain + ledger each, no feature work until done:
> **Phase 1 — VERIFY & FIX the engineering gaps (B-table):** (1) verify webhook idempotency — if absent, add event-id unique + dedupe-before-process; (2) audit every multi-write flow for transaction boundaries, wrap where missing; (3) security headers via next.config (CSP report-only first, HSTS, frame-ancestors); (4) sign-in + password-reset rate limits if absent; (5) zod validation + no-client-object-spread audit on every server action/route (mass assignment); (6) log PII audit (no emails/tokens/bodies in logs) + structured request/tenant IDs. Produce evidence per item (file:line before/after).
> **Phase 2 — GOVERNANCE MECHANICS:** (1) COI-wall contract test: vendor self-report rows provably excluded from every peer/cross-firm aggregate that scores that vendor (distinct from dataBoundary tests); (2) n≥5 + >25%-dominance suppression in benchmark cuts (suppress, don't just label; "insufficient peer data" state); (3) retention config + soft-delete window + deletion receipts scaffolding; (4) right-to-delete + tenant-export: implement `scripts/ops/delete-tenant.ts` and `export-tenant.ts` (cascade map from schema, blob/Stripe/log touchpoints listed, dry-run default) + e2e; (5) render the methodology page from AGGREGATION-METHODOLOGY.md at /methodology (public, versioned, changelog).
> **Phase 3 — LIABILITY SURFACE:** (1) in-product disclaimer component ("Directional, informational — not professional advice; see methodology") mounted near every score/recommendation/benchmark render; (2) trust-page content update (subprocessors, practices, link to methodology); (3) draft security-addendum + DPA skeletons into docs/legal/ for attorney review — DRAFTS ONLY, clearly watermarked.
> Then: fresh-eyes audit sweep using Part A/B as charter — find problems NOT already listed, lead-engineer perspective, severity + file:line, report before fixing.

## Standing rhythm after launch
Quarterly: governance ritual (A5) + access review + restore drill. Monthly: dependency audit + error-budget review. Per metric change: methodology version bump + changelog. Annually: revisit SOC 2 stage, CAIQ refresh, threat-model hour.
