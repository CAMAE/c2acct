# Patalign — Module & Question Distribution Methodology (Phase 1 outline, for Cam's correction)
### July 8, 2026 · Grounded in the AICPA/NASBA CPE standards and public-domain government frameworks · Phase 2 (question drafting) starts after you redline this

## The standards we build against (why these numbers aren't ours to invent)

The accreditation world already defines what a credible self-study learning program looks like — the [AICPA/NASBA Statement on Standards for CPE Programs](https://www.nasba.org/files/2012/02/AICPA_NASBAStandardsFinal.pdf) and the [NASBA QAS Self-Study requirements](https://www.nasbaregistry.org/preparing-to-apply/qas-self-study). The load-bearing rules:

- **Credit unit:** 1 CPE credit = a 50-minute learning period. Module length is therefore designed in 25/50-minute blocks, not arbitrary question counts.
- **Measurable learning objectives:** every module states objectives up front, and **≥75% of objectives must be measured by the assessment** — you can't teach what you don't test.
- **Review questions:** the standard pattern is **~3 review questions per credit**, embedded in the reading, each with feedback explaining *why* wrong answers are wrong and reinforcing right ones. (This is your per-chapter quiz, and the feedback requirement is where PAT's plain-language voice shines.)
- **Final exam:** **minimum 5 scored questions per credit, 70% passing grade** before credit is issued. (Your entry quiz + final test structure maps exactly.)
- Sources: [NASBA CPE policies](https://www.iasa.org/common/Uploaded%20files/CPE%20Information/NASBA_Continuing_Professional_Education_ALL_METHODS_FINAL_6-2025.pdf), [QAS reviewer checklist](https://nasba.org/files/2013/10/2012-QAS-Transition-Reviewer-Checklist-FINAL-1042013.pdf).

We build to this bar from day one — even before applying to the [NASBA National Registry](https://www.nasbaregistry.org/cpe-requirements) — so the eventual application is a paperwork exercise, not a rebuild.

## Public-domain content spine (free to use outright, no licensing)

- **GAO Yellow Book (GAGAS)** — government auditing standards; superb for audit-practice, independence, and quality-control content. US government work = public domain.
- **IRS publications + Circular 230** — tax practice standards, preparer conduct, due diligence.
- **COSO-adjacent government material:** GAO's Green Book (Standards for Internal Control in the Federal Government) — the public-domain sibling of COSO's framework; internal-control content builds on it with COSO *cited*, not copied.
- **NIST (CSF, SP 800-series)** — security, data handling, access control; maps directly to your Governance/Controls and Integration modules.
- **SEC/Treasury/FinCEN guidance** — BOI, AML basics for firms, engagement-risk content.
- Copyrighted-but-citable tier (summarize + attribute, never reproduce): AICPA standards, COSO framework itself, NASBA materials, state society guidance.

## Distribution methodology (the part you asked me to think hardest about)

**1. Blueprint sampling, not question piles.** Each module gets a content blueprint — categories weighted by importance (like the CPA Exam's own blueprints): e.g., a Data & Controls diagnostic = 30% control environment, 25% access/security, 25% reconciliation practices, 20% documentation. Questions are drafted *to the blueprint*, so coverage is a design property, not luck.

**2. Item banking with rotation.** Every category holds a bank larger than any one sitting (e.g., 12 banked items, 5 served). Each firm's sitting draws a **Latin-square rotation** — order randomized per user (deterministic from userId, stable on resume, same as the module-order rotation), items balanced across difficulty tiers. Benefits: order-bias killed, answer-sharing between firms devalued, and re-takes see fresh items.

**3. Difficulty tiers + anchor items.** Each bank tags items easy/moderate/hard (target mix ~30/50/20). A few **anchor items** appear for every firm unchanged — they're the cross-firm benchmark thread that keeps scores comparable while the rest rotates.

**4. Two-layer assessment per module (the QAS shape, exceeded per Cam):**
   - Embedded review questions in each chapter (3/credit, rich feedback, not scored for credit) — teaching instruments.
   - **Final assessment: minimum 30 scored questions** (Cam's floor — far above NASBA's 5/credit minimum, which we treat as a floor not a target), 70% threshold. Item selection is **stress-tested**: the bank's calibration stats surface the hardest *relevant* items — highest-discrimination questions that strong firms get right and weak firms miss — so the exam feels heavy and extensive without being unfair. Not designed to fail people; designed so passing means something.

**5. Pattern-driven distribution (your continuous-diagnosis engine).** Scoring sets cluster firms into pattern subsets per category. Subsets drive what unlocks next: weak → deeper diagnostic → remediation reading → re-test; strong → strength-forensics module (why it works). New subsets are carved only when a pattern recurs across enough firms (AAE confidence-band discipline — never on thin data). Every new subset defines demand for the next module, so the catalog grows where the data says it should, not where we guess.

**6. Calibration loop.** Every item accumulates stats (p-value = % correct, discrimination = do high scorers get it right more than low scorers). Items that everyone aces or that don't discriminate get retired or rewritten quarterly. This is how real testing organizations keep banks honest, and it's automatic with the data we already store.

**7. Quarterly pacing.** Modules release on the EngagementQuarter drip; Pat announces unlocks. A firm's year = 4 quarters × 2-3 modules, each 25-50 minutes — sized to the CPE credit unit so that if/when NASBA sponsorship lands, existing modules convert to credit-bearing courses without restructuring.

## Cam's redlines (locked July 8)
✅ Difficulty mix 30/50/20 and 25/50-minute sizing approved. ✅ Entry quizzes stored as baseline patterns (unscored for credit). ✅ Final exams ≥30 stress-tested questions (above). **Reviewer of record: the CPA-certified founder** (Leslie is not a CPA — master's in marketing — so she becomes the *clarity/brand reviewer*: readability, plain-language, Leslie-persona test; the CPA founder signs content accuracy; the highly-regarded founder is the industry-credibility endorsement when we approach NASBA). Two-signature publish gate: CPA accuracy + clarity pass.

## Build-to-last: the scoring data is the future matching engine
Cam's grand-scheme requirement, recorded as an architecture constraint: the same scoring substrate must later power **high-end pairing** — firms↔vendors (the marketplace already on the roadmap) and eventually **people↔firms/vendors** (an eHarmony-grade professional pairing surface, not a job board). Implications baked in now, cheaply: (1) all scores stay capability-level and pattern-keyed, never collapsed into single opaque numbers — matching needs shapes, not averages; (2) the schema's Person-kind Subjects and SubjectMemberships stay first-class (the retired individual surfaces return as the talent side of matching); (3) module/assessment results carry category-level vectors so "this person's strengths fit this firm's gaps" is a query, not a rebuild; (4) every vector is tenancy-tagged and consent-gated — pairing exposure is opt-in when it ships. No matching UI now; the data model just never forecloses it.
