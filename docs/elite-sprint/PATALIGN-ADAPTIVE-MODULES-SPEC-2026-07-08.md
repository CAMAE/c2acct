# Patalign — Adaptive Firm Modules: Content & Engine Spec
### July 8, 2026 · Cam's requirements locked + design calls made · Sprint 4/5 build target

## Locked requirements (Cam)
Trusted organizations only, sourcing attached to every question and reading passage, no loosening of that bar, ever. Questions organized into specific categories; scoring patterns drive continuously-developed diagnosis. Modules probe weak spots to improve them AND strong spots to understand why they work. Continuous diagnosis, always expanding, based on scoring sets.

## Design calls (mine, per Cam's delegation)

**1. Card-select: all three groups, staged in this order.**
Stage 1 — **Practice areas** (tax, audit/assurance, CAS/CAAS, advisory, wealth, litigation support, estate & trust — mirrors c2acct.com's practice-area taxonomy). Industry standard: every benchmark study segments firms by service mix first, because it predicts everything else. Stage 2 — **Current tech stack** (reuse the existing 14 function-area cards — same component as the vendor feature declaration, which is already built and battle-tested). Stage 3 — **Firm shape** (headcount band, client mix, growth posture — 3 quick cards). Each stage expands the question set Latin-square style, exactly like vendor products do today. Stage 1 alone unlocks the first modules; nobody faces all three stages on day one.

**2. The diagnosis engine — both directions, by design.**
Every completed module bank sorts a firm into a scoring-pattern subset (the AAE delta discipline: patterns, not single scores). Each subset unlocks two module types:
- **Weak-spot diagnostics:** score < threshold on a category → unlock a deeper module that decomposes that category ("Integration scored 52 → unlock 'Data handoffs and reconciliation practices'") → its results unlock remediation reading + re-assessment. Learn more to improve — the whole gearing, per Cam.
- **Strength forensics:** score > threshold → unlock a "why does this work" module capturing the practices behind the strength. This is *not* filler: it converts high performers into a library of replicable practices, which is benchmark gold and the content engine feeding future remediation reading for everyone else.
Quarterly drip governs pacing (EngagementQuarter): modules unlock across the quarter, Pat pings on each unlock ("Pat here — your next module just opened"). Firms never run dry in an hour; runway compounds as patterns multiply.

**3. Content sourcing model — three tiers, hard-enforced.**
- **Tier A (default): original content authored around authoritative public frameworks, cited.** Government works are public domain and free to use outright: GAO Yellow Book, IRS publications and Circular 230, Treasury/SEC materials. Standards bodies (AICPA, NASBA, COSO, state societies) are copyrighted: we cite and summarize, never copy — questions reference the framework ("per the COSO Internal Control framework's control-environment component…") with full attribution. This satisfies "trusted organizations only + sourced" without licensing costs.
- **Tier B: partner-provided material** — usable only with a written license/permission on file; tagged to the provider.
- **Tier C: does not exist.** No scraped, unlicensed, or unsourced content, enforced by schema (below).
- **CPA approval gate:** every module version carries `reviewStatus` and cannot go live until a credentialed reviewer (partner CPA — Leslie is the obvious first reviewer) approves it. Reviewer name + date stored on the record. This is also the paper trail NASBA sponsorship will want later.

**Schema (additive):** `ModuleTemplate` (category, targetPattern, moduleType: diagnostic|strength|remediation, reviewStatus, reviewedBy, reviewedAt) · `ModuleSource` per question/passage (sourceOrg, sourceDoc, sourceUrl, licenseType: public_domain|cited|licensed, accessedAt) — a question without a source row fails the contract test. Unlock rules: `UnlockRule` (patternSubset → moduleTemplate, quarterOffset).

**Category structure:** questions live in specific categories aligned to the five module families and the 14 function areas; every category accumulates its own answer-pattern statistics, and new subsets get carved when a pattern recurs across ≥ threshold firms (AAE confidence-band discipline — no subset on thin data).

## Build order
1. Schema + contract tests (source-required, review-gate) — Claude Code, ~1 day.
2. Card-select Stage 1 (practice areas) + first unlock rules — reuses vendor card component, ~2 days.
3. Content batch 1: two diagnostic + one strength module for the two most common weak categories in current data (Integration & Data Flow; Governance) — I draft from Tier-A sources, Leslie reviews, ~1 week parallel.
4. Quarterly drip + Pat unlock pings — wires to existing notification engine, ~1 day.
5. Expand by pattern data forever — the "continuously developed" loop is now structural.
