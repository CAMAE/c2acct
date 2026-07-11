# Patalign Live Audit — Session 1 (Admin + first-look) · July 7, 2026
### Production, release 706a7d0 (feat/agent-system-phase-0), all findings from authenticated browsing

## How sessions actually behave (important for your review workflow)
One browser profile = one session. When you signed into all four accounts sequentially, each later login replaced the earlier cookie — the four tabs *looked* signed in per-role only because they were showing stale pre-rendered pages. Current live session: **demo-admin-2**. To audit each role I need you to sign in per role, one at a time (or we use separate Chrome profiles). Admin pass is done; vendor is next when you flip the session.

## 🔴 Bugs / data defects found so far

1. **Firm product coverage tile: "734/100 (734%)"** (Launch control plane → Assessment and insight coverage). Numerator is firm product reviews, denominator looks like it's using products×firms wrong (or a hardcoded 100). A >100% coverage stat in front of a client kills the "measurement" story — top fix.
2. **FREE tier still renders in production.** Vendor gate pages show "Current plan: Free"; the Launch membership table has a FREE column; gate copy references the "baseline state." You've killed FREE repeatedly in design — it survives in copy/UI. (Matches the code finding: enum FREE rank-0 still leaks into surfaces.)
3. **Consultant ecosystem card inconsistency** (from the pre-session render): "Demo Vendor Inc · 7 firms" subtitle vs "4 of 4 firms Building" band and "51% modules · 7 actions." 7 firms vs 4-of-4 needs one truth. Verify when consultant session is live.
4. **Vendor workspace count mismatch** (pre-session render): "Products: 4" in vendor context vs 3 products in "Products at a glance." If glance is intentionally top-3, label it; if not, the 4th product is being dropped.
5. **Admin does not bypass vendor/firm surfaces** — as demo-admin-2, /vendor/product-assessment|product-insight|alignment-insights all show the Pro-membership gate (admin's own "plan" resolves to Free). Consultant gets a bypass; admin doesn't. Decide: intended? For your "run it all from one login" vision, admin probably should bypass read-only like consultants do.

## 🔴 Session 2 (vendor, on release 078a41f) — new findings

6. **P1 — Assessment answers do not persist until final submit.** Verified with network capture on prod: answering scored questions and clicking "Continue to next page" fires ZERO server requests (only footer prefetches). Reload = all in-progress scored answers lost (page position too). The seeded "10 of 80" survives only because it was a prior submitted/seeded row. The March design's `/api/survey/draft` autosave either never shipped on this surface or regressed. Fix: wire draft persistence on page-continue at minimum (ideally debounced per-answer), and resume at the saved page. Must land before real firms/vendors take 80-question assessments.
7. **UX — slider click jumps to max.** Clicking anywhere on a score slider track sets 5 (highest confidence) instead of the clicked value; keyboard works correctly. Misclicks silently record max scores — data-integrity adjacent, fix with the draft-save work.
8. **Transient 503** on a `/security` RSC prefetch mid-session (single occurrence, remote-build deployment). Watch, don't act.

**Session 2 verified good:** vendor glance count fix live ("3 of 4 products have a completed self-assessment…" + context explains 4th) · card-select feature declaration renders cleanly (14 areas, selected states clear) · "Not answered" slider states correct (zero-is-valid discipline holding) · page pacing (10-question pages, 8 pages, progress %) · no Pat bar/consent surfaces leaking (flags dark) · footer session/release correct.

## 🟡 Session 3 (firm, on 078a41f) — findings

9. **Elite toggle stacks instead of swaps** (Cam's find, reproduced on /firm/insights/firm_tier1_operating_baseline?surface=elite): the Elite surface keeps the full Pro readout (Current readout, Current limits, "What this means for your firm") and appends the locked Elite cards below. Fix: on surface=elite render the locked Elite framing alone with a small "view Pro readout" pointer back. UI-only.
10. **Tier-blind membership CTA:** firm membership for an ELITE account renders the Pro card button as "Upgrade to Pro." Needs tier-aware label ("Switch to Pro" / hide) — demo-visible logic slip.
11. **404 page is unstyled dark theme** — off-brand vs. the light design system; add a branded light 404 with a back-to-workspace link.
12. **Radar axis labels truncate** on the firm insights operating picture ("Strategy, Change…", "Governance, Cont…") — exactly the Leslie-persona readability gap; abbreviate deliberately or wrap.

**Session 3 verified good:** firm workspace (Demo Firm LLP, 3/5 modules, product-review-loop status chip) · insights index (alignment index 73, radar, 4 Pro insight cards, no overflow) · insight detail Pro view (readout, limits, module/capability evidence, plain-language "what this means" — strong page) · locked-Elite honesty copy · membership Elite-as-current renders both tiers, FREE absent · Meet PAT/Help panels · Elite firm account confirms the 31-Elite data path works end to end.

## 🟡 Session 4 (consultant, on 078a41f) — findings

13. **Units mislabel: "3 products evaluated by 15 firms"** on the ecosystem Coverage tile — a 7-firm ecosystem. The 15 is firm *reviews* (5+6+4 per the product comparison), not firms. Label should read "15 firm reviews."
14. **Units mislabel: "13 products show a material gap"** in the vendor-brief executive summary — the vendor has 3 products; 13 is product-firm divergence *pairs* (the hot-divergences count). Same class as #13: counts rendered with the wrong noun.
15. **Radar label truncation confirmed on the consultant positioning radar too** ("Demo Bookkeepin…", "Demo Advisory S…") — proves #12 lives in the shared radar component, not one page.
16. Micro: stray double separator ("4 emerging · · scoring methodology") in the exec-summary footnote.
17. (Expected, not a bug:) consultant firm-count fix + Leslie copy pass are committed but NOT in the deployed build — re-verify both after Wednesday's deploy.

**Session 4 verified good:** ecosystem dashboard (5 stat tiles, firm briefings ranked needs-attention-first with semantic colors, coverage map, engagement task list) · vendor brief all 8 panels navigable · positioning radar two-polygon overlay + per-product delta list · product comparison scorecard + 7×3 per-firm coverage matrix with not-yet-reviewed states · tenancy (consultant sees only its assigned ecosystem) · no Pat/board surfaces leaking.

## 🧩 SHARED-COMPONENT BUG REGISTER (Cam's requirement: no spot fixes — component-level fixes with sibling verification)

| # | Bug | Shared component? | Fix scope + proof required |
|---|---|---|---|
| 734% tile | coverage denominators | YES — launch page has 3 coverage tiles from the same stat helpers | verify ALL three tiles' denominators + unit test each |
| glance 4-vs-3 / consultant 7-vs-4 / "15 firms" / "13 products" | count-scope + unit labels | YES — same defect CLASS: counts surfaced with wrong scope or noun | audit every stat tile/subtitle sitewide: each count must name its true unit (firms, reviews, pairs, products); grep-sweep + one contract test per surface |
| P1 draft persistence | survey runner | YES — vendor product assessment + firm alignment assessment (+ future user module) share the runner | fix at runner level; e2e reload-persistence on BOTH surfaces |
| slider max-click | score slider | YES — every 0-5 scored question sitewide | fix component; verify vendor + firm flows |
| Elite stacking | insight-detail template | YES — all firm keys + vendor alignment-insight details | component fix + loop-all-keys e2e (both portals) |
| tier-blind "Upgrade to Pro" | membership page component | YES — vendor/firm/user audiences × plan states | tier-aware CTA in component; verify 3 audiences × PRO-current and ELITE-current |
| radar label truncation | radar/SVG label logic | YES — firm insights radar + consultant positioning radar (+ FiveModuleRadar mounts) | shared label strategy (short canonical names or wrap); verify all radar mounts |
| dark 404 | global not-found | Single global file — one fix is complete by nature | style + back-link |
| FREE leakage | membership copy | FIXED at source with contract test (the model to copy) | — |
| FTS column | schema | FIXED globally by migration | — |

## 🟢 Verified healthy (admin portal)

- **Agents:** 4/4 healthy (cloudflare-watcher 12 runs/24h, qa-smoke 24 runs/24h COMPLETED, pilot-ops daily, internal-knowledge manual; hello-world disabled by design). Live action stream connects and streams real events. Command bar + approvals queue render (0 pending).
- **Admin nav:** the pill tabs are real routes (/admin/approvals, /admin/launch, /admin/runtime, /admin/reports…) and all render. (Query-param style ?panel= does nothing on /admin — pills only. Fine, just unintuitive.)
- **Launch control plane:** vendors 18 / firms 72 / users 440 / products 60; pilot cohort june-1: 7/7 (100%) PILOT boundary, Ready, support assigned; vendor product coverage 59/60 (98%); firm alignment coverage 321/360 (89%).
- **Membership distribution:** 55 PRO + 31 ELITE active = 86; zero pending/past-due/canceled. **Billing reconciliation: 0 billing customers / 86 provider subscriptions / 0 failed webhooks** — consistent with billing-off state (subscriptions seeded without provider customers). No failed webhook events.
- **Local review auth: Disabled in production** ✅ (5/5 review users seeded, policy-only display). Release identity panel agrees with the health endpoint (706a7d0, gitDirty clean).
- **Runtime:** portal visibility controls render (didn't touch Save); canonical diagnostics list the five modules with live counts (Automation & AI Readiness 25q/70 submissions; Integration & Data Flow 70; Governance/Vendor Risk 65; Operating Model 61…).
- **Reports catalog:** platform ecosystem summary print view, per-vendor product summaries (16 vendors listed), firm briefing pack — your "pull any report immediately" ask is partially live already.

## Watch items (not bugs, decisions)
- 31 ELITE memberships are active in data while nothing in code gates ELITE — harmless until Elite features exist, then instantly meaningful. The Elite sprint fixes this.
- Admin "Financials" grouping from the March design (C2Core Overview/Operations/Runtime/Financials/Help) has evolved into Agents/…/Launch/Runtime — billing visibility now lives inside Launch. Fine, but your quarterly-reports vision wants a dedicated Financials tab post-Stripe.

## Next session passes (need you to switch login)
1. **demo-vendor** → all 4 products, full assessment flow (save draft → verify DB via a check script), insight pages incl. divergence bars, membership/checkout scaffold, text-overflow sweep.
2. **demo-firm** → 5 modules (one in-progress), product assessments, insights radar, admin/user management.
3. **demo-consultant** → ecosystem detail, all 8 vendor-brief panels, firm briefs, explainer drilldowns, the 7-vs-4 firm count.
4. DB write-verification: after I drive a draft save in-browser, run `pnpm` script checks on the Mac to confirm rows landed (I'll prep the queries).
