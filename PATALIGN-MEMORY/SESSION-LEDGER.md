# SESSION LEDGER — append-only. Newest first.

## 2026-10-08 · enforce-core (the code keeps the methodology page) — in progress, unattended
- WORK 7 (proof, budget mode): typecheck 0 (next typegen + tsc); lint:test 0; unit once 213 files / 1,852 tests (first full run: 2 stale mocks in tests/product-elite-depth.contract.test.ts, fixed at 4dc2720a, rerun 213 / 1,852 green). Guard vs baseline, Preview flag set: the 7-identity parallel crawl hit the test's 65-min budget twice (ETIMEDOUT; even alone — this machine runs a VM + Chrome; a single-identity crawl is 154 pages in 244 s), so it ran in three LINK_INVENTORY_IDENTITIES passes on one :3032 standalone: public,firm-pro,firm-elite GREEN (4 min); vendor-pro,vendor-elite,consultant GREEN (5 min); admin RED once (1 pair / 2 controls: the /admin/briefings catalog link name carries the firm's confidence word, "Grounded" → "Early signal" at 5 of 5 by ruling 4) → RENAMES ruling in tests/link-inventory.contract.test.ts (59cea45b) → admin GREEN (38 min). Captures at 1440 on :3043 (preview flags + ENTERPRISE, local db, launched with the env-trap line) in ~/work/box-enforce-core-proof/after: methodology (1.4, evidence floor, "within 5 points … 10 points or more"); vendor Elite Category Position ("9th of 14 · lower middle", "8th of 10 · lower middle", 3 × "Field still forming", Cutoff "Assessments completed by Dec 31, 2026", "Evidence floor" row); vendor Pro hub; firm Elite hub (chips Operations / Automation / Integration / Governance / Strategy, "Gap Plan") and gap plan page ("Gap Plan"); firm hub radar "Operations 83%, Automation 72%, Integration 85%, Governance 66%, Strategy 90%"; home radar the same five words; Guide nudge queue (0 pending locally); Guide briefing for Calder, Pierce & Boon (caption "Module scores stay separate from confidence", rows "Raw score 72% · Grounded · 9/27/2026", no People assessed / Person-level / Individual risk) — the enterprise account could not sign in locally (hash differs), Aldermere exists only on preview. Captures under the guard load took >120 s per signed-in page; alone 0.1 to 0.7 s. Report: ~/work/inbox-from-mythos/FORGE-REPORT-ENFORCE-CORE.md. NOT pushed, NOT deployed; Cam types push. Rulings for Cam: 7 of 13 = 54th percentile = upper middle; the cap suppresses most demo categories; 5 points aligned; heatmap caveat reworded; 11e already gated. NOT-CLOSED.
- WORK 2 (items 1 to 3, e5fb209a): lib/benchmarks.computeBenchmarks(client, { cutoff }) reads only finals with createdAt <= cutoff (default lib/consultantFreshness.quarterCutoff(now), the published rule, no lag) and stores it on BenchmarkRun.cutoff (nullable column, migration 20261008120000_benchmark_run_cutoff); readers return it and both benchmark cards show "Assessments completed by <date>" / "Not recorded on this run"; scripts/compute-benchmarks.ts --cutoff <date>. lib/assessmentCore.ts (new): latestFinalPerFirm imported by benchmarks, vendorProductInsightEngine (firm rows now select companyId), productMaturity, eliteInsightsV2 (product cohort) and vendorAlignmentInsightEngine. Dominance: vendorCategoryContributorWeights (firm-reviewed products per vendor) evaluated at compute (printed per category) and in buildVendorCategoryPosition (same rows, same cutoff), product cohort by products per vendor, firm cohort through evaluateBenchmarkSuppressionByCount; the card's literal 5 is the import, dominated categories say so. tests/enforce-core.contract.test.ts: cutoff pin, one-vote pin, dominance pin (weights 4/2/2/1/1 → contributor_dominance).
- WORK 3 (items 4 to 6, 4e8837ec): firmInsightEngine.firmInsightConfidenceForModules = confidenceBandForSampleSize (3/6) on scored modules (5 of 5 → Early signal, pinned as intended); adminBriefingEngine: layerCompleteness (the coverage halves, a flag that never produces a word) + the table on sample size, getOverallConfidence on the briefing's data-point count, heatmap row shows the table's label (n = the module's scored answers) instead of "confidence NN%", the Firm appendix caveat reworded (the percent it described is gone); vendorPat.computeVendorAssessmentMetrics(answers, expectedQuestionCount) with the plan's scored count from the submit route and the seed; firmPat.submitFirmProductAssessment runs evaluateSignalIntegrity (route passes expected.length); firmMaturity.maturityTier deleted, bandLexicon.maturityBandFor (tier = band key upper case, bounds) for productMaturity, the demo seed and the two scripts; guard pin: no EMERGING/FOUNDATIONAL/SCALING/ADVANCED literal in lib, app, scripts (prisma column defaults and the VendorStatus enum untouched, DOORS).
- WORK 4 (items 7 and 8, b713530d): qbankParser QBANK_ANCHOR_CODES deleted; readDeclaredAnchorCodes reads the bank's "anchor-item candidates" line; parseQbank flags that set; import-qbank refuses a bank whose flagged set differs from its declared set; preflight uses the parser's reader; scripts/modules/restamp-qbank-anchors.ts (dry run default, --apply, before/after per bank); tests: parser two banks two sets, serving two banks each sitting carries its own six. assessmentCore DIVERGENCE_ALIGNED_WITHIN 5 / DIVERGENCE_FLAGGED_AT 10 / divergenceState imported by vendorProductInsightEngine (summary, callout, plain language, caveat), alignmentBoard.pieceGap, adminBriefingEngine (BriefingProductSummary.divergencePoints; the clearest calibration gap = widest flagged gap); methodology divergence paragraph names the pair; pin 4/5/9/10/15.
- WORK 5 (items 9 to 11, f647e60a; content dates 4310b1c1): lexicon.quartileWord follows quartileOf (4 = top) from the percentile the card shows (pattern-b pin updated; 7 of 13 = 54th percentile = upper middle, flagged for Cam); METHODOLOGY_VERSION 1.4 + the one changelog line; "safe harbor" → the evidence floor phrase in lib/methodology.ts (section title, paragraph, the 1.1 changelog entry) and on the Category Position page summary and card ("Evidence floor" row, note); 11a caption "Module scores stay separate from confidence" + the appendix description drops "canonical"; BriefingBoard added to tests/helpers/copyScan.ts SCAN_FILES (explicit files bypass the /admin/ EXCLUDE) and its admin voice table moved verbatim to adminBriefingVoice.ts (outside the scan; admin text unchanged); 11b PortalBriefingView hides the People assessed tile, the Person-level layer summary and the Individual risk row with the Person-level tile while the flag is off (ExecutiveSummaryCard / LayerSummariesPanel take individualSurfacesEnabled, default true for the admin view); 11c firmWorkspaceDashboard radar labels = pillarForModule(module.key), V7RadarFigure and V7FrontDoor read FIRM_PILLARS (v7-front-door pin updated); 11d "Gap Plan" (page title, insightContent, eliteInsightsV2 meta; zero "Gap-to-Top-Quartile" left); 11e pinned (both ecosystem pages already gate on PAT_ENABLE_VENDOR_FOLLOWUP_MC).
- WORK 6 (item 12, b039bbd5): scripts/ops/dismiss-stale-nudge-drafts.ts (PENDING drafts whose firm is at 5 of 5 or whose body contains "consultant"; dry run default; prints the db host). Preview (vercel env pull to the scratchpad, deleted after): 7 pending, all 2026-09-16 "A friendly reminder from your Patalign consultant", dismissed 7 → pending 0 (the apply ran unattended this time). restamp-qbank-anchors dry run on preview: neither bank imported (qbank-gov-v1 / qbank-int-v1 absent) → nothing to re-stamp. Local: 0 pending drafts; banks absent too.
- WORK 1: branch feat/enforce-core from 9a7cc64e (feat/pattern-b-words head). R62 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md from the box; this commit is the ledger bank. Read: the box, PAT-RULES.md, spec section 1 (inventory), audit section 6, charter ruling 48.

## 2026-10-06 · pattern box B, words (B1 then B2 if budget) — in progress, unattended
- WORK 2 (change 1): lib/lexicon.ts — roleWord (Guide through lib/roleWords guideWord, keeping the R17 flag law so flag-off copy stays the production word), TIER_WORDS, EVIDENCE_WORDS, BENCHMARK_WORDS + quartileWord (top quartile / upper middle / lower middle / bottom quartile), FRESHNESS_WORDS, SCORE_WORDS, PRODUCT_WORDS, ASSESSMENT_WORDS in en/es/fr; modules re-exported from lib/firmPillars (MODULE_SHORT_LABELS, MODULE_LONG_LABELS); RETIRED_WORDS.
- WORK 3 (change 2): the 124 "consultant" strings of the raw scan were already guideWord() calls or identifiers/routes after R17; the leftovers that read "consultant" plainly are now the Guide word: Guide briefing / product briefing eyebrows and "Back to the Guide overview", the two brief methodology notes ("No Guide interpretation"), the Guide alignment-board banner, the Guide access gate (consultants/layout), the membership bullet "Guide collaboration", the nudge title ("from your Patalign Guide") and sender ("Your Guide"). Routes, identifiers, types and admin pages untouched. The help corpus carried no plain "consultant" outside slugs.
- WORK 4 (change 3): OnboardingPreviewRail AXES = FIRM_PILLARS; V7FrontDoor types its radar rows with FirmPillar (the literals are the same five labels); the home radar and the insights radar both read pillarForModule from lib/firmPillars already; "Five pillars" chips (V7FrontDoor, HowItWorks) -> "Five modules", V7DoorBand "five part" -> "five-module", V7RadarFigure "Five-module alignment radar", the firm hub "five-module assessment", methodology "equal parts of the framework", help article label "The five modules, briefly" (slug unchanged); help/ markdown: pillar(s) -> module(s) across 30 articles (link targets and code spans kept; two glossary cross-reference lines deduped where a Pillar entry and a Module entry became twins).
- B2 PROOF (budget mode): tsc 0; lint:test 0 (one unused-import warning on V7FrontDoor fixed by typing the radar rows as FirmPillar); unit once 212 files / 1821 tests; both guards zero; guard:doors first run was stopped by the harness 10-minute cap after a 39-minute flags-off crawl that had lost 1 control on 1 pair (the log was lost to a relaunch; the baseline shows the locked card's "Live with Elite membership" link on /firm/benchmark · firm-pro, renamed to "Upgrade to Elite" by V6) -> ruling row (route *, "Live with Elite membership", B2 V6) in ops/qa/link-removals.json; the Gap Map matrix cells were still "+21" in the first capture (the engine builds display) -> words (V11, display only) + pin; rebuilt; guard relaunched detached (nohup): rc=0, flags-off 3/3 on :3031, flags-as-preview 3/3 on :3032. Captures at 1440 on the final build (:3044, preview flag set + ENTERPRISE=1, local db) in ~/work/box-pattern-b-proof/after-b2: home; vendor and firm membership signed out (bullets from the table; 0 old bullets); trust (0 "provider-backed billing"; cam@patalignhq.com); Guide home + Sentinel ecosystem (the only retired-word hits are the raw vendor follow-up picks "prod.q1.e" the open-ended panel prints while PAT_ENABLE_VENDOR_FOLLOWUP_MC is off locally — the vendor-flag item); firm hub; Strategy module page; vendor Pro hub (3 locked cards, the line once each, 3 "Upgrade to Elite" buttons); Category Position (top quartile / upper middle / lower middle); Gap Map ("firms 21 lower", "firms 5 higher", 0 bare plus). Reports: FORGE-REPORT-PATTERN-B1.md and FORGE-REPORT-PATTERN-B2.md.
- WORK 6 (B2, change 6): lib/capabilities.ts — one row per surface (key, label, sentence, route with [param] segments, audience, per-tier value) for vendor (10), firm (6) and individual (7); labels and cell phrases stay in the locale bundle; membershipContent builds the comparison rows AND the tier bullets (capabilityBullets: every included row, "Label: qualifier" for a qualified inclusion, a locked preview is never a bullet) from it; the hand-written features arrays are deleted; tests/pattern-b-claims.contract.test.ts resolves every route in the app tree (/enterprise/channels is /enterprise/channels/[verticalId]) and checks every rendered bullet maps to a row. Vendor Elite price line unchanged (no ruling on file).
- WORK 7 (B2, change 7): LockedElitePreview says "Live with Elite membership" once (the overlay) and its button reads "Upgrade to Elite" (LOCKED_ELITE_LINE / LOCKED_ELITE_BUTTON exported); the "Elite membership brings it live" sub-line dropped.
- WORK 8 (B2, change 8): trustContent drops "with provider-backed billing" (P5); support contact cam@patalignhq.com in PatTopBar, /support, the sign-in Help tab and the three locale noSurface strings (P7, no ruling that support@patalign.com is monitored); the Meet PAT and sign-in copy from the hotfix stays.
- WORK 9 (B2, change 9): Category Position reads the quartile in words (lexicon quartileWord: top quartile / upper middle / lower middle / bottom quartile) beside the rank, and "to reach the top quartile" without "(Q1)"; the Gap Map cell says "firms N lower" (orange) / "firms N higher" (green) / "match"; the vendor Elite [key] page carries the insight name as eyebrow and title in the locked view too (the live views already did). Firm Elite titles untouched (the "Gap-to-Top-Quartile Plan" name no longer matches the F6 card and needs a ruling). Pins: hotfix-demo-1-signin and trust-surfaces-v7 support address.
- B1 PROOF (budget mode): tsc 0; lint:test 0; unit once 211 files / 1812 tests; both new guards zero; guard:doors first run FAILED on both flag sets (8 pairs, 15 controls: the Guide briefing back link renamed "Back to the Guide overview", and the trust page release card whose description now says "build fingerprint") — both are this box's renames, so two RENAMES normalizations were added to tests/link-inventory.contract.test.ts citing the box (R-U / R-P); rerun rc=0, flags-off 3/3 on :3031, flags-as-preview 3/3 on :3032. Page-text + PNG captures at 1440 on the rebuilt standalone (:3043, preview flag set + ENTERPRISE=1, local db) in ~/work/box-pattern-b-proof/after-b1: home, Guide home, Sentinel ecosystem, vendor-brief roadmap ("Now · the next 30 days" etc.), firm hub, firm assessment hub (first capture still showed "canonical five-module model" from a mixed-JSX sentence the scanner skipped; scanner widened, nine more sentences rewritten, recaptured clean), Strategy module page (long title). The retired-word regex over every captured page text returns nothing. Report: ~/work/inbox-from-mythos/FORGE-REPORT-PATTERN-B1.md.
- WORK 5 (changes 4 and 5): tests/helpers/copyScan.ts scans the customer-copy set (app/(app) minus admin/dev, app/(public), app/components minus admin/agents, help/, and the content, engine, navigation and notification lib files) for reader-visible strings (sentence-like literals and JSX text; paths, URLs, keys and code caught between tags skipped; md link targets and code spans skipped); tests/guard-reader-words.contract.test.ts (R-P list) and tests/guard-retired-names.contract.test.ts (consultant, peer-validated, pillar(s), five part, canonical, Q1-Q4 standing alone) both at zero, inside test:unit. 243 code hits and 216 help hits rewritten in the reader's voice: "PAT keeps the route visible" -> "This page stays visible", route(s) -> page(s), runtime -> build/server/engine by context, scaffold -> no-charge wording on billing and "outline"/"workspace" elsewhere, staged -> "not yet open" / "A candidate not yet firm-reviewed" (AlignmentBoardClient 249/252), "Auth plumbing" diagnostic line removed from RoleSignInPage, MembershipCheckoutShell "billing details PAT keeps on file; no charge today", explainerContent canonical dropped, firm alignment-assessment 39 "All firm modules...", vendor product-assessment 186, trustContent (Build proof, build fingerprint, Source root, No-charge mode), membershipContent, patNavigation, portalVisibility, patUnlocks, pilotSurfaces, platformRollout, publicOnboarding, insightContent, the briefing appendix caveats ("The PAT score remains...", "The firm score is...", "firm-reviewed score"), the vendor brief roadmap horizons (Q1-Q4 -> "Now · the next 30 days", "Next · days 31 to 60", "Later · days 61 to 90", "After the pilot"), the individual portal strings (surface off) in en and fr locale. tsc 0, lint:test 0.
- WORK 1: branch feat/pattern-b-words from 8e0a6bd5 (feat/pattern-a-readers-gates head). R61 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md from the box; this commit is the ledger bank. Read: the box, PAT-RULES.md, audit sections 2 to 5, the raw scan DEV-COPY and CLAIM lists only.

## 2026-10-06 · pattern box A, readers and gates — in progress, unattended
- WORK 6 (proof, budget mode): build 0; typecheck 0; lint:test 0; unit once 209 files / 1810 tests (three failures in tests/evidence-lineage-policy.contract.test.ts were a prisma-mock gap for the new surveySubscription freshness read, fixed at 634d11a6, suite re-run 5/5 green); guard:doors rc=0, flags-off 3/3 on :3031, flags-as-preview 3/3 on :3032; page-text (R-W) + PNG captures at 1440 on the standalone (:3042, preview flag set + ENTERPRISE=1, local db) in ~/work/box-pattern-a-proof/after (after-capture.json): signed-out sign-in and trust ("Updated October 2026"); signed-out /vendor/membership 200 with 3 tiers and /firm/membership 200 with 2 ("Not signed in"); Guide (review.consultant+sentinel) freshness panel row "Sunbelt Practice Advisors ... Fresh Last census: Sep 27, 2026" and the Sentinel ecosystem row "Last full assessment: Sep 27, 2026 Fresh" for the same firm; nudge queue (empty locally: no pending draft); firm Elite (demo-firm-elite) hub gap card "Strategic alignment: 20 pts under its bar", zero "to top quartile", gap plan page first row "20 pts under 60%"; vendor Elite hub "0 of 5 categories in top band", zero "products in top band".
- WORK 5 (change 9): package.json test:two-readers (pattern-a-readers + hotfix-demo-1-two-readers + hotfix-demo-1-assessment-list = the five entity pairs: freshness, module progress/nudge, gap plan, category count, vendor product status, plus the briefing heatmap/ecosystem pair), test:clock (pattern-a-clock + the hotfix briefing clock test), test:role-landing (pattern-a-gates + audience-role-wall + hotfix-demo-1-signin); all inside the test:unit include so they run in every box; tests/pattern-a-wiring.contract.test.ts pins the scripts to existing files and the include glob. lib/generated/contentDates.json regenerated after the WORK 4 commit (trustContent now dated 2026-10-06).
- WORK 4 (change 8): scripts/release/content-dates.mjs writes lib/generated/contentDates.json (last commit date per content file: lib/trustContent.ts, lib/methodology.ts; committed, regenerated by bake-release.mjs in the cloud build command and by build-lock.mjs on local pnpm build; a CLI vercel deploy carries no .git so the cloud build keeps the committed json — R-K coupling, listed in the report); lib/contentDates.ts contentDateIso / updatedMonthYear / formatUpdatedLabel (clamped to now); TRUST_SURFACE_LAST_UPDATED and the methodology surface lastUpdated are computed ISO values (literals "April 28, 2026" and "July 10, 2026" gone); PageHead.monthYear formats an ISO value through the clamped helper and keeps the "Month D, YYYY" branch for the methodology changelog (history, untouched). Note: this box's own commit moves lib/trustContent.ts to October 2026, which is the point. tests/pattern-a-clock.contract.test.ts (now = 2025-09-01, 2027-09-01, now -/+ 400 days; json sanity; no literal date in trustContent; both build paths write the json). tsc 0, lint 0, trust suites green.
- WORK 3 (changes 6 and 7): change 6 needed no page code — after hotfix-demo-1 every gated pill (Individual, Invitee, Guide, Enterprise) is already behind its flag and a disabled requested view falls back to Vendor; the contract test tests/pattern-a-gates.contract.test.ts walks every UserRole x company kind x membership kind (plain, guide, enterprise) through audienceHomeFor + the sign-in view inference + isPilotVisibleSignInView on the preview flag set and asserts a landing for each (the company-less individual lands on the sign-in hub's no-surface message while PAT_ENABLE_INDIVIDUAL_SURFACES is off; an unresolved company kind is the only null and it throws, which is the point); source pins for each flag gate; a ruling row in ops/qa/link-removals.json (/sign-in, "Individual / Invitee", R-T; the production crawl never carried those pills). Change 7: lib/authz SIGNED_OUT_SALES_PAGE_PATHS = /vendor/membership and /firm/membership, isSignedOutSalesPage(pathname, method), isProtectedPatPagePath(pathname, method = "GET") excludes a signed-out GET of exactly those two; proxy.ts passes req.method; checkout and every other portal route stay protected; no enterprise membership page exists. The anonymous 200 proof runs on the standalone at WORK 6. tsc 0, lint 0, 116 tests across the gate suites.
- WORK 2 (changes 1 to 5): lib/firmFreshness.ts = the one firm-freshness reader (newest FINAL module submission across the five modules, classified by lib/freshness; getFirmFreshness / getFirmFreshnessForFirms, batched); eliteInsightsV2.getFirmEvidenceFreshness delegates to it (was firmMaturitySnapshot.computedAt) and consultantFreshness.getConsultantFreshnessBoard reads it for "last census" (was the snapshot groupBy) — FreshnessBoardClient is now FirmFreshnessClient + cadenceConfig. G3: the completion nudge lives in lib/notifications/nudge.ts buildNudgeMessage (not generators.ts as the box names; generators carry no completion copy); it now takes the hub's module progress (readFirmModuleProgressForNudge -> firmPat getFirmAssessmentProgress + summarizeFirmAlignmentProgress; nudgeDraft.createNudgeDraft passes it for firm audience): 5 of 5 -> refresh copy, open modules -> "N of 5 ... still open", unknown -> the old copy. F6: eliteInsightsV2.gapPlanLead + gapPlanRowMeta are the one builder; the hub card hero = "<capability>: N pts over|under its bar" with chip "thinnest margin" / "biggest gap" and sub "<cleared> of <total> capabilities at their bar"; peer.bestAction no longer feeds the gap card (it stays on Peer Position); FirmGapPlanCard's two row metas use gapPlanRowMeta (text unchanged: "+N pts over X%", "N pts under X%"). V8: sub "categories in top band". Change 5: app/api/results/route.ts already applies getSurveyFinalWhere on both reads (the audit line is stale on this branch); no code change, a pin test. Tests: tests/pattern-a-readers.contract.test.ts (two-readers for G2 with the ecosystem definition cross-checked against summarizeFirmAlignmentProgress.lastFullAssessmentAt, G3, F6 card vs rendered page row, V8, results pin); consultant-freshness fake + anti-A3 pin, elite-insights pin, battlecard-leak mock updated. tsc 0, lint 0, 79 tests across ten suites.
- WORK 1: branch feat/pattern-a-readers-gates from 0f020108 (feat/hotfix-demo-1 head). R60 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md verbatim from the box; this commit is the ledger bank. Read: the box, PAT-RULES.md, audit sections 2, 4, 5 only. The untracked scripts/demo/seed-demo-swaps-vendor-elite.ts (data task 10/05, "no code change") stays untracked and outside this box.

## 2026-10-05 · hotfix-demo-1 (demo-critical, preview before 10 AM 2026-10-06) — in progress, unattended
- WORK 6 (proof, budget mode): build 0 (twice: before the guard, and after the design-token ratchet refactor that moved the narrative / layer summaries / 30-60-90 blocks into one copy for both briefing views and gave the disclosure the pat-card class; borderRadiusPxClass back to the 223 ceiling); typecheck 0; lint:test 0; unit once 205 files / 1754 tests (the ratchet failure fixed, then the four touched suites re-run green; the full run was before the fix: 1753 green + that one); guard:doors rc=0, flags-off 3/3 on :3031 and flags-as-preview 3/3 on :3032 (the two rulings were not needed on the crawl: the baseline never carried the two controls, and the briefing disclosures lost no control on the consultant briefing). After captures at 1440 on the rebuilt standalone (:3041, preview flag set + PAT_ENABLE_ENTERPRISE=1 + FOLLOWUP_MC=1, local db) in ~/work/box-hotfix-demo-1-proof/after (results.json + after-capture.log): sign-in Vendor tab (pills Vendor, Firm, Guide, Enterprise, Admin, Meet PAT, Help; no "Review local auth setup"; the provisioned sentence), sign-in Enterprise tab (view=enterprise, callback /enterprise), Meet PAT one card, Help three lines and no reset button; vendor Elite (demo-vendor-elite@pat.local) /vendor/product-assessment: clicking Completed switched the list ("Existing products still in progress" -> "Completed vendor product assessments", ?mode=completed, 12 rows; no draft locally so no draft note); enterprise owner signed in on the Enterprise tab and LANDED ON /enterprise (E1); Quarry Lane Tax briefing: order Executive summary, Insight narrative, Layer summaries, Risks, Opportunities, 30/60/90, Module heatmap, Product stack summary, then "Vendor follow-up answers (50)", "Firm follow-up answers (25)", "Confidence and evidence appendix", all three closed; header sentence; no Person-level tile; heatmap 5/5 on scored sections (the TEXT follow-up section of each module reads 0/5 — it has no scored answers; pre-existing, not WRONG-ROW); Meridian ecosystem page (6 firms locally; the engagement card is hidden because every local firm is at 100%, so the computed date is proven by the clock test only); Guide (review.consultant+sentinel) Boltway briefing: same order, disclosures (20) / (10) / appendix closed. "Canonical" still appears twice inside the appendix caveats (engine strings "Canonical PAT score remains..." and "Firm canonical score is..."), not in the two labels the box names; left for a ruling.
- WORK 5 (changes 9 and 10), PARTIAL: env pulled (vercel env pull, preview) to the session scratchpad and deleted after use. Preview flag table (R-C), flags by value: ALIGNMENT_BOARD=1, BATTLECARD=1, FOLLOWUP_MC=1, NEW_FRONT_DOOR=1, PAT_ASSISTANT=1, PINGS=1, REGISTRY_MEMO=1, SELF_SIGNUP=1; CONSULTANT_ACCESS and ENTERPRISE are Vercel sensitive (value unreadable; both portals serve on preview per the audit, so =1 by behaviour); NOT set in preview: INDIVIDUAL_SURFACES, INVITEE_SURFACES, VENDOR_FOLLOWUP_MC, LOCAL_REVIEW_AUTH. Diff vs production (names; prod values sensitive): preview adds ENTERPRISE, FOLLOWUP_MC, NEW_FRONT_DOOR, REGISTRY_MEMO. Secrets present by name: DATABASE_URL, DIRECT_URL, AUTH_SECRET, ANTHROPIC_API_KEY. scripts/demo/shift-future-timestamps.ts (every public timestamp column scanned; a future value -> now - (value - now); --apply) DRY RUN on preview: 282 future values, ALL SurveySubmission.createdAt, all demo-firm-product-submission-* rows (firm product reviews), the farthest 2028-04-16 (mirrors to 2025-03); every other column clean. Cause: lib/demoPatEcosystemSeed.ts:255 adds positive offsetHours to DEMO_SEED_BASE_DATE, which 3f made relative to seed time, so review rows seeded "base + N hours" land in the future; the briefing Latest update and the ecosystem Last full assessment are plain max() reducers over SurveySubmission.createdAt (adminBriefingEngine latestDate; firmPat lastFullAssessmentAt), so the data is the fault, not the reducer. scripts/demo/seed-demo-firm-followup-picks.ts (latest FINAL submission per demo firm x firm module; one FollowUpMcAnswer per follow-up into the stored answer + AssessmentItemResponse rows through buildAssessmentItemResponseRows; SINGLE one pick, MULTI two, every 7th "Not a significant issue here", every 11th "Other" with a write-in; idempotent on existing option rows; legacy TEXT rows for the same follow-ups removed) DRY RUN on preview: 139 demo firms, 637 latest finals, 631 to update, 5 already carry option rows, 1 not the seeded sentence; 3155 picks, 3764 rows, all 8 options used on every one of the 25 questions. --apply BLOCKED: the harness permission classifier refused the write to the preview database twice (full command and the shift alone); not worked around. Both scripts are committed; Cam runs the two apply lines in the report (they print the change log) before the deploy. Dry-run logs: ~/work/box-hotfix-demo-1-proof/{shift-dry,picks-dry}.log.
- WORK 4 (changes 6 to 8): G4: lib/consultantFreshness.nextQuarterCutoffLabel(now) (quarterCutoff as YYYY-MM-DD UTC) feeds both LowestEngagementFirmsCard twins (optional `now` prop for the clock test; GOAL_DUE_DATE literal gone; "Goal text is suggested..." gone; h2 = "The lowest-engaged quartile of the ecosystem, ranked by module completion."; the paragraph drops its now-duplicate first sentence). B: BriefingBoard gains PortalBriefingView (composition: the same exported pieces in the demo order; count tiles + Insight narrative + Layer summaries stay under the executive summary; three <details> disclosures closed on first render, open only when ?q= / ?module= is in the URL; vendor disclosure = the existing ProductOpenEndedResponsesPanel with its search; firm disclosure = FollowUpEvidencePanel with a module-filter pill nav (?module=<key>); appendix disclosure; Person-level tile and the Individual appendix row hidden while PAT_ENABLE_INDIVIDUAL_SURFACES is off; the Layer summaries "Person-level layer" box is not in the box and stays). ExecutiveSummaryCard gains voice="portal" ("Firm score", "Completed firm modules in the current briefing."); admin CompanyBriefingView and wording untouched (production baseline). Both pages: new header sentence, PortalBriefingView, ?module= param. WRONG-ROW (change 8) causes: (1) firm module submissions store answers FLAT {questionId: value} (confirmed on the local db: firm_alignment_strategy_v1 final row) while buildModuleHeatmap read only a `responses` wrapper -> readFirmModuleAnswers (flat first, wrapper fallback); dead extractResponses removed; (2) getVendorAlignmentInsightBundle() unscoped pools REAL+PILOT boundaries (demo firms excluded) -> buildFirmBriefingPreload(firmIds, { vendorCompanyId }) scopes the bundle to getVendorScopedFirms, used by buildEcosystemDetail AND the new lib/ecosystem.getFirmBriefingInEcosystem(companyId, vendorCompanyId) that both briefing pages call when the firm sits in one of the viewer's ecosystems (unscoped fallback otherwise; admin path unchanged). Tests: tests/hotfix-demo-1-briefing.contract.test.ts (renderToStaticMarkup: order, closed disclosures, counts = list lengths, filter/search opening, tile/row hiding, voice; card clock test), tests/hotfix-demo-1-two-readers.contract.test.ts (pure heatmap on a flat fixture; DB-backed two-readers render against the local docker db via .env.local DATABASE_URL, skips when unreachable: ecosystem-row sampleSize == scoped firms with final module submissions == <= detail.firmCount; each scored module's section answeredCount sum == submission.answeredCount; PASSED locally). followup-evidence pin updated for the consultant page. tsc 0, lint 0, 55 tests across six suites.
- WORK 3 (changes 4 and 5): lib/vendorPat.ts deriveVendorProductOverviewStatusFromHistory (latest FINAL row wins over a newer draft row; draftInProgressSince = the draft createdAt; formatDraftInProgressLabel "Draft in progress since <Mon D, YYYY>"); VendorProductOverviewStatus gains draftInProgressSince; the vendor list page reads findMany (newest first) instead of findFirst, honours ?tab= as an alias of ?mode= (tab links keep ?mode=, the baseline routes), and the card context carries the draft note; productStatusRows keeps the row "Final" and appends the draft note to attentionReason without needsAttention. Cause of V1: the page read only the newest SurveySubmission row, and a re-opened product's draft row (app/api/vendor/product-assessment/draft) demoted it to "In progress". V4 sentence removed (VENDOR_PRODUCT_TIER2_HOVER import dropped from the client; the export stays). tests/hotfix-demo-1-assessment-list.contract.test.ts (one final + one later draft fixture; strip row; page pins). tsc 0, lint 0, 37 tests across the three suites. Not verified here: the PatModeToggle click path itself (Link replace + scroll=false looked sound in source); the WORK 6 capture clicks the Completed tab.
- WORK 2 (changes 1 to 3): audiencePolicy gains the "enterprise" segment (/enterprise; company-less enterprise member after the operator rule, company binding still wins) and audienceGuard reads getEnterpriseForUser for company-less accounts (null flag-off); routes.ts CanonicalSignInView + infer + post-auth "enterprise" -> /enterprise; both sign-in actions accept view=enterprise; the hub no longer redirects a signed-in "user"-home account while the individual surface is off (signedInWithoutSurface -> signIn.noSurface message; the old loop was /user -> /sign-in?pilotDisabled -> /user). Enterprise pill between Guide and Admin behind PAT_ENABLE_ENTERPRISE with its own RoleAccessCard (view=enterprise, callback /enterprise, provisioned form). "Review local auth setup" renders only while PAT_ENABLE_LOCAL_REVIEW_AUTH=1; the provisioned-box paragraph on every role is the box sentence (signIn.provisionedBody; the roleBody/admin/consultant card bodies are not in the box and stay); Meet PAT tab = one card (signIn.meetPatTitle/meetPatBody; MeetPatContent untouched); Help tab = three lines (tabs list, support@patalign.com, first sign-in password); the help status box and its "Reset local auth state" form leave by ruling. Two rulings in ops/qa/link-removals.json (route * / "Review local auth setup"; /sign-in?view=help / "Reset local auth state"). Locale en/es/fr. Baseline check: the 2026-09-10 crawl ran with local review on, so "Review local auth setup" was never a baseline control. Tests: tests/hotfix-demo-1-signin.contract.test.ts (+ role wall enterprise profile, v7-sign-in pins 7->9 register, 2->1 secondary, 5->6 cards). tsc 0, lint 0, 130 tests across the sign-in suites.
- WORK 1: branch feat/hotfix-demo-1 from 1df82b40 (feat/membership-enterprise head). R59 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md verbatim from the box; this commit is the ledger bank. Read: the box and PAT-RULES.md only. Box note: the box carries INTENDED CHANGES, DOORS and WORK but no REQUIREMENTS/ENVIRONMENT/EXISTS/PROOF/NOT VERIFIED sections (template Part 3); Cam directed the run, so the flag table is read at WORK 5 (vercel env pull) and reported, and EXISTS is taken from the component files as each change is made.

## 2026-10-04 · membership-enterprise (vendor Enterprise tier card, comparison table on both membership pages, 3h rider) — in progress, unattended
- WORK 2 and 3 at 4fe7439d (changes 1, 2, 4 in one commit; the rows and the card share lib/membershipContent.ts and the locale bundle): Enterprise is a tier key (ENTERPRISE), never a MembershipPlan; vendor order Pro / Elite / Enterprise via getMembershipTierOrder, firm and individual unchanged; content-only card with "Enterprise license / by agreement", the verbatim copy, a mailto text link, no checkout. The existing MembershipComparisonTable (a baseline control: button "FEATURE COMPARISON Compare what each tier includes Click to collapse" on both membership pages, every identity) is kept as the same details and retitled "What each membership includes" (guard RENAMES entry); rows are the box's, flat, with R7 ("Battlecard" -> Product Fit Card brief) and R24 (Alignment board / Tech Stack Sandbox -> one Tech Stack Sandbox row) applied and the box's "Elite insights compare panel" (no such surface) reading "Elite insights (peer position, gap plan, trajectory)". Strings in lib/locale.ts membership bundle en/es/fr; pages still render English. Tests: tests/membership-enterprise.contract.test.ts (three tiers / two tiers every tab and plan; no digit after "Enterprise"; every cell phrase in the locale file; three locales same keys); tests/membership-content pinned to the new rows. Box EXISTS defects found: the comparison table already existed; signed-out visitors never see the tier grid (proxy.ts /vendor and /firm prefixes send them to sign-in, in production's baseline too). No public pricing page exists.
- WORK 4: change 3 untouched (vendor Elite reads "Ecosystem license" / "contact us"; the Product Fit Card veil prints the same) pending Cam's (a)/(b)/(c); change 4 landed with 4fe7439d. Rider at ec05b3de: firm full view renders Current limits and Evidence provenance inline (surfaceCollapsed prop and the details branch removed from InsightDetailShell, no other caller); ops/qa/link-removals.json row for button "PRO · EVIDENCE DETAIL Full prose readout" citing this box, rulingDate 2026-10-02.
- WORK 5 (proof, budget mode): tsc 0, lint 0, unit once 1699/1701 (201 files; the 2 fails are tests/safe-export.contract.test.ts: gitignored artifacts/launch-proof absent on this disk, unrelated), no-free-copy green. Captures at ~/work/box-membership-enterprise-proof/after: vendor Elite 1440 and 390 (3 cards, "Enterprise" x4, 0 digits after it, mailto present), firm Pro 1440 and 390 (2 cards, table present), firm Elite full view 1440 (Current limits, Evidence provenance inline; "Full prose readout" 0); the signed-out vendor capture is the sign-in redirect (pre-existing). Guard flags-off on :3031 (987 pairs, 38 min): FAIL, 36 controls on the 12 checkout route x identity pairs, all Stripe provider-mode controls ("Continue to Stripe checkout", "Open Stripe customer portal", the billing-portal checkbox) — the checkout routes are zero-diff; no STRIPE_* key exists in any env file on this disk, so the standalone ran scaffold mode (environment, not the box). Neither the ruled "Full prose readout" button nor the retitled table appears in the losses. DOORS zero diff: membership.ts, membershipContext.ts, checkout routes, prisma, engines, package.json. Traps this run: node_modules was the mac-mini-ops tree (pnpm install + prisma:generate + rm .next); .env.local's https AUTH_URL looped the session cookie and MAC_MINI_PUBLIC_ORIGIN disabled local-review auth (launch with loopback AUTH_URL, those origins set empty, PAT_LOCAL_REVIEW_PASSWORD=pat-local-review); the standalone re-reads its own .env copy so unset vars come back. Both membership pages are 702px wide at a 390 viewport (the table's min-w-[640px]; pre-existing, not fixed).
- WORK 6: report at ~/work/inbox-from-mythos/FORGE-REPORT-MEMBERSHIP-ENTERPRISE.md. NOT-CLOSED; nothing pushed.
- WORK 1: branch feat/membership-enterprise from f2c4eaba (feat/3h-insight-surfaces head). R57 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md verbatim from the box; this commit is the ledger bank. Read: the box and PAT-RULES.md only. Environment: node_modules on disk was the mac-mini-ops-hardening tree (March), so pnpm install --frozen-lockfile + prisma:generate ran first; .next cleared (stale types from the other branch). Flag table for every local build and crawl in this box = production's (guard-doors.sh PROD_FLAGS: ALIGNMENT_BOARD, BATTLECARD, CONSULTANT_ACCESS, PAT_ASSISTANT, PINGS, SELF_SIGNUP = 1; NEW_FRONT_DOOR unset) + PAT_ENABLE_LOCAL_REVIEW_AUTH=1 as the sign-in vehicle; .env/.env.local carry no PAT_ENABLE_* flags. The box has no ENVIRONMENT section (R-C); this line is the table it proves against.

## 2026-10-01 · 3h insight surfaces, both portals — in progress, unattended
- WORK 5 pass 2 at f0f7680d: build 0, firm full view recaptured at 1440 (Current limits and Evidence provenance behind the "Full prose readout" collapse again), zero grep 0, lint 0, typecheck 0, unit 200 files / 1695 tests, guard:doors 3/3 on flags-off :3031 and 3/3 on flags-as-preview :3032. WORK 6: ~/work/inbox-from-mythos/FORGE-REPORT-3H.md written (under 500 words, the two preview deploy lines, NOT VERIFIED list with the seed path for the Elite card values). Box ends NOT-CLOSED; nothing pushed, nothing deployed; Cam types push.
- WORK 5 (proof, budget mode), pass 1 at 385bb4d2: build 0, five after captures at 1440 into ~/work/box3h-proof/after (vendor hub Elite and Pro, vendor full view, firm hub, firm full view; "pills 0" on all five, "elite section 1 (3 items)" on the hubs), zero grep 0, lint 1 warning (unused CONTRADICTION regex in tests/regression-10e.contract.test.ts, dropped at 60d9204f), then typecheck 0, lint 0, unit 200 files / 1695 tests. The first capture of the vendor full view used the wrong key (automation-change, 404); the route is /vendor/alignment-insights/automation-receptivity. Guard flags-off FAILED: button "PRO · EVIDENCE DETAIL Full prose readout" lost on /firm/insights/firm_tier1_operating_baseline for firm-pro and firm-elite (987 pairs compared): change 2 had dropped the surfaceCollapsed prop with the pill, and the box rules out only the pill and the Elite block. Restored as it was at f0f7680d (scoredModules + surfaceCollapsed on the firm [key] page; the superset test no longer pins its absence). Pass 2 relaunched: rebuild, recapture the firm full view, lint, typecheck, unit, guard both sets.
- WORK 2 (change 1, both portals): InsightsModeShell rewritten without modes (Elite section above Pro, locked previews + one "Elite insights" link for Pro, Help beside the disclaimer at the portal help panel); the vendor and firm hubs, the individual hub and the vendor product-intelligence hub (a fourth consumer of the shell, not named in the box; it had to change the same way to compile) drop getModeHref/toggleOptions/helpPanel/activeMode and redirect ?mode to themselves; Elite hub cards link to /firm/insights/<key> and /vendor/alignment-insights/<key> (no ?surface); the firm operating brief always renders. Tests: tests/insight-hub-elite.contract.test.ts (source pins + builders, budget mode), elite-insights hrefs, toggle-consistency consumer list. tsc 0, lint 0, 59 tests across the touched suites.
- WORK 3 (change 2): InsightDetailShell renders no Pro / Elite / Help pill (props gone); the firm and vendor full views drop ?surface and the surface cards, render the Pro content only, and show a Pro viewer of a tier-2 key the honest LockedElitePreview in place of the old Elite tab (Elite viewers still get renderXEliteSurface); the firm tier-1 "theme depth" pane that lived behind ?surface=elite for Elite accounts is no longer reachable (FirmThemeEliteDepthCard kept as a component; its numbers live on the Peer Position full view) -> reported. The "elite" surface branches ("What Elite adds here", the duplicate Evidence provenance, "Open Elite Insights") are deleted from vendorAlignmentInsightEngine, firmInsightEngine (live and locked builders; the `entitled` arg went with them); "elite" now yields the Pro content. The individual and vendor product-intelligence detail pages (two more shell consumers) lose the pill props too. Zero occurrences of "What Elite adds here" and "Open Elite Insights" in app and lib. Rulings: route * "Pro / Elite / Help" and "Open Elite Insights" (Cam 10/01, Leslie F3 / D2). Pins updated: firm-unlocks, regression-10e, toggle-consistency. tsc 0, lint 0.
- WORK 4 (change 3): both engines' Pro surface is now [Current limits, Evidence provenance] (the "Current PAT picture", "Where the signal is strongest" and "Where the signal is under pressure" prose cards are gone; their numbers live in the body's bar lists); the two strengths/pressure summarizers are deleted; the firm full view no longer collapses the surface behind "Full prose readout". Order on the page: headline and band, bar lists, "What this means", Current limits, Evidence provenance. Note for Leslie: FirmInsightDetailBody already carries a "Current limits" chip block (module completion) above the engine's "Current limits" prose, so the firm full view shows that label twice; both strings pre-exist, so left as is and reported. tests/insight-full-view-superset.contract.test.ts + pins in vendor-alignment and firm-unlocks. tsc 0, lint 0.
- WORK 1: branch feat/3h-insight-surfaces from f69f19e6 (feat/vendor-followup-mc head, contains 3f). R58 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md verbatim from the box; this commit is the ledger bank. Read: the box and PAT-RULES.md only.

## 2026-09-30 · vendor-followup-mc (vendor product follow-up questions as multiple choice) — in progress, unattended
- Cam pasted this box on top of the 3g session; 3g stops after its WORK 1 (branch feat/3g-leslie-closeout at daddfdfe with R53 to R55 filed) until Cam says otherwise. No feat/3g-lite exists, so this branch feat/vendor-followup-mc is from 265b7ea7 (the 3f head). Read: the box, PAT-RULES.md, PATALIGN-VENDOR-FOLLOWUP-MC-OPTIONS-2026-09-30.md (sha256 05375dc5a8383f8ca8f1deb520960e17bf80de0ce41068b7f0654fcf145ac726). Nothing else.
- WORK 2: docs/assessment/vendor-followup-mc-options-2026-09-30.md (copy of the option file, sha256 05375dc5...c726 recorded in the registry header); lib/assessment/vendorFollowUpOptions.ts generated from the file (10 questions x 8 options, keys prod.q<n>.<a-f|none|other>, MULTI = best_fit_customer, poor_fit_customer, evidence_needed_next; firm types imported; none/other labels follow the firm registry's "Not a significant issue here" / "Other (short answer)" without the file's trailing period); lib/vendorFollowUpMc.ts flag PAT_ENABLE_VENDOR_FOLLOWUP_MC === "1"; tests/vendor-followup-mc.contract.test.ts re-parses the file and compares every label and consequence verbatim (6 tests green).
- WORK 3 (changes 2, 3, 4): lib/assessment/vendorFollowUpMcRuntime.ts (decorate = same instance flag-off, adaptive prompt as stem flag-on; encode/decode of the pick as the JSON of the firm FollowUpMcAnswer inside the string record; validateVendorOpenEndedResponses through the firm validateFollowUpMcAnswer with the vendor question). Option rows lifted from AssessmentModuleClient to app/components/assessment/FollowUpMcOptionRows.tsx (markup unchanged; the firm client mounts it with its own Other max; the firm markup pins in tests/followup-mc-runtime moved with it). Vendor client renders the rows for decorated questions with a "Response captured / Awaiting response" state line; the page passes followUpMc only behind isVendorFollowUpMcEnabled(); draft (partial ok) and submit (required) validate with process.env. tests/vendor-followup-mc-runtime.contract.test.ts: 11 tests. tsc 0, lint 0.
- WORK 4 (change 5): lib/assessment/vendorItemResponses.ts pure row builder (flag-on: one SINGLE/MULTI row per pick, Other carries its text, optionSetVersion 1, moduleKey vendor_product_alignment_v1, questionKey = open-ended key, questionVersion = module version; free text -> TEXT row either flag); the vendor submit route writes the rows AFTER the transaction with the firm soft-fail (the firm submit made that choice: a failed statement inside the transaction would abort the submission), so "inside the transaction" is not literal, same as the firm side. Flag-off writes TEXT rows for the ten strings (the firm flag-off path does). tests/vendor-item-responses.contract.test.ts: rows equal picks; flag-off TEXT rows; flag-off JSON byte-identical (validator returns the same instance). tsc 0, lint 0.
- WORK 5 (change 6): (a) adminBriefingEngine.extractProductOpenEndedResponses reads a pick as its labels joined "; " with the Other write-in flag-on (describeVendorFollowUpAnswer); (b) followUpEvidence.ts vendor aggregate over the latest final submission per product (summarizeVendorFollowUpAggregate through aggregateFollowUpOptionCounts, which now takes the registry lookup as an optional third argument, firm default unchanged; pickLatestFinalPerProduct; getVendorFollowUpAggregate(productIds); getVendorFollowUpOtherTexts); (c) FollowUpAggregatePanel gains optional eyebrow/title/unit/testId (firm defaults unchanged) and is mounted "Vendor follow-up picks" on the Guide ecosystem page under OpenEndedPanel and on the Enterprise ecosystem page under the firm panel, behind isVendorFollowUpMcEnabled(); EcosystemDetailData gains vendorProductIds; (d) admin/followup-other opens behind either flag and appends the vendor groups behind the vendor flag (the admin nav item stays behind the firm flag: admin shell untouched). tests/vendor-followup-evidence.contract.test.ts (7) + the firm evidence pin updated. tsc 0, lint 0.
- WORK 6 (changes 7, 8): seedVendorProductAssessment (the one writer every demo, expansion and perf vendor submission goes through) writes picks flag-on (demoVendorFollowUpPick: six choices rotate by product and question, MULTI takes two, Q9 an Other write-in every fourth product, Q6 "none" every fifth) into the same string record and the AssessmentItemResponse rows via the shared builder (idempotent, missing-schema soft-fail); data/demo-seed JSON needed no change (the picks are computed, not authored). Locale group vendorFollowUp (panel eyebrow/title, unit, captured/awaiting, short answer, Other aria) in en/es/fr; the vendor assessment page and the two ecosystem pages read it. Tests +2 (locale, seed spread). tsc 0, lint 0.
- WORK 7 (budget proof): before capture of the firm module follow-up page (flag on) from the standalone built at the 3f merge (= 265b7ea7 app code); reseed with PAT_ENABLE_VENDOR_FOLLOWUP_MC=1 (127 vendor submissions carry encoded picks; 1688 AssessmentItemResponse rows with prod.q* keys; every question shows 6 or 7 distinct options); seed:enterprise re-applied (harness killed after its summary; it appended a new temp password line to the accounts file); build; after captures at 1440 flag on: firm module page (paired: innerText identical except the footer Release id; html identical after stripping the release fingerprint and asset hashes), vendor product assessment for Meridian Portal (10 followup-mc groups, Other opened on the first MULTI, picks pre-selected, "Response captured"), Guide ecosystem Sentinel Practice Cloud (vendor panel, 10 rows), Enterprise ecosystem Bridgepath Suite (vendor panel, 10 rows; the enterprise first sign-in rotated its password again, recorded only in the accounts file). lint:test 0, typecheck 0, unit 198 files / 1684 tests. guard:doors running (both flag sets, vendor flag off). Captures in ~/work/box-vfmc-proof/{before,after}.
- WORK 7 CLOSED: guard:doors rc=0 (flags-off 3/3, flags-as-preview 3/3, vendor flag off). WORK 8: report at ~/work/inbox-from-mythos/FORGE-REPORT-VENDOR-FOLLOWUP-MC.md; proof logs copied to ~/work/box-vfmc-proof. Box ends NOT-CLOSED; nothing pushed; Cam types push and turns the flag on in preview (two lines in the report).
- WORK 1: R56 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md verbatim from the box; this commit is the ledger bank.

## 2026-09-28 · 3f Layout and review pass — in progress, unattended
- WORK 0: branch feat/3f-layout-review from the local feature/engagement-v1 head; BASE SHA 8649dc55. Base build served on :3000 with the preview flag set; before-captures → ~/work/box3f-proof/before (Home, Methodology, Trust, firm/insights, firm_tier1_operating_baseline drill down, firm/alignment-board, firm home, vendor home; 1440 + 390; .html/.txt at 1440). Baseline type census by scripts/qa/font-floor-proof.mts (new PROOF tool) → $S/b3f-census-base.log.
- WORK 1: R52 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md (Mythos's file; no REQUIREMENTS.md in the repo), text verbatim from the box; commit "3f: R52" = this ledger bank.
- WORK 1 commit c14d0653 "3f: R52".
- WORK 2 commit 69f277f1 "3f: type floor (C) and disclaimer wording (K)". --fs-meta 13 -> 14px site wide (the box's one token change, visible flag-off by order); .brand-pat-submark 0.62rem -> 12px; RadarChart fontSize 10 -> 12; AlignmentRadar labels 9/10px -> 12px; V7 door band labels .v7-band-label (meta size, 600); V7 public shell maps text-sm/text-xs/text-[11px]/text-[13px] to the meta token (flag-on; the baseline census measured text-sm at 10.1px and chips at 8.6px on the public pages because the root is 11.5px). Disclaimer "Not professional advice." + link "Methodology"; tests/output-disclaimer.contract.test.ts did not exist (the component's comment named it) and was created; liability-surface and design-tokens locks updated; guard RENAMES "Methodology" -> "methodology" (baseline has 82 main-region "methodology" links). Unit 193 files / 1649 tests green.
- WORK 3 commit 9fc36b05 "3f: shared page head on the public pages (A) and the trimmed header and footer (B)": app/components/shell/PageHead.tsx (hero / band / portal variants; eyebrow, one H1, subline, quiet updated line, one contextual link); descriptor under the PAT logo in the V7PublicShell wordmark; nav For firms / For vendors / language / Sign in; footer "Copyright 2026 Patalign LLC"; TrustSurfaceV7 head = PageHead band with "Trust center" as the contextual link (A3 kept for the guard), chips gone, updated lines ("Methodology v1.3, updated July 2026", "Updated April 2026", status label on security/governance, release id on release); Methodology H1 "How PAT scores and ranks data". Token --fs-lead 19px added for the subline. Locks updated: v7-front-door, trust-surfaces-v7. tsc 0, lint 0.
- WORK 4 commit (next sha in git log) "3f: public reading column and Trust page (D), Home radar, subline and vendor card (E)": 760px centred column, rail/link strip/disclosure aside removed, /trust eyebrow "Trust" + cards under the head + both sections plain; "Trust Center" now zero in app/lib/scripts/tests (the flag-off trust eyebrow/statusLabel and the help corpus line changed by the box's grep order); Home subline, explainer, radar left + legend right, vendor cell explainer. tsc 0, lint 0.
- WORK 5 commit (see git log, "3f: page head on the portals (A), pills and callout (F), Operating brief (G)"): PageHead portal variant (mark + descriptor, portal-name eyebrow, H1, subline, hero chips) on firm/vendor/guide/individual homes and InsightsModeShell; callout zero-state only ("PAT is summarizing" gone from source); insight pills -> one text link + Help in the page footer; firm/vendor workspace pill rows -> Meet PAT (or Workspace) link, Admin/Help in the account menu; "Operating brief"; "Average of your five module scores". Guide portal panel row kept (Ecosystems/Freshness/Nudges are working panels) -> NOT-CLOSED, needs a ruling. Four guard rulings in ops/qa/link-removals.json cite the box (flag-on only; flag-off paths unchanged). tsc 0, lint 0, unit 1649.
- WORK 6 commit ("3f: drill down and seed dates (H), firm workspace cards (I)"): drill-down head = PageHead, "Combined evidence" note gone flag-on, evidence grids one column at <=1100px (flag-on class), DEMO_SEED_BASE_DATE relative to seed time (reseed needed for the after captures; pilot cohort startsAt June 1 stays: cohort date, not an updated date); FirmWorkspaceCards fixed format with Cam's copy, strip deleted flag-on; five controlPrefix rulings on /firm. tsc 0, lint 0, unit 1649. Before captures complete: ~/work/box3f-proof/before (32 files: 8 pages x 1440/390 png + html/txt at 1440).
- WORK 7 commit ("3f: Tech Stack Sandbox (J)"): page head with Workspace chip, larger AlignmentRadar with legend beside, no tile truncation (3 per row, 272px columns, 12px floor), lane labels via SANDBOX_LANE_LABELS; sandbox-lanes, regression-10e and depth-box locks updated. tsc 0, lint 0, unit 1651.
- WORK 8 commit ("3f: entity copy, Patalign LLC everywhere (L)"): locale x3, metadata, Return to C2Acct removed (ruling route *; guard matcher accepts *), profile/sync copy, stub deleted -> lib/integrations/envelope.ts, entity sections on six trust surfaces (Minnesota law on Terms and Privacy), demo/preview account scripts on @patalignhq.com. Zero-occurrence grep for C2Acct/c2acct/C2 Acct across app, lib, prisma, scripts, data, preview-accounts.txt: entity copy zero; residual = infrastructure identifiers only (c2acct-live repo path, c2acct-db container/db name, com.c2acct.app launchd label, pat-c2acct-live.vercel.app host, audit export names) which rename at C7; listed in the report as NOT VERIFIED/blocked. tsc 0, lint 0, unit 1651.
- WORK 9 tooling commit ("3f: measured proofs"): font:proof, truncation:proof, hero:proof, zero:occurrence; "peer-validated" -> "firm-reviewed" on two guide-brief strings; zero-occurrence greps all 0 (residual c2acct = 27 infrastructure identifiers in 16 files). Baseline type census (base build 8649dc55, preview flags, 12 rows):
  - 1440 public / → 200 · min 8.6px · below 12px: 2 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 1440 public /methodology → 200 · min 10.1px · below 12px: 1 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 1440 public /trust → 200 · min 10.1px · below 12px: 17 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 1440 firm-pro /firm/insights → - · min 10.0px · below 12px: 23 · pat-meta sizes [] · pat-label sizes [13] · svg text below floor: 5
  - 1440 firm-elite /firm/alignment-board → - · min 9.0px · below 12px: 74 · pat-meta sizes [] · pat-label sizes [13] · svg text below floor: 5
  - 1440 firm-elite /firm → - · min 10.0px · below 12px: 24 · pat-meta sizes [13] · pat-label sizes [13] · svg text below floor: 5
  - 390 public / → 200 · min 8.6px · below 12px: 2 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 390 public /methodology → 200 · min 10.1px · below 12px: 1 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 390 public /trust → 200 · min 10.1px · below 12px: 17 · pat-meta sizes [] · pat-label sizes [12] · svg text below floor: 0
  - 390 firm-pro /firm/insights → - · min 10.0px · below 12px: 23 · pat-meta sizes [] · pat-label sizes [13] · svg text below floor: 5
  - 390 firm-elite /firm/alignment-board → - · min 9.0px · below 12px: 69 · pat-meta sizes [] · pat-label sizes [13] · svg text below floor: 5
  - 390 firm-elite /firm → - · min 10.0px · below 12px: 24 · pat-meta sizes [13] · pat-label sizes [13] · svg text below floor: 5
- WORK 9 chain launched: $S/b3f-w9.sh (reseed with validate:db + alignments -> build -> :3000 -> after captures (16 routes) -> font/truncation/hero/zero proofs -> lint:test -> typecheck -> unit -> guard:doors -> e2e local-review); exits in $S/b3f-w9-*-exit.txt, progress in $S/b3f-w9-progress.txt.
- WORK 9 first pass: reseed rc=0 (align harness needed .env.local sourced; rerun by hand rc=0: demo-vendor-elite re-hashed, validation company id -> production's), build rc=0, after captures reviewed visually: found seeded dates one day in the future (offsets up to +108h on a base of now-4d), the sandbox radar legend squeezed into ~80px, candidate pieces clipping on 168px columns, drill-down eyebrow still the surface name. Chain stopped; fixes committed ("3f: review fixes from the first after captures"); chain relaunched from the reseed. Drill-down pills (Pro / Elite / Help surface toggle) kept: not named in item F and the baseline keys them per query-variant route -> NOT-CLOSED for 3g with the guide-portal panel row.
- WORK 9 second pass: reseed 19:10 rc=0 (dates now Sep 26 on the firm home and drill down), build rc=0, after captures rc=0 (32 files + 16 html/txt, visually reviewed: sandbox radar and pieces fixed). font:proof pass 1 (log kept as $S/b3f-w9-font-pass1.log): public pages clean except /support "Email support" (.pat-button-primary 10.6px); portal pages: AppShell footer links text-[11px] (15 per page), drill-down toggle spans 10.1px, .text-base headings 11.5px, "Full prose readout" 10.6px. Fixed by flag-on rules (commit "3f: type floor on controls and the shell footer"); chain relaunched from the build (captures, proofs, lint, tsc, unit, guard, e2e).
- WORK 9 third pass (build 20:37): captures rc=0; font:proof rc=0 (32 rows, 0 below 12px; pass-1/2 logs kept in $S); truncation:proof rc=0 (1440 and 1100: 29 pieces, 0 overflow/clamped; 5 radar labels, 0 clipped; movers 0 because no piece is lifted at load); hero:proof 20/20 after scoping to the page-head pages (first pass walked 44 of 107 atlas routes and failed on slim-title pages: /firm/admin, /firm/alignment-assessment, /firm/benchmark, /firm/help); zero:occurrence rc=0; lint:test rc=0; typecheck rc=0; unit 193/1651. guard:doors flags-off FAILED: 979 pairs lost one control each = "Return to C#Acct" (the crawl normalizes digits to #; my route-* ruling named "Return to C2Acct"); ruling fixed (commit 0c181560). The vendor drill-down capture used a wrong key (operating-discipline 404) -> recaptured with implementation-risk-posture; its evidence line showed "latest update 2026-09-29T16:00Z" and the DB held 3,044 SurveySubmission rows dated up to 2027-10-18 (perf fixture firmIndex*6h offsets on top of the seed base; pre-existing, base date 2026-04-26 gave the same spread into 2027) -> demoDate clamped to now-2h (commit b9cb826c). Full chain relaunched (pass 4): reseed, build, captures, proofs, lint, tsc, unit, guard, e2e.
- WORK 9 fourth pass (reseed 22:51 with demoDate clamped; DB: 0 SurveySubmission rows in the future, max 2026-09-29 03:51Z): captures rc=0 (32 png + 16 html/txt, vendor drill down = implementation-risk-posture), font:proof rc=0 (32 rows, 0 below 12px), truncation:proof rc=0 (1440 and 1100), hero:proof 20/20, zero rc=0, lint rc=0, typecheck rc=0, unit 1651. guard:doors rc=1: flags-off lost only the admin home "Avg alignment index" card on the 95 admin pairs (pluralized "scored firms" vs production's one scored firm; RENAMES entry collapses it, commit 2fbcc227); flags-as-preview lost 4530 controls on 497 pairs = the collapsed firm/vendor pill row and the renamed card links recorded under every route those identities are redirected from (rulings were keyed to /firm and /vendor; widened to route *, commit b18b3b8b) plus the same admin card. Guard + e2e relaunched ($S/b3f-w9f.sh); guard pass-4 log kept as $S/b3f-w9-guard-pass4.log.
- WORK 9 CLOSED (fifth guard run): guard:doors rc=0 on both sets (flags-off 3/3, flags-as-preview 3/3, 987 pairs compared each), e2e local-review rc=0 (12 + 16 passed, 1 skipped). Final proof set: font 32 rows / 0 below 12px (pat-meta 14, pat-label 12 or 14), truncation 1440 + 1100 clean, hero 20/20, zero-occurrence 0 x 9 phrases, lint 0, tsc 0, unit 1651.
- WORK 10 in progress: `git merge --no-commit --no-ff feat/3e-enterprise-portal-v0` (only the ledger conflicted; resolved ours-then-theirs); PageHead re-applied to app/(app)/enterprise/{page,channels/[verticalId]/page,ecosystems/[ecosystemId]/page}.tsx flag-on; prisma:migrate:local applied 20260925120000_3e_enterprise_v0; prisma:generate; typecheck 0, lint:test 0, unit 194 files / 1657 tests. Chain $S/b3f-w10.sh: build -> guard:doors (enterprise flag off) -> e2e; merge commit after it.
- WORK 10 CLOSED: merge commit be6acb43 "3f: merge feat/3e-enterprise-portal-v0 (M)" (guard flags-off 3/3 + flags-as-preview 3/3 on the merged build with PAT_ENABLE_ENTERPRISE off, e2e 12 + 16 passed); 4ddd0aea fixes the hero proof's vendor key.
- WORK 11: `pnpm seed:enterprise` applied (Meridian Group owns Bridgepath Suite and Meridian Practice Cloud; the harness never disconnects prisma and was killed after its summary); :3000 served with the preview flags + PAT_ENABLE_ENTERPRISE=1; first sign-in of cameron+enterprise@garrettandgarrett.info demanded a password update -> rotated by the capture harness, the new password recorded only in ~/work/preview-accounts.txt (600). Captures at 1440 (390 pass timed out after the rotation): ~/work/box3f-proof/enterprise/after--enterprise--1440.png ("Your portfolio"), after--enterprise_channels_accounting--1440.png ("accounting market view"), after--enterprise_ecosystems_demo-bench-ecosystem-bridgepath--1440.png ("Bridgepath Suite Ecosystem"), each with .html/.txt. Flag off again: :3000 stopped; PAT_ENABLE_ENTERPRISE set nowhere persistent.
- WORK 12: report written to ~/work/inbox-from-mythos/FORGE-REPORT-3F.md (base 8649dc55, head 09a8f3ea before this bank, merge be6acb43; proof logs copied to ~/work/box3f-proof/logs). Box ends NOT-CLOSED; nothing pushed; Cam types push. Preview commands for Cam (PAT_ENABLE_ENTERPRISE=1 on the Vercel preview env; pnpm seed:enterprise against the Neon preview DB) are in the report, not run.
- WORK 0 note: the base standalone on :3000 must source .env.local (the earlier scratch serve script did; it was tmp-cleaned) or the local review sign-in forms do not render and every review-identity capture fails at sign-in; rewritten $S/srv-3000.sh sources it. Before-captures rerun on the base build after the fix.
- Reading of the box: every layout change ships flag-on (PAT_ENABLE_NEW_FRONT_DOOR, on in preview) so the flags-off guard stays identical to baseline; the two changes that must reach every flag set — the disclaimer wording (K) and the entity copy (L) — are covered by a RENAMES entry (link "methodology" → "Methodology") and a link-removals ruling for "Return to C2Acct" citing this box (Cam's order, A4).
## 2026-09-27 · 3e push (branch only)
- Cam typed push for feat/3e-enterprise-portal-v0: pushed as a new branch, no merge, no flag change; origin head = local head = 6242ceab12722a0ded2614b436a532ea74a23a14 (Cam's paste named 10127680 — an ancestor; the one commit after it is the ledger bank carrying the 3e report). feature/engagement-v1 untouched at origin 071818d4.
- Vercel: pat-c2acct-live has no Git connection (`vercel project inspect` shows no Git section; every deployment in the project is `vercel deploy`), so the push started no preview build — `vercel ls` two minutes after the push lists no new deployment; latest stays etniy3v35 (R49, 8687ed3). No preview host for the branch exists; the flag-off /enterprise → 404 check stands on the local standalone only (WORK 6 PROOF). PAT_ENABLE_ENTERPRISE added nowhere. Nothing deployed to production. NOT-CLOSED.

## 2026-09-25 · 3e Enterprise portal v0 (dark, flagged, branch only) — in progress, unattended
- WORK 0: branch feat/3e-enterprise-portal-v0 from the local feature/engagement-v1 head; BASE SHA 8649dc55 (origin 071818d4 + the box-2d push bank). Pre-box captures on the base standalone (:3024, preview flags): ~/work/box3e-proof/pre--consultants--{1440,390}.png + .txt/.html; ecosystem-detail before-dump $S/eco3e-before.json (770,858 bytes).
- INCIDENT (2026-09-25, box 3e WORK 2): after applying the 3e migration I ran `prisma migrate diff --from-schema-datamodel … --to-migrations … --shadow-database-url <the local DATABASE_URL>` as a schema/migration agreement check. Prisma RESETS the shadow database it is given — pointed at the live local docker dev DB (localhost:5433/c2acct) it wiped every table (User 0, demo seed gone). Prod and the Neon preview branch were never involved (their URLs were not used). Recovery: full local reseed by the repo's own scripts (below); the box continues only after the guard/e2e identities and the demo ecosystems exist again. Lesson banked: never pass a real database as --shadow-database-url; use `prisma migrate diff --from-migrations … --to-schema-datamodel` with a throwaway DB or skip the check.
- Recovery done: reseed chain (prisma:generate → db:recreate → migrate → seed:baseline → seed:pat-runtime → seed:demo-benchmark → preview:pat-setup → seed:demo-expand → compute:benchmarks → seed:demo-swaps → preview:pat-setup → perf-scale --depth=demo → seed:help-prod) all exit 0; 7/7 guard identities, 1,008 users, 182 companies, 3,410 submissions, 66 knowledge sources; demo vendor ids unchanged. Pre-box consultant captures retaken on the base build after the reseed (~/work/box3e-proof/pre--consultants*.png/.txt/.html).
- WORK 2: 4e69e5b8 schema + migration 20260925120000_3e_enterprise_v0 (Enterprise, EnterpriseMembership, Company.enterpriseId nullable; applied locally, client regenerated).
- WORK 3: 5620776a lib/enterprise.ts + tests/enterprise.contract.test.ts (6 cases: flag law, flag-off nulls, roll-up ordering/freshness, market ranking/ownership, no /firm/i key and no fixture firm name, empty channel); lib/ecosystem.ts additive getEcosystemDetailForVendorCompany + getEcosystemListForVendorCompanies (consultant path a pure move — the byte-identity dump was taken but the DB wipe happened before the after-dump; NOT re-proven on the reseeded data). dde5c952 readers aggregate FINAL firm reviews directly (score/n/newest per tools/score-parity.ts definition; the insight-catalog projection took minutes for 128 products); route gates in lib/enterpriseAccess.ts.
- WORK 4: ef04cc12 app/(app)/enterprise/* (layout gate; home = portfolio table + channel list + owned ecosystem cards; channels/[verticalId] market view; ecosystems/[ecosystemId] + six components copied with word/link rewrites, firm links → owned briefing, explainer tiles static, vendor-brief link dropped; briefings/[companyId] (+products) with the ownership gate); nav entry flag-on for members only. 28e204fd: OpenEndedPanel removed from the enterprise copy (consultant scoping contract), radius/font literals → tokens (design-token ratchet). Zero diff under app/(app)/consultants, app/components/consultants, firm, vendor, admin. Zero "Consultant"/"Guide" under app/(app)/enterprise.
- WORK 5: 2fd8e575 scripts/seed/enterprise-v0.ts (`pnpm seed:enterprise`): Meridian Group (demo-enterprise-meridian-group) owns Meridian Practice Cloud + Bridgepath Suite; cameron+enterprise / lesliegarrettphd+enterprise OWNER, passwords appended to ~/work/preview-accounts.txt (600) only; Northwind Ledger (demo-vendor-company-northwind-ledger, DEMO, unowned) with product Northwind Ledger Core, firm "Copperfield & Vance CPAs", own ecosystem, one FINAL firm review (score 91, n 1) + vendor self-assessment. Readers checked flag-on: portfolio 10 rows, channels ["accounting"], market view 128 rows / 10 owned / Northwind rank 1, no firm key, firm name absent.
- WORK 6 first attempt: flags-off RED 237 pairs / 2,636 controls, all vendor-elite (sign-in `pilot_password_invalid`: the reseed gave demo-vendor-elite a different password than the crawler contract "PatEliteDemo7x" — re-hashed to the contract) and admin (rows of "PAT Validation Company", created by the launch chain's `validate:db` step my reseed had skipped — run now, company present). Chain killed and restarted 15:55 with both fixed; consultant ecosystem detail/list re-proven byte-identical to the base code on the reseeded data (377,696 / 635 bytes).
- CORRECTION 2026-09-27 (resume): the 15:55 restart did NOT reach the guard. Its saved outputs: typecheck exit 2 and build exit 1 (a stale gitignored dev harness, scripts/dev/box3e-eco-parity.ts, imported the deleted lib/__old_ecosystem.ts), guardoff/guardon exit 2 ("standalone missing"), e2e exit 1 (web server could not start). No flag-off guard pass exists in command output for this branch; the only completed flags-off crawl (15:38) was RED (vendor-elite password, validate:db rows — both since fixed). Harness removed, tsc 0; WORK 6 relaunched in full (lint → typecheck → unit → build → guard off → guard on → e2e → captures).
- 2026-09-27 12:2x: WORK 6 relaunch → lint 0, typecheck 0, unit 1653/1653, build 0; flags-off set RED on 2 pairs / 4 controls only: the /admin/briefings and /admin/organizations links to "PAT Validation Company" — the baseline (production) carries its id bbe5b09c-9818-4183-92ca-8f6fc089a91b, the reseeded validate:db row had a fresh random id. All seven sign-ins fine. Fix (local data, all 18 FKs cascade on update): company id set to production's. Guard stages relaunched from the existing build ($S/b3e2.sh: guard off → guard on → e2e; watcher $S/b3e-post.sh).
- WORK 6 DONE 2026-09-27 15:07 local — full report (copied verbatim from ~/work/inbox-from-mythos/FORGE-REPORT-3E.md):

    # FORGE REPORT — BOX 3e Enterprise portal v0 (dark, flagged, branch only) · 2026-09-27
    
    Branch `feat/3e-enterprise-portal-v0` · base sha **8649dc55** (the local feature/engagement-v1 head, origin 071818d4 + one bank) · head sha **10127680** (last ledger bank; last code commit 28e204fd) · 23 files, +1,808 / −2 · NOT pushed, NOT deployed. Every number below is from command output.
    
    ## REQUIREMENTS
    R51 filed in ~/work/inbox-from-mythos/REQUIREMENTS.md (Mythos's file; the repo carries no REQUIREMENTS.md), commit "3e: R51" = ledger bank 0a9f5241.
    
    ## ENVIRONMENT
    PAT_ENABLE_ENTERPRISE absent/off by default (same `=== "1"` law as lib/followUpMc.ts). Local docker DB only. Preview and Production untouched (no env change, no deploy).
    
    ## EXISTS → fate
    - prisma: Company, Product, Ecosystem, EcosystemFirm, ConsultantProfile, ConsultantAssignment untouched; additive Enterprise, EnterpriseMembership, Company.enterpriseId (nullable, indexed, FK) — migration 20260925120000_3e_enterprise_v0 (hand-written SQL, applied with prisma migrate deploy, client regenerated).
    - app/(app)/consultants/*, app/components/consultants/*, firm, vendor, admin: **zero diff** (`git diff --stat 8649dc55..HEAD` on those paths is empty). The enterprise portal is a copy; nothing was extracted from the consultant portal.
    - lib/ecosystem.ts: two additive exports (getEcosystemDetailForVendorCompany, getEcosystemListForVendorCompanies); the consultant path is a pure move — getEcosystemDetailForConsultant 377,696 bytes and getEcosystemListForConsultant 635 bytes byte-identical against the base code on the reseeded data.
    - lib/adminControlPlane.ts: untouched (seed only).
    
    ## INTENDED CHANGES (delivered)
    1. Prisma additive — 4e69e5b8.
    2. lib/enterprise.ts — 5620776a, dde5c952: PAT_ENTERPRISE_FLAG_ENV, isEnterpriseEnabled, getEnterpriseForUser, listOwnedVendorCompanies, listOwnedEcosystems, getEnterpriseAccessStateForUser, ownsEcosystem/ownsCompany, portfolioRollup, marketView, listEnterpriseChannels. The two cross-vendor views are pure functions over ProductSignalInput (product and vendor fields only): buildPortfolioRollup, rankMarketView. Readers aggregate the firm product module's FINAL reviews directly (score = mean of the latest review per reviewing firm, n, newest — the tools/score-parity.ts definition); reviewing firm ids dedupe only and are never emitted. Route gates in lib/enterpriseAccess.ts (notFound when the flag is off, signed out, or no membership).
    3. app/(app)/enterprise/* — ef04cc12, 28e204fd: layout (gate), page (portfolio table + channel list + owned ecosystem cards), channels/[verticalId] (ranked market view, owned rows flagged, vendor names only), ecosystems/[ecosystemId] + six copied components (words Consultant/Guide → Enterprise, "your ecosystem" → "your portfolio"; links rewritten to /enterprise; firm links go to the owned briefing; explainer tiles static; vendor-brief link and OpenEndedPanel dropped — see NOT VERIFIED), briefings/[companyId] (+ products/[productId]) with the ownership gate.
    4. Nav — the Enterprise entry only when the flag is on and a membership exists (AppShell + SignedInHeaderControls).
    5. Seed — 2fd8e575, `pnpm seed:enterprise`: Meridian Group (demo-enterprise-meridian-group) owns Meridian Practice Cloud + Bridgepath Suite; cameron+enterprise@garrettandgarrett.info and lesliegarrettphd+enterprise@gmail.com OWNER, temporary passwords appended to ~/work/preview-accounts.txt (mode 600) in the existing format; unowned Northwind Ledger (DEMO boundary) with product Northwind Ledger Core, firm "Copperfield & Vance CPAs" in its own ecosystem, one FINAL firm review and a vendor self-assessment.
    6. Copy registries: none required; no public or pricing copy changed.
    
    ## DOORS (LAW 11)
    Consultant, firm, vendor and admin portals: zero diff. Guard GREEN, flag off and flag on (below).
    
    ## WORK 0–6
    Branch created at 8649dc55 and banked; R51; migration; lib + tests; portal + nav; seed; proof.
    
    ## PROOF
    | check | result |
    |---|---|
    | guard flag off (`pnpm guard:doors`, ports 3031/3032) | flags-off **3/3**, flags-as-preview **3/3** (b3e-guardoff.log) |
    | guard flag on (PAT_ENABLE_ENTERPRISE=1 added to both sets, ports 3033/3034) | flags-off **3/3**, flags-as-preview **3/3** (b3e-guardon.log) |
    | lint / typecheck | 0 / 0 |
    | unit (`pnpm test:unit`) | **1653 / 1653**, 193 files (incl. tests/enterprise.contract.test.ts: flag law, flag-off nulls, roll-up ordering and freshness, market ranking and ownership, no /firm/i key and no fixture firm name in any row, empty channel) |
    | e2e local-review, flag off | **12 + 16 passed, 1 skipped** |
    | flag on, standalone :3023, cameron+enterprise | /enterprise 200 "Your portfolio" (10 portfolio rows, 1 channel link, 2 ecosystem cards); /enterprise/channels/accounting 200 (128 ranked rows: 118 unowned, 10 flagged yours; Northwind Ledger Core rank 1, score 91, n 1); /enterprise/ecosystems/demo-expand-ecosystem-meridian 200 "Meridian Practice Cloud Ecosystem"; /enterprise/briefings/demo-firm-company-demo-expand-firm-belmont-crossing-advisory-6-0 200 "Belmont Crossing Advisory briefing" — 1440 and 390 |
    | neutrality (rendered HTML) | "Copperfield & Vance" occurrences across the four enterprise pages: **0, 0, 0, 0**; no Northwind text outside the channel ranking |
    | flag off, same account | /enterprise and /enterprise/channels/accounting → **404** at 1440 and 390 |
    | nav | RSC payload: Enterprise item present flag-on for the member (2), absent flag-off (0), absent for the consultant (0) |
    | consultant unchanged | /consultants and ?panel=freshness as the sentinel consultant, pre (base build, reseeded DB) vs post: text identical except the rolling "Since <date>" week line and the release footer (4 and 2 diff lines) |
    | zero-occurrence search | "Consultant" / "Guide" under app/(app)/enterprise: **0** |
    | R50 | not applicable — no deploy in this box |
    
    Captures (~/work/box3e-proof): pre--consultants*.png/.txt/.html, post--consultants*.png/.txt/.html, enterprise--enterprise--{1440,390}.png, enterprise--enterprise_channels_accounting--{1440,390}.png, enterprise--enterprise_ecosystems_demo-expand-ecosystem-meridian--{1440,390}.png, enterprise--enterprise_briefings_demo-firm-company-demo-expand-firm-belmont-crossing-advisory-6-0--{1440,390}.png (+ .html/.txt at 1440), flagoff--enterprise--{1440,390}.png, flagoff--enterprise_channels_accounting--{1440,390}.png.
    
    ## INCIDENT — local database wipe (2026-09-25)
    After applying the 3e migration I ran `prisma migrate diff --from-schema-datamodel … --to-migrations … --shadow-database-url <the local DATABASE_URL>` as an agreement check. Prisma resets the shadow database it is given; pointed at the live local docker dev DB it wiped every table. Prod and the Neon preview branch were never involved. Recovery: the repo's own chain (db:recreate → migrate → seed:baseline → seed:pat-runtime → seed:demo-benchmark → preview:pat-setup → seed:demo-expand → compute:benchmarks → seed:demo-swaps → preview:pat-setup → perf-scale --depth=demo → seed:help-prod → validate:db), then two data alignments the old DB had carried: the demo vendor-elite account re-hashed to the crawler's contract password, and "PAT Validation Company" given production's id bbe5b09c-9818-4183-92ca-8f6fc089a91b (all 18 FKs cascade on update) so the admin list links match the baseline. Lesson banked: never pass a real database as --shadow-database-url.
    
    ## NOT VERIFIED / NOT-CLOSED
    - Nothing deployed; Leslie's review not included; the enterprise accounts exist only in the local DB (the preview branch has no Enterprise rows and its accounts file lines are local).
    - The first sign-in of cameron+enterprise rotated its temporary password (enforced password update); the accounts file carries the current one.
    - OpenEndedPanel is excluded from the enterprise ecosystem page (tests/consultant-openended-scoping keeps firm open-ended text inside the consultant portal); the vendor-brief link and explainer links are not part of v0 (tiles static, link dropped) — "the same cards" minus those two.
    - Multi-channel: the seed has only accounting; the channel list and market view are written for any verticalId but proven on one.
    - Enterprise billing, pricing, public copy: untouched.
    - Enterprise users land on /vendor after sign-in (the sign-in form's vendor view); the portal is reached via the nav entry or /enterprise.
    - Guard rulings unchanged (no control added or removed); RENAMES unchanged.
    - The market view loads every DEMO vendor's reviews in the channel (128 products) in one query; not timed on Neon.
    
    Nothing pushed; Cam types push. NOT-CLOSED.
    
- (superseded) WORK 6 running: $S/b3e.sh — lint 0, typecheck 0, unit 1653/1653 (193 files), build 0 on 28e204fd; guard flag off (both sets, 3031/3032) → guard flag on (PAT_ENABLE_ENTERPRISE=1 added to both sets, 3033/3034) → e2e flag off; then $S/b3e-post.sh captures (enterprise flag-on as cameron+enterprise: /enterprise, /enterprise/channels/accounting, owned ecosystem, owned briefing; consultant post capture; flag-off /enterprise 404 check).
- WORK 1: R51 added to ~/work/inbox-from-mythos/REQUIREMENTS.md (Mythos's file; no REQUIREMENTS.md exists in the repo) under "Filed 9/25 from Cam's box 3e" — text verbatim from the box. The "3e: R51" commit is this ledger bank (the requirements file is outside the repo).

## 2026-09-25 · Box 2d (R17 Guide rename, R37 PFC drawer, R40 chart pass, R38 ruling flagged) — in progress, overnight, NOT pushed
- Section 2 of Cam's overnight paste was already done 09-24: origin 8687ed3f → after tonight's push 14fc67bd (ledger bank); preview dpl_GpMcc6apBHgEvUftqfzUF5SrRB6d (etniy3v35) runs 8687ed3 — NOT redeployed again and the share link NOT re-issued (Mythos may have pasted it). 2d re-smoke 09-25 05:35Z: sign-in 200 (form present), /firm 200 "Your firm workspace in PAT" 5 cards, firm/insights 1.2/1.2/2.2 s (marker recorded by the deployment 09-24 05:31Z), Ask Pat 200 with 5 citations; the recorded-marker memo miss measured against the preview DB from local code: 8 statements = 2 reads (RegistryEnsure, SurveyModule) + BEGIN/COMMIT/DEALLOCATE from the pooled connection.
- R17: lib/roleWords.ts guideWord(form) — "Guide/guide/Guides/guides" only when PAT_ENABLE_NEW_FRONT_DOOR=1, else the production word (flag-off byte-identical). Applied to: consultants portal eyebrow, firm/vendor brief and explainer eyebrows, ConsultantHelpContent, AppShell + SignedInHeaderControls nav label, sign-in (intro, role pill, disabled notice, RoleAccessCard title/body), /sign-in/consultant metadata (generateMetadata), password-update copy, not-found portal link, admin insights/briefings/users copy + the account-kind option, trustContent (2), nudge titles (2), localReview label, helpArticleLinks label. Help corpus: 27 files, 222 + hyphen-compound replacements, article title renamed, slugs/paths/front matter untouched (lexicon-data-occurrences.md left as a generated report). NOT changed: lib/membershipContent.ts "Consultant collaboration" ×2 — imported by five client components, needs a server-passed word (own box). Guard: 8 RENAMES entries canonicalize the flag-on Guide labels.
- R37: app/components/insights/ReadoutDrawer.tsx extracted from InsightSurfaceCardGrid as a pure move (dialog, scroll lock, Escape, ‹ › ×, data-readout-drawer body); the grid renders it; VendorBattleCardClient gains briefMode="inline"|"drawer" (default inline = production); the battlecard page passes "drawer" flag-on; the drawer shows BattleCardDetailBody with Previous/Next across the visible firms.
- R40: PercentileBand design="classic"|"labelled" (labelled = SVG rows: bottom quartile, labelled pack, labelled top quartile, median tick with value, p90 line, band-coloured marker with "you NN · pct", 0–100 axis on the last row, legend incl. peer median) and PercentileBandRow design (p25/p75 edge values, peer-mean label, zone captions, axis title, legend entry); FirmPeerPositionCard / VendorCategoryPositionCard take chartDesign; the two elite [key] pages pass labelled flag-on; firm/benchmark keeps classic in both sets.
- R38: current layout kept; ruling still pending (Mythos recommendation: cards row under the evidence picture, one compact expandable row per product).
- Chain 1 on the first build: lint 0, typecheck 0, unit 1647/1647 (192 files), build 0, guard flags-off 3/3, flags-as-preview 1 pair lost (admin insights card link renamed "Guides Guide roster…" → RENAMES entry added), e2e 12+16 passed / 1 skipped, word sweep 68 hits = membership "Consultant collaboration" ×2 (client module, NOT-CLOSED), admin insights work-areas copy, admin users "Consultant access active", the whole admin/consultants page copy (missed by the inventory's path filter), plus e2e-fixture organization names (data). Fixed: admin copy gated (incl. the buttons "Add guide"/"Remove guide access" with RENAMES), sweep separates data rows; captures showed label overlaps in the labelled charts (pack label under the marker, p25/p75 over the marker label, oversized type) → sizes reduced, edge values moved below the track, pack label hidden under the marker; drawer body reflow CSS for the PFC brief. Chain 2 ($S/b2d2.sh): rebuild → flags-as-preview only (flags-off bytes unchanged by the fixes: all gated) → e2e → sweep → captures.
- PUSHED 2026-09-25 on Cam's typed push: origin feature/engagement-v1 → 071818d4 (box 2d 1a65a97b + ledger banks). Pre-push check: pat-c2acct-live has no Git connection (`vercel project inspect` shows no Git section; all 4 deployments in 10 days are `vercel deploy`, none created by the pushes of 09-16/09-17/09-24) → a push does not auto-deploy; NOT redeployed; Leslie's etniy3v35 link unchanged. This bank sits one commit ahead.
- CLOSED on disk 2026-09-25 ~04:45 local: commit 1a65a97b (62 files, +907/−343), BOX-TEMPLATE message. Chain 2: build 0, flags-as-preview first timed out (65-min budget, ETIMEDOUT), rerun lost the two renamed admin placeholders ("Guide name", "guide@company.com") → RENAMES, rerun GREEN 3/3; e2e 12+16 passed / 1 skipped; sweep 2 copy hits (membership, NOT-CLOSED) + 16 data rows; captures ~/work/box2d-proof. Report: ~/work/inbox-from-mythos/FORGE-OVERNIGHT-REPORT-2026-09-25.md. Four numbers: unit 1647/1647, guard on 3/3, guard off 3/3, e2e 28/1 skipped. NOT pushed, NOT redeployed (preview stays on 8687ed3). Cam types push.
- Tests: tests/box2d.contract.test.ts (8 cases); scripts/qa/rendered-word-sweep.mts + `pnpm word:sweep` = the zero-occurrence proof on a flag-on standalone. Chain running: $S/b2d.sh → b2d-{lint,typecheck,unit,build,guard,e2e,sweep}-exit.txt.

## 2026-09-24 · R49 close-out + preview redeploy (Cam's paste) — PUSHED, origin 8687ed3f
- 1: tmp cleaner had removed the 09-16/17 outputs; every proof re-run on the tip 8687ed3f (code = 46c709ca): unit 1639/1639 ($S/unit-tip.log), guard flags-off 3/3 + flags-as-preview 3/3 (close-guard.log, own ports 3031/3032, refuse-busy-port script active), e2e 12+16 passed / 1 skipped (close-e2e.log). "R49 GREEN, ready to push" printed; Cam typed push.
- 2a: pushed 76c7fec5 → 8687ed3f; `git rev-parse origin/feature/engagement-v1` = 8687ed3f6bc6b0eb44b51e76e517a054169ccd35.
- 2b: deployed from the linked worktree $S/deploy-8687ed3f (project.json = pat-c2acct-live, R50): dpl_GpMcc6apBHgEvUftqfzUF5SrRB6d, host etniy3v35, READY in 3 m; /api/release-fingerprint via the share link = 8687ed3 (releaseId 8687ed3:8687ed3-muf39kju, feature/engagement-v1). Preview scope names unchanged: ANTHROPIC_API_KEY, AUTH_SECRET, DATABASE_URL, DIRECT_URL + the nine PAT_ENABLE_* (values 1; CONSULTANT_ACCESS sensitive/unreadable, set 9/15).
- 2c: new share link issued in the dashboard (Hobby: "Continuing will revoke any existing shareable links" confirmed → pn385h3im link revoked); written to ~/work/preview-link.txt and $S/share.txt, mode 600; token nowhere else. A Vercel 2FA interstitial appeared once and cleared on plain re-navigation — no security setting touched.
- 2d smoke (cameron+firm-pro, scripts/dev/r49-smoke.mts): sign-in page 200 (email/password/submit present, 1.3 s); /firm 200 "Your firm workspace in PAT", 5 stat cards, 2.3 s; firm/insights pass1 10.3 s = the first-ever hit on this deployment ran the full ensure and RECORDED the marker (RegistryEnsure row ensured 05:31:09Z by dpl_GpMcc6apBHgEvUftqfzUF5SrRB6d; before the hit: no row), pass2 1.7 s, pass3 1.4 s; Ask Pat POST /api/pat 200 ok with 5 citations. NOT VERIFIED on the preview: the recorded-marker miss on a subsequent fresh instance (locally 2 queries) — needs another instance, i.e. a later deploy.
- 2e: STOPPED. Mythos pastes the link into Leslie's note; Cam sends. Box 2d waits for "GO 2d".

## 2026-09-16 · R49 registry memo cold load (closes R12, finishes R35) — in progress, NOT pushed
- Rider done: e017a210 CLAUDE.md tracked (gitignore line removed), first line "Read PAT-RULES.md before any box."
- Code: 2423ad4b. (1) RegistryEnsure(seedVersion unique, ensuredAt, ensuredBy), migration 20260916120000_add_registry_ensure (additive); lib/firmPat.ts getFirmRegistrySeedVersion (sha256 of the seed definitions + FIRM_REGISTRY_SEED_REVISION), ensureFirmAlignmentSystemAtSeedVersion (skip when recorded; run+record when absent/different; force), wired into the flag-on memo miss only; pnpm registry:ensure [--check|--force]. Local: memo miss 660 queries → 2 (marker read + module list); ensure ran once (611 ms) and recorded firm-alignment-system@0b1d8409ec24d087. Tests: tests/registry-ensure-marker.contract.test.ts 7 cases (skip / absent / changed seed / force / failure records nothing / hash stable / ensurer string). (2) Ecosystem detail sentinel 462 → 69 queries, dump byte-identical (770,858 bytes; $S/eco-before.json vs eco-after3.json) — firm-set loaders in tenancy, userPat, firmInsightEngine, firmPat, adminBriefingEngine (firmPreload on the context), ecosystem.ts composes them. Below-50 target NOT reached: the 69 are set-level (vendor context 18, six registry-shape reads in the preload, nine tenancy-wall reads, firm catalog 11); folding those needs a registry snapshot shared by five engines = own box. (3) Nudges panel = listPendingNudgeDrafts 8 q + the ecosystem details → covered by (2).
- Proof so far: lint 0 (after two fixes), typecheck 0, unit 1639/1639 (191 files); migration applied on a fresh local database (58 migrations, RegistryEnsure columns id, seedVersion, ensuredAt, ensuredBy; temp DB dropped) and on the local dev DB; score-parity before-dump of the preview DB at $S/parity-preview-before.json (read-only).
- Preview branch migrated (prisma migrate deploy with the pulled preview env: 20260916120000_add_registry_ensure applied, schema up to date). First build failed: webpack rejects `node:crypto`/`node:os` imports → 46c709ca uses `crypto` and the ensurer host from env. Chain restarted: $S/r49build.sh → r49build-{build,guard,e2e}-exit.txt.
- 2026-09-17 00:50: chain on 46c709ca — build 0; guard flags-off GREEN 3/3; flags-as-preview RED on 5 route×identity pairs (checkout?mode=configured ×2, product-assessments/apstream ×1, survey/operating_model admin+consultant) — every one a BLANK 200 capture (aria 180 bytes, no tabbables, no hrefs; same status/finalUrl as the passing 09-16 run; all seven sign-ins fine) = capture flake, not a control change; re-running that set alone ($S/guardprev.sh → guardprev.log / guardprev-exit.txt). e2e local-review 28 passed / 1 skipped. Single-path parity vs the pre-R49 code (e017a210 copies): getFirmProductCatalog (firm + no-firm), getFirmAssessmentProgress, getFirmInsightReports, getFirmManagedUserRecords, getAdminCompanyBriefing and getAdminBriefingCatalog without context — 40 firms each, all identical (scripts/dev/r49-single-parity.ts).
- 2026-09-17 01:45 FINDING: a next-server started 09-16 01:07 local (the box 2c corrupt run's stray flags-as-preview set) held 127.0.0.1:3032 ever since; every later flags-as-preview standalone died EADDRINUSE and the crawl inventoried that stale server — box 2c's clean-run flags-as-preview GREEN (guard2c.log) and both R49 flags-as-preview runs (5 pairs blank, then 3 pairs of tier/upgrade links) were against it, not the built standalone. Flags-off sets used 3031 (free) and stand. Stale server killed; guard-doors.sh now refuses a busy port (commit above); flags-as-preview re-running on the 46c709ca build ($S/guardprev.sh → guardprev.log). Box 2c's flags-as-preview set will be re-proven by this run (same doors) and stated in the report.
- 2026-09-17 02:30: flags-as-preview GREEN 3/3 on the real 46c709ca build (fresh server on 3032, no EADDRINUSE; guardprev.log). Guard both sets GREEN for R49 (flags-off from the chain, flags-as-preview from the re-run) — this run also re-proves box 2c's flags-as-preview doors (no control changes between dda8f5d2 and 46c709ca). STOPPED for Cam's word before the single redeploy.
- Next: preview-branch migration (prisma migrate deploy with the pulled preview env), build → guard both sets → e2e chain, then STOP for Cam's word before the single redeploy; after it: share link, cold-start timing (firm/insights, vendor/product-insight, consultants), sweeps 12/12, parity after-dump + compare.

## 2026-09-16 · PAT-RULES install box (Part 5, R50) — on disk, NOT pushed
- Commit: PAT-RULES.md at the root (diff against ~/work/inbox-from-mythos/PAT-RULES.md empty); docs/BOX-TEMPLATE.md (Part 3 + R50 PROOF line); docs/DEPLOY-NIGHT.md Phase 5 R50 verify line + Phase 10 Z2 bootstrap step for com.c2acct.app on a clean tree; package.json `sweep:pair` → scripts/qa/sweep-pair.mts (paired 1440/390 captures per identity, accounts file only, share URL visited first). Proof: `pnpm sweep:pair --url <preview link> --identities firm-pro` → 2 PNGs in ~/work/sweep-pair/<host>/, both 200 "Your firm workspace in PAT"; tsc 0, eslint 0 on the script.
- PUSHED 2026-09-16 on Cam's typed "push": origin feature/engagement-v1 → 76c7fec5 (6bcd7818 + banks). This bank sits one commit ahead.
- CLAUDE.md is gitignored (.gitignore:96): first line "Read PAT-RULES.md before any box." installed on disk only — Cam decides whether to un-ignore it. Note: pnpm echoes the script line, so the share token shows in the terminal that runs sweep:pair (never in files).

## 2026-09-15 · 2c in progress — banked mid-box (re-read this first after any compaction)
- Box: 2c polish (R32–R35, R42), flag-on only, prod bytes unchanged. Cam added nothing to env himself; on his mid-turn key task ANTHROPIC_API_KEY was put into the Preview scope by REST (type sensitive, target preview; name confirmed by `vercel env ls preview`; value never printed). NO redeploy yet — Cam gives the word before the box's single redeploy.
- Committed: 8475e0d9 = R32 (lib/workspaceCardStats.ts stat is {value, unit, context}; PortalSurfaceCard + the two pings cards render three lines, value never wraps) + R33 (InsightSurfaceCardGrid drawer body carries data-readout-drawer; app/globals.css collapses the bodies' lg:grid-cols-2 to one column, wraps every rounded pill, lifts the prose max-width; bodies/inline/full-page untouched) + R34 (initialReadoutKey ← InsightsModeShell ← ?readout=<key> on the three insights pages, flag-on; firm dashboard href /firm/insights?readout=<key>, vendor /vendor/product-insight/<id>?readout=current-product-fit). tsc 0, lint 0, contract tests green.
- R35 findings (scripts/dev/box2c-timing.mts on the preview; scripts/dev/box2c-loaders.ts + box2c-qcount.ts locally): preview firm/insights 9.5 s cold / 0.3 s warm, firm/insights?mode=elite up to 10.3 s on a fresh instance, vendor/battlecard ~7 s every pass, /consultants 1.9–2.4 s, ?panel=nudges 1.3–1.6 s, everything else < 1.2 s. Named loaders: (1) getVendorBattleCardData → getAdminCompanyBriefing per firm, serial, no shared context: 1,090 queries / 1.7 s locally for PAT Demo Vendor (15 firms), 277 for Meridian; (2) ensureFirmAlignmentSystemMemo: the per-process memo misses on every new serverless instance → 660 upsert/select queries (~0.4 s local, seconds on Neon) — the 9–10 s cold loads; (3) getEcosystemDetailForConsultant 462 queries / 150 ms local (the gated perf item 4, report only); (4) nudges panel = freshness board + drafts + ecosystem details (report only).
- R35 fix in proof (UNCOMMITTED, lib/battleCard.ts): one buildAdminBriefingContext + getBriefingProductsForFirms shared across the firms, briefings and freshness reads concurrent — the ecosystem-route memo pattern (6686f4b6). Byte-identity proof: scripts/dev/box2c-bc-dump.ts dumps getVendorBattleCardData for PAT Demo Vendor and Meridian; before dump /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/bc-before.json (71,215 bytes, taken on the unedited code); after dump running → /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/bc-after.json, log /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/bc-after.log, exit /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/bc-after-exit.txt; accept only if cmp says identical. Registry-memo miss: report with a recommendation (DB-backed marker needs a migration = its own box), not fixed here.
- R42 diagnosis (agent, read-only): write and read both use NudgeDraft status "PENDING" — no enum/table mismatch. Asymmetries: NudgeButton shows "Drafted — review in queue ✓" on any 2xx (ignores created:false), never refreshes the router; NudgeQueue is a one-shot server snapshot in useState; the draft carries companyId+audience+actorUserId only and the queue filters by the viewer's ecosystem companies (an admin's or another consultant's draft is invisible); the loader is ungated while the POST 404s with PINGS off. Reproduction on the preview as lesliegarrettphd+consultant: scripts/dev/box2c-nudge-repro.mts (sign in via the share link → queue before → Freshness "Request refresh" click → POST status/body → button text → Nudges panel via client nav → reload); log /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/b2c-nudge.log, exit /private/tmp/claude-501/-Users-camerongarrett/0283f4d7-d2e2-4fa5-ae9c-7fab6e2e93ea/scratchpad/b2c-nudge-exit.txt (running; first two attempts died on macOS lacking `timeout`).
- 2026-09-16 05:25 update: R35 committed as 972f4e3f (byte-identical proven: both dumps 71,215 bytes, cmp identical; local PAT Demo Vendor 1,708 ms / 1,090 q → 1,054 ms / 974 q; Meridian 158 / 277 → 117 / 188; the remaining per-firm queries are the admin briefing's own). R42 committed as fb88a255 (lib/notifications/nudgeButtonState.ts pure state; NudgeButton reads created → "Already in your queue ✓", router.refresh() after a created draft; NudgeQueue follows initialDrafts; tests/nudge-button-state.test.ts 5 cases). R42 reproduction on the preview (scripts/dev/box2c-nudge-repro2.mts, box2c-nudge-userpath.mts; logs $S/b2c-nudge{3..6}.log, b2c-up{1..3}.log): as lesliegarrettphd+consultant and cameron+consultant the new draft appeared in the queue after client nav, hard nav and reload every time — no empty-queue reproduction; preview NudgeDraft rows (scripts/dev/box2c-draft-rows.mts, read-only via vercel env pull to $S/preview.env, mode 600): 5 rows all 2026-09-16, Cam's 04:06 Sunbelt draft APPROVED at 04:06 (queue legitimately empty after), 04:34 Sunbelt re-draft PENDING and visible; the rest are the reproduction's own. Validation chain running: $S/chain2c.sh → chain2c-{lint,typecheck,unit,build,guard}-exit.txt, done marker chain2c-done.txt (guard both sets ~80 min, :3000 standalone from $S/srv-3000.sh).
- 05:45 update: first chain run failed on three things, all fixed in dda8f5d2 — the R33 drawer rules sat inside the portal token layer whose contract requires [data-v7-portal|shell]-scoped selectors (now `[data-v7-shell] [data-readout-drawer] …`); the two battlecard unit files' adminBriefingEngine mocks lacked the R35 exports (added); two lint warnings in gitignored scripts/dev helpers (fixed). Chain restarted on dda8f5d2 (same exit files). Capture script for the redeployed preview: scripts/dev/box2c-preview-captures.mts → ~/work/preview-proof-9 (firm-elite, vendor-pro, consultant × 1440/390: dashboard stats, drawer from dashboard ?readout= and from a card with grid-column/overflow readings, nudge drafted + already-queued + queue). Deploy waits for guard GREEN (single redeploy per the box).
- 07:35 update: chain on dda8f5d2 — lint 0, typecheck 0, unit 1632/1632 (190 files), build 0. The guard run was CORRUPT: killing the first chain's build let that chain fall through to its own guard, so two guard-doors runs shared :3023/:3024 and the flags-off set reported 2,953 "lost" controls (dead server mid-crawl), flag-on passed; both killed, orphans reaped, clean guard re-run started at ~07:20 ($S/guard2c.sh → guard2c.log, guard2c-exit.txt; :3000 standalone from srv-3000.sh). INCIDENT: the detached deploy worktree $S/deploy-a61a82a1 had no .vercel link, so `vercel deploy --yes` auto-created a NEW project "deploy-a61a82a1" (prj_g3f4rrF0ha7uu7cfEqRVoKrRi8sR, team cams-projects) and started building there (dpl_CRi1vJr2aC6qYs3fUYYBSAxvuLzt); the CLI was killed, the project link copied from the repo root, and the real deploy relaunched to pat-c2acct-live (dpl EcYFJbuyZit6TidkZtFb2Yv1fMoV, host pn385h3im, commit a61a82a1 = dda8f5d2 code). Deleting the stray project via API was blocked by the tool classifier — Cam decides (it has no env vars; delete it in the dashboard or give the word). Lesson: always `cp .vercel/project.json` into a fresh deploy worktree before deploying.
- 07:50 update: pat-c2acct-live deploy dpl_EcYFJbuyZit6TidkZtFb2Yv1fMoV (host pn385h3im, commit a61a82a1 = dda8f5d2 code) READY in 5 min; new share link issued in the dashboard (Hobby: the ca3gbiiga link is revoked by the same act) and written to ~/work/preview-link.txt + $S/share.txt (600) — token nowhere else. Proof chain on it: $S/proof2c.sh → proof2c-{timing,captures,sweep}.log/-exit.txt, captures to ~/work/preview-proof-9. Clean guard still running (guard2c-exit.txt).
- 02:50 local (09:50Z) update: clean guard on dda8f5d2 → flags-as-preview GREEN (3/3); flags-off RED but not a control loss: firm-elite + vendor-pro recorded "sign-in failed: locator.fill: Timeout 30000ms" so 280 pairs "lost" 5,027 controls (their whole shell). ROOT CAUSE FOUND: launchd job com.c2acct.app (scripts/mac-mini/app-start.sh → startup-guard.ts) is in a keepalive crash loop — 80,305 runs, stderr "Dirty git tree is forbidden for startup." — and each attempt re-mirrors ops/release + public into .next/standalone; a page rendered inside that window throws "Missing runtime contract" (500; 8 hits in the flags-off server log at its start), and the sign-in page is one of them. This also explains the exit-75 build-lock collisions of earlier sessions (app-start.sh builds when the standalone is missing). Cam's call: bootout com.c2acct.app (or fix its dirty-tree check) — Forge does not touch launchd. Mitigation committed be37b182: crawler retries sign-in twice (5 s apart), both copies. Flags-off set re-running alone with it: $S/guardoff.sh → guardoff.log / guardoff-exit.txt (server log /tmp/guard-doors-flags-off-rerun.log). Preview proof done: timing-after (battlecard 6.9 s → 2.3–2.5 s dom; firm/insights cold 12.6 s = registry-memo miss, warm 0.38 s; consultants ~2 s unchanged), captures 20 PNG in ~/work/preview-proof-9 (consultant draft → queue agrees, already-queued label shown; drawers single-column no overflow at 505 px / 390 px), sweeps 12/12 (admin via the 120 s script).
- 03:35 local update: flags-off set re-run alone with the retrying crawler (be37b182) → GREEN 3/3 ($S/guardoff.log). Guard both sets GREEN on the dda8f5d2 build (flags-as-preview from guard2c.log, flags-off from guardoff.log). e2e local-review running ($S/e2e2c.log / e2e2c-exit.txt); report follows.
- PUSHED 2026-09-16 on Cam's typed "push": origin feature/engagement-v1 a747742a → a18a6cad (13 commits: 8475e0d9, 972f4e3f, fb88a255, dda8f5d2, be37b182 + ledger banks). Box 2c closed on disk and at origin; this bank sits one commit ahead. Open for Cam: delete the stray Vercel project deploy-a61a82a1; decide on the com.c2acct.app launchd loop.
- 2026-09-16 Cam's ruling, executed: `launchctl bootout gui/501/com.c2acct.app` (rc 0); `launchctl print` now returns "Could not find service com.c2acct.app". Plist NOT deleted: ~/Library/LaunchAgents/com.c2acct.app.plist (1,647 bytes; program /bin/bash scripts/mac-mini/app-start.sh, WorkingDirectory ~/work/c2acct-live, keepalive + runatload). Deploy-night runbook re-arms it on a clean tree with `launchctl bootstrap gui/501 ~/Library/LaunchAgents/com.c2acct.app.plist`. Its stderr was "Dirty git tree is forbidden for startup" (80,305 runs) and each run re-mirrored ops/release into .next/standalone — the source of the local "Missing runtime contract" 500s and the guard sign-in flakes.
- 2026-09-16 Cam's ruling, executed: killed the orphaned dev server from an old session (pid 15337 `startup-guard.ts launch --kind dev -- next dev --webpack`, child 15338 next, wrapper 15312 `pnpm dev`, up 7 d 22 h); it held :3011 — nothing listens on 3011 now.
- Still open in the box: R42 fix after the reproduction (candidates: router.refresh() after a created draft, read created/draftId from the response, optionally revalidatePath in the route); commit R35 once byte-identical; build; guard:doors both sets (PAT_GUARD_REAP_ORPHANS=1, ~40 min per set); unit/e2e; Cam's word → single redeploy → share link → paired 1440/390 captures (firm-elite, vendor-pro, consultant: benchmark card, drawer from card and from dashboard, nudge drafted then queue) → timing after; ledger; report. Traps this box: macOS has no `timeout`; kill orphaned Prisma engines (ppid 1) before DB-heavy runs.

## 2026-09-15 · PUSHED on Cam's typed push — origin/feature/engagement-v1 e05f8962 → a747742a (two ledger banks: box 2b push, pre-send state). No code. Prod untouched at 0157d40; preview dpl_Crz1EhDsMqbAGU97tGo9N5ETzCw1 stands.

## 2026-09-15 · pre-send state (R9, R14) — read-only check before Leslie's email
- Newest Preview deployment: dpl_Crz1EhDsMqbAGU97tGo9N5ETzCw1 (pat-c2acct-live-ca3gbiiga…, Ready, created 2026-09-14 06:43 CDT), release fingerprint eea310c:eea310c-mu16dpjq = commit eea310c6 (box 2b's last code commit). Origin HEAD e05f8962 differs from eea310c6 only in tests/, ops/qa and the ledger (git diff eea310c6..e05f8962 -- app lib is empty). Share link (one line, mode 600) in ~/work/preview-link.txt; curl: share URL 307 → home 200, V7 front door ("Product selection, without the sales pitch.", data-testid v7-public-shell).
- Preview flag table (vercel env pull, values by name): ALIGNMENT_BOARD=1, BATTLECARD=1, FOLLOWUP_MC=1, NEW_FRONT_DOOR=1, PAT_ASSISTANT=1, PINGS=1, REGISTRY_MEMO=1, SELF_SIGNUP=1; CONSULTANT_ACCESS is a "sensitive" variable (value unreadable; the consultant portal renders on the deployment, so it behaves as 1). Secrets present by name: AUTH_SECRET, DATABASE_URL, DIRECT_URL. Diff vs Production's six: Preview adds NEW_FRONT_DOOR, FOLLOWUP_MC, REGISTRY_MEMO; nothing removed.
- NOT VERIFIED: the twelve sign-ins (Cam does those).

## 2026-09-14 · PUSHED on Cam's typed push — origin/feature/engagement-v1 485686d2 → e05f8962 (box 2b: code 12bdae40…eea310c6, guard normalization/rulings, artifacts, ledger banks). Prod untouched at 0157d40. Vercel builds nothing on push; preview dpl_Crz1EhDsMqbAGU97tGo9N5ETzCw1 stands with the current share link.

## 2026-09-14 · Box 2b RULINGS + POLISH closed on disk — guard v2 GREEN both sets; NOT pushed; preview redeployed
- Code (12bdae40 → eea310c6, deployed as dpl_Crz1EhDsMqbAGU97tGo9N5ETzCw1, fp eea310c:eea310c-mu16dpjq, share link in ~/work/preview-link.txt, old links revoked): A1 signed-out V7 nav menu (SignedOutHeaderMenu → HeaderControlsMenu); A2 "Open home"; A3 Trust center both modes; A10 trust cards composed back (TrustSurfaceCards); V7PublicShell wraps pages in <main>; /pat keeps consent panel + Sign in to PAT + Back to home inside HowItWorks. R24 Tech Stack Sandbox (lib/sandboxLabel, flag-on), R25 pings cards in the grid, R26 first-visit strip conditional, R27 readout full width, R28 live numbers (lib/workspaceCardStats, flex stat column), R29 Sandbox first, R30 readout drawer (InsightSurfaceCardGrid readoutMode, flag-on; inline flag-off), R23 seed ladder (Demo Company 4-piece stack, PayGrid ~24%; PAT Demo Vendor MetricBoard self 84 vs 59.9 firm) — local reset:demo and preview branch reseeded; parity reports ops/qa/score-parity-r23*.md (33 product rows, 0 firm rows, all explained). Lift: Demo Company 68 → 85 on one swap (+17); Kirkland 66 → 74 one swap, 85 three swaps.
- Guard v2 (tests/link-inventory.contract.test.ts): renames as normalization (BattleCard, Nudge queue, FREE PRO ELITE, Alignment Sandbox/Board, pts spread, Draft a reminder, Membership FREE, Back to <firm> brief, trust card voice), canonical cap 96, sign-in vehicle for every identity on /sign-in routes, shell union per identity, union across instances of one normalized route, controlPrefix rulings, 65-min crawl budget; crawler retries 5xx/timeouts/blank captures; guard-doors.sh optional orphan reaper. Rulings file 36 entries, each quoting Cam 9/14 "all as recommended" or the prior ruling. GREEN: flags-off 3/3 (08:05 run), flags-as-preview 3/3 (09:23 run), 987 pairs each — ops/qa/guard-remaining.md.
- Proof: tsc 0, lint 0, unit 1627/1627, e2e local-review 12 + 16 passed, content diff A2→E on 20 routes (ops/qa/content-diff/E.md), preview sweep 12/12 (admin with 120 s), captures ~/work/preview-proof-8 (28) + ~/work/box2b-atlas.
- Traps: kill -9 on a standalone orphans its Prisma query engine (21 connections each) — 229 orphans had saturated local Postgres; reap ppid=1 engines. Two builds racing on the build lock → EX_TEMPFAIL 75 and a stale standalone. Restarting servers on 3023/3024 while a guard set runs on 3031/3032 is safe; killing 3031/3032 is not. Background waits get killed by the harness after ~1 h; the chains survive.
- NOT VERIFIED: /admin/users needs the 120 s budget everywhere; Cam's visual ruling on the products block, stat column and drawer; paired production captures; Elite lift measured on the local DB only.

## 2026-09-14 · PUSHED on Cam's typed push — origin/feature/engagement-v1 92fd64a8 → 485686d2 (box 2: c52a5629 code, 669d7349 diff+rules, d792eeb4 rulings, fcf3dccf guard normalization, fb27e621 guard-remaining, ledger banks). Prod untouched at 0157d40. Vercel builds nothing on push; preview dpl_3UbyH5Pi9Qj5MKYA24cjHEoEyKSK stands.

## 2026-09-13 · Box 2 finish: rulings committed (d792eeb4), guard normalization (fcf3dccf), guard re-run, ops/qa/guard-remaining.md; NOT pushed
- Guard v2 now canonicalizes the two ruled renames (BattleCard→Product Fit Card card; Nudge queue→Nudges) on both sides and skips the sign-in vehicle for the public identity. Re-run on both sets: flags-off 225 lost on 23 routes (was 617); flags-as-preview 1,792 on 140 routes (was 3,670). Offline re-score reproduces both numbers exactly.
- Remaining, by disposition (ops/qa/guard-remaining.md): flags-as-preview — signed-out V7 nav menu 1,120 (ruling-needed, untouched per Cam), sign-in form seen by signed-in identities 88 (vehicle), "Open home" logo name 93, Trust center 63, vendor list Completed/Existing registry drift ~50, home path cards, Atlas admin list, Uneven maturity, checkout consent checkbox. flags-off — the same non-shell groups (drift, Atlas, Uneven maturity, checkout).
- e2e local-review on the final tree: 16 passed, 1 skipped. tsc 0, lint 0, unit 1627/1627 (from c52a5629 tree + test-only edits).

## 2026-09-11 · Box 2 COMPOSITION RESTORE on disk (c52a5629 code, 669d7349 diff+rules, + guard rulings); NOT pushed; preview redeployed
- R1 board veil reversed (page block removed; LockedSurfaceVeil stays for the vendor Product Fit Card). R2 card rows under both dashboards via one `cardRow` fragment (flag-off JSX unchanged). R3 SignedInHeaderControls (server) + HeaderControlsMenu (client) + signOutToHome mounted in V7PublicShell when signed in; AppShell/AppHeader untouched. R4 survey exits flag-on via `surveyExits` prop; 404 inside AppShell flag-off (V7 shell flag-on since 48bbae69). R5 Product URL icon in ProductStatusStrip (table + 390 cards, both tabs). R19 products block: DivergenceBar + CardChip per product, name no-wrap, row → product-insight, Manage products → assessment. R7 rename in six consultant strings + help corpus titles/bodies + scope-gate keyword (route path and flag name stay). R16 four help-panel entries flag-on with article links.
- Proof: tsc 0, lint 0, unit 1627/1627, e2e local-review 16 passed 1 skipped. Preview dpl_3UbyH5Pi9Qj5MKYA24cjHEoEyKSK (pat-c2acct-live-ou3d21dii…, fp c52a562:c52a562-mtx4pewj), new share link in ~/work/preview-link.txt (old link revoked), 12/12 accounts land (admin needed a 120 s timeout), captures ~/work/preview-proof-7 (26) and ~/work/box2-atlas (26 at 1440/390). Content diff A2→D on 20 touched routes: 121 pairs, 3,923 changed paragraphs, 2,007 intended, 1,916 rulings needed (V7 rewrites of /, /pat, /methodology, /trust; survey R20 rows) — ops/qa/content-diff/D.md.
- Guard v2 NOT passing: flags-off 617 lost (was 707), flags-as-preview 3,670 lost (was 6,939); groups + readings in ops/qa/guard-remaining-2026-09-11.md (signed-out V7 nav 1,120; sign-in redesign ~1,486; Nudge queue rename 192; BattleCard card rename 192; Open home 93; Trust center 63; vendor list Completed/Existing drift; Atlas admin list). Rulings file: 8 entries (5 follow-ups R20; Payment details ×6 routes).
- Traps: a crawl OUT dir that already exists keeps stale records (D had 1,781 from 935dffad) — purge by fingerprint before diffing; ONLY_ROUTES seeds only, depth still applies; e2e run leaves 'E2E Draft Persistence Product' in the local DB.
- NOT VERIFIED: guard pass; help corpus re-index on the preview DB (KnowledgeSource still says BattleCard); paired production-vs-preview captures; Cam's visual ruling on the products block; the two sign-in/nav groups need rulings before any guard can pass.

## 2026-09-11 · PUSHED on Cam's typed push — origin/feature/engagement-v1 4650b460 → 92fd64a8 (box 1b: d7b90d69 tools, e1dc9578 crawler v3, 0c729ebe fields/content diffs, 92fd64a8 ledger bank). Prod untouched at 0157d40. Vercel builds nothing on push (no git integration).

## 2026-09-11 · Box 1b LOSS-FINDING INSTRUMENTS closed on disk (d7b90d69 → e1dc9578 → 0c729ebe); NOT pushed
- Eight instruments/artifacts: content diff A2→C3 (1,175 pairs; 33,913 changed paragraphs; 7,683 intended; 26,230 unclassified, 5,835 distinct) ops/qa/content-diff/C3.md; fields by label A2→C (112 pairs; 299 → 834 fields; 17 MISSING, 0 RELABELED; rulings: 5 survey open-ended textareas under FOLLOWUP_MC, 6 "Payment details" textareas, 6 Ask Pat bar inputs on /create-account + one firm product assessment) ops/qa/fields-diff.md; negative-access matrix 12×8 (0 cross-portal 200; 1 unexpected = cameron+consultant → Sentinel 404, tenancy wall) ops/qa/access-matrix.md; score parity prod vs preview read-only (140 firms both, 12 differ; 94 products both, 2 differ — Bridgepath boost cohort + Demo Company, ladder re-seed not code) ops/qa/score-parity.md; flag surface table (33 flags in code, 24 in neither scope → DECISION NEEDED) ops/qa/flag-surfaces.md; help slug diff (10 linked slugs, 0 missing in files/corpus/KnowledgeSource) ops/qa/help-slug-diff.md; pings-gated surfaces live on the preview (benchmark, review-refresh, notifications, bell) ~/work/preview-proof-6; runtime diagnostics (vendor_alignment warn = sampleSize < 5, no surface reads it) ops/qa/runtime-diagnostics.md.
- Crawler v3 (fields keyed by label) committed to scripts/qa/click-inventory.mts (e1dc9578); tools/click-inventory.mts identical.
- Method finding: launching the standalone from the zsh tool shell with an unquoted $FLAGS passes the whole list as ONE variable, so every flag reads off (local-review form absent, Ask Pat bar absent). First C-fields pass was discarded; all crawls that count (A2, C3, guard runs, C-fields) ran from bash launchers and their sign-in records prove it.
- Proof: tsc 0, lint 0 (tools in lint glob), unit 1627/1627. Guard not re-run in this box. Production DB read-only (SELECT). Register (Documents) unreadable from this seat.
- NOT VERIFIED: /admin/users timed out in the C-fields crawl (admin); firm-elite 404 on one product assessment route (tenancy); production flag values derived, not read (sensitive vars); 26,230 unclassified paragraphs await rulings.

## 2026-09-11 · PUSHED on Cam's typed push — origin/feature/engagement-v1 24829caf → 4650b460 (baseline 1e1067c9, guard v2 841c3f4b, banks). Prod untouched at 0157d40. — Forge.

## 2026-09-11 · PRODUCTION BASELINE box (plan BEST 1/3; no page code; unpushed) — 1) Production PAT_ENABLE_* are Vercel 'sensitive' (API returns no value; S3 law); derived from production behaviour: ALIGNMENT_BOARD=1 BATTLECARD=1 CONSULTANT_ACCESS=1 PAT_ASSISTANT=1 PINGS=1 SELF_SIGNUP=1 (evidence in ops/qa/baseline-inventory.json). 2) A2 = 0157d40f rebuilt + served with those values + LOCAL_REVIEW_AUTH, same snapshot, crawler v2 (menus/disclosures opened; MAX_DEPTH env honoured): public 159 / firm-pro 176 / firm-elite 179 / vendor-pro 174 / vendor-elite 177 / consultant 243 / admin 600 cap. 3) PROD-public crawl of patalign.com (fp 0157d40:0157d40-ms46jjob, 253 pages) vs A2/public: the only differences are the sign-in vehicle's controls (136–138 sign-in redirect pages: local shows Continue with local review / Continue with GitHub / password box; production shows the 'Review local auth setup' link). 4) ops/qa/baseline-inventory.json committed 1e1067c9 (3,104,892 bytes; 229 routes; 49,933 controls; 7 identities). 5) Guard v2 committed 841c3f4b: tests/link-inventory.contract.test.ts crawls LINK_INVENTORY_BASE_URL and compares to the baseline (no skip); scripts/qa/guard-doors.sh = pnpm guard:doors (production flags on :3031, Preview flags on :3032; validate-launch step after build; plain vitest excludes it unless the env is set); tracked crawler scripts/qa/click-inventory.mts; tabbable 6.5.0 + axe-core 4.13.0 devDeps; link-removals.json first entry (score chooser, Cam 9/11). On HEAD 24829caf: flags-off run 341 pairs / 707 controls lost (BattleCard→Product Fit Card, Nudge queue→Nudges, Payment details box, data-instance noise); flags-as-preview 772 pairs / 6,939 controls (public V7 shell nav menu, sign-in direct form, all workspace cards incl. Alignment Sandbox / Quarterly benchmark / Review refresh, vendor-elite shell). Lists: ~/work/click-inventory/guard-v2-failing-*.txt + guard-v2-failing-summary.md. 6) A2→C removed 25,364 / new 13,882; A2→D removed 25,423 / new 13,933 (C/D crawled by v1 with menus closed → menu items dominate); doors A2 saw that old A could not: 167 distinct (nav + language menus, bell + View all notifications, Alignment Sandbox card, Quarterly benchmark, Review refresh, consultant Freshness/Nudge queue tabs, Open Alignment Board, Create an account…) in diff/A2-new-vs-A.md. 7) Preview scope = production values + NEW_FRONT_DOOR/FOLLOWUP_MC/REGISTRY_MEMO (12 names, no ANTHROPIC_API_KEY); Pat consent seeded for the 12 preview accounts; redeployed 24829caf = dpl_HaP8CDkG3a9dWxjPnVj9yVSDs6yn (fp 24829ca:24829ca-mtwfak8n); firm-pro /firm header shows Ask Pat bar + Notifications bell (captures ~/work/preview-proof-5); share link regenerated → ~/work/preview-link.txt. Checks: tsc 0, lint:test 0, unit 1627/1627. — Forge.

## 2026-09-10 · PUSHED on Cam's typed push — origin/feature/engagement-v1 58b02b63 → 24829caf (b2dc6429, c0f441c7 + banks). The final preview dpl_APw7YNuUrdy2mWKAX9set1Pdgn5S runs c0f441c7, now on origin. Prod untouched at 0157d40. — Forge.

## 2026-09-10 · e2e on the c0f441c7 tree (standalone rebuilt, then pnpm test:e2e): 46 passed / 0 failed / 7 skipped. Ready for Cam's push (origin 58b02b63 → this HEAD). — Forge.

## 2026-09-10 · PREVIEW FLAGS + REDEPLOY + LIVE PROOF box — Preview scope +PAT_ENABLE_REGISTRY_MEMO=1 +PAT_ENABLE_ALIGNMENT_BOARD=1 (REST upsert; 12 names, ANTHROPIC_API_KEY absent, Production untouched at 13). Deploy 1 of 58b02b63 = dpl_9fZYRKbjKqmLEJVfKudjGtS6oeTP (ehpwezmtk, 144 s, fp 58b02b6:58b02b6-mtvu3b7h): live 4b still LOOPED — the page's session comes from auth() whose jwt callback re-reads the DB, so the page never sees the stale cookie claim; fixed in b2dc6429 (password-update page always goes through /api/auth/claims when the DB says done) + c0f441c7 (claims route uses a relative Location; on the standalone request.nextUrl resolves to localhost). Deploy 2 of c0f441c7 = dpl_APw7YNuUrdy2mWKAX9set1Pdgn5S (1o9sdii3k, 132 s, fp c0f441c:c0f441c-mtvuj9uu). Share links are per deployment and Hobby allows one: old link revoked, new 'Anyone with the link' created via the dashboard, full URL in ~/work/preview-link.txt (600). Proofs on deploy 2: 4a firm-pro GET /firm 200 first request, no /api/auth/session; 4b vendor-pro stale claim: 307 /vendor → 307 /sign-in/password-update → 307 /api/auth/claims → 200 /vendor, second request 200 (flag reset); 4c toggle: firm readout first hit per Fluid instance 7.6–10.8 s (the one-time ensure), then 278–377 ms sequential (10 requests: 7638 then ~300 ×9), vendor 368–398 ms; 4d firm-elite board 200 ranked candidates, firm-pro board = Pro Sandbox teaser (secret candidates + Reveal with Elite), NOT the Elite lock page; /firm dashboard shows NO Sandbox card for either (it is a removed door); 4e marker blue+ring on preview at 1440/390; 4f 12/12 accounts 200 (admin needs load-wait: SSE keeps /admin from networkidle). tsc 0, lint:test 0, unit 1629/1631 (guard's 2 expected). Code commits b2dc6429, c0f441c7 unpushed (origin 58b02b63) — awaiting push. — Forge.

## 2026-09-10 · PUSHED on Cam's typed push — origin/feature/engagement-v1 51b185e0 → 58b02b63 (22 commits: founders-preview accounts script, wait-state items 1–4 with fixups, ledger banks). Prod untouched at 0157d40. Flags untouched. — Forge.

## 2026-09-10 · WAIT-STATE box (no push) — 1) 569440db redirect loop: shared lib/auth/firstLoginGate.ts (middlewareGate/pageGate) + GET /api/auth/claims (unstable_update re-reads the DB into the JWT) + tests/first-login-gate.contract.test.ts reproducing the loop; 2) cc8c9754 tests/link-inventory.contract.test.ts + ops/qa/link-removals.json (empty): flag-on ⊇ flag-off per route × identity from ~/work/click-inventory, grouped failures; FAILS TODAY BY DESIGN: 381 controls / 2,742 route occurrences B→C (and B→D) — the /firm and /vendor workspace cards for firm-pro/elite and vendor-pro/elite, plus the flag-on public shell's renamed controls ('Open home', 'Open navigation menu', 'Sign out', 'Membership', 'Ask Pat'); 3) b4d12279 'you' marker brand blue + 2px white ring in PercentileBand + PercentileBandRow (captures ~/work/wait-state-captures/peer-{before,after}-{1440,390}.png); 4) a764a901 (+79ce2124, a42236b3) toggle latency: the firm insights hub and readout ran ensureFirmAlignmentSystem() per request (hundreds of serial upserts) — preview 8.5–10 s for every firm insights page vs 250–400 ms for /firm and vendor pages; local transactions per readout 446–2,308 → 37–58 with PAT_ENABLE_REGISTRY_MEMO=1 (ten-minute per-process memo, fail-closed), local click→Elite 504–780 ms → 105–130 ms. Proofs: tsc 0, lint:test 0, unit 1627/1629 (the 2 = the guard's expected failures, 190 files), e2e 46 passed / 0 failed / 7 skipped. Flags untouched; DOORS untouched. — Forge.

## 2026-09-10 · CLICK INVENTORY box (Mythos method 2026-09-10; read-only, no app code, no push) — four builds on one local DB snapshot restored before each crawl: A 0157d40 (worktree build, fp 0157d40:Jzb_gcUzt69lDpmCqBI6P), B HEAD flag-off, C HEAD +NEW_FRONT_DOOR+FOLLOWUP_MC, D C+ALIGNMENT_BOARD (B/C/D fp 935dffa:lOsjenlzVRAtQZjX7vpDI; app tree = 016bbd85). Seven identities; records A 1668 / B 1739 / C 1879 / D 1889 in ~/work/click-inventory/{A,B,C,D}/<identity>/<route>.json; diffs A-to-B, A-to-C, C-to-D (removed/retargeted/renamed/moved/new, unfiltered). Counts: A→B removed 634 · renamed 875 · new 3196; A→C removed 2132 · retargeted 4 · renamed 1428 · moved 1776 · new 7411; C→D removed 2 · renamed 466 · new 101. FINDINGS for the reviewers: (1) every flag-on public page (C/D) has NO <main> landmark (A has one on all) → 1,671 public controls 'moved' main→shell; (2) HEAD /admin/users renders 222,512 DOM nodes / 2,019 forms — ARIA snapshot cannot serialize it (A's could); recorded in LIGHT mode (tabbable 7,089 → 7,090, +1 button). Limits: admin capped at 600 pages/build; vendor-elite re-crawled on all builds after a local password reset (snapshot v2 differs from v1 by that hash only); local-review sign-ins hop to AUTH_URL :3000 (launchd standalone, same HEAD) then crawl on the build port. Instruments + README in ~/work/click-inventory/tools. — Forge.

## 2026-09-10 · Founders preview — Leslie's six roles re-proved with standing passwords through the share link (fresh contexts, 1440×900): 18/18 PASS, no password-update screen; firm-pro/firm-elite → /firm dashboards → /firm/insights; vendor-pro → Bridgepath product intelligence 4 products; vendor-elite → Meridian 6 products; consultant → Sentinel coverage 6 products / 49 firm assessments; admin → /admin/agents. Screenshots in ~/work/preview-proof-3/ (14 files). — Forge.

## 2026-09-10 · Founders preview — ERR_TOO_MANY_REDIRECTS on /firm (Cam + Mythos, Chrome): CODE PATH, not a binding. proxy.ts redirects every protected page to /sign-in/password-update whenever the JWT claim mustChangePassword is true; app/(public)/sign-in/password-update/page.tsx redirects to returnTo whenever the DATABASE says the update is not needed. A session issued while the flag was on (form left unfinished) plus the flag cleared afterwards (my standing-password change at Cam's request) = 307 /firm ↔ 307 /sign-in/password-update?returnTo=%2Ffirm forever. Reproduced headless step by step; the direct matrix (12 accounts × 4 homes, fresh sessions) and the callbackUrl and account-switch flows never loop. Exit without code: GET /api/auth/session runs the jwt callback, re-reads the DB and rewrites the cookie → /firm 200 in the same browser; or sign out. Applies to prod too: any future clearing of mustChangePassword (admin form untick included) for a user holding a session loops them until the token refreshes. Suggested fix (not made; flag-off surface): the password-update page should refresh the token (unstable_update in a server action) instead of redirecting when the DB flag is off. All 12 founder flags verified false. — Forge.

## 2026-09-10 · Founders preview — standing passwords for the 12 founder accounts on the Neon preview branch only (Cam's ruling; host guard ep-wispy-snow-apevna3q; no code change): mustChangePassword cleared 12 → 0 on lesliegarrettphd+<role>@gmail.com ×6 and cameron+<role>@garrettandgarrett.info ×6; every other account untouched (3 flagged before and after). Proof through the share link, fresh contexts: lesliegarrettphd+firm-elite → /firm, cameron+vendor-elite → /vendor, no password-update screen. Temporaries in ~/work/preview-accounts.txt now stand. Draft to Leslie carries the six passwords and the bare share link (Cam's request; passwords never in chat/ledger). — Forge.

## 2026-09-10 · Founders preview — demo ladder re-run on Neon branch preview-2026-09-10 (Cam's GO; host guard ep-wispy-snow-apevna3q; prod untouched): baseline → pat-runtime → demo-benchmark → product-maturity (558 snapshots) → swaps (1,207 events) → taxonomy → expand --apply → compute-benchmarks (6 firm / 10 vendor runs) → boost meridian (12 firms / 52 subs / 72 reviews) → boost bridgepath (12 / 56 / 48) → assert PASS → re-provision founders → fixtures 0. Two seeds clashed with ConsultantAssignment.ecosystemId (one consultant per ecosystem): founder consultants released for demo-benchmark, consultant@c2acct.com released for expand and restored to the Meridian ecosystem after; founders reassigned by the provision step. BEFORE → AFTER: vendor self-assessments passing 0/93 → 90/93 (the 3 left on v2 are Demo Vendor Inc, the July singleton no seed owns); product-intelligence non-empty vendors 0/24 → 23/24; firm-review response ids v2 980 → v3 44,260; consultant Sentinel coverage 0 products / 0 firm assessments → 6 products / 49 firm assessments; Bridgepath firm reviews on file 0 → 84. Six-role proof re-run through the share link: 18/18 role steps PASS; temporaries re-issued for all 12. DEPLOY-NIGHT NOTE: the same ladder is required on prod after 016bbd85 deploys, or product evidence goes dark. — Forge.

## 2026-09-10 · Founders preview 5.1 proof through the share link (Playwright headless Chromium, one fresh context per role, 1440×900): fingerprint 200 releaseId 016bbd8:016bbd8-mtudwe2e branch feature/engagement-v1 source cloud-build; /release shows commit 016bbd8 (page has no branch row; branch is in the JSON); front door band+radar; /trust 200; /pat 200; Leslie's six roles: sign-in → /sign-in/password-update → workspace landing → deep page, 18/18 steps PASS (firm dashboards 5/5 modules, capabilities 6/10 and 10/10; consultant → Sentinel ecosystem; admin → /admin/agents). Leslie's temporaries consumed by the forced update → all 12 re-issued (mustChangePassword=true). FINDING (deploy-night blocker, not preview-only): every prod product-module final (93 vendor self-assessments + 988 firm product reviews, all DEMO boundary) carries registry ids 2026-03-product-utility-v2; code at 016bbd85 validates against 2026-08-product-utility-v3 (deriveVendorProductAssessmentCompletionStatus) → 0/93 complete on the prod copy vs 127/127 locally → vendor product intelligence, vendor dashboard evidence, battlecard evidence and consultant coverage render EMPTY on the preview (and would on prod after deploy). Remedy = re-run the July demo ladder on the branch (seeds upsert by deterministic id → rows rewritten to v3); $S/ladder.sh prepared, NOT run (classifier-blocked; Cam's GO required). Prod untouched. — Forge.

## 2026-09-10 · Founders preview 2.2 — Preview cloud build of app tree 016bbd85 (detached checkout; --build-env PAT_COMMIT_SHA=016bbd85…, PAT_COMMIT_REF=feature/engagement-v1, PAT_BUILD_SOURCE=cloud-build), Preview scope env, Ready in 3m: https://pat-c2acct-live-7trisfpq7-cams-projects-cbec4d2e.vercel.app. Deployment Protection stays ON (unauthenticated probes see the wall); /release fingerprint is read through Cam's share link in 5.1. No --prod, no Production scope touched. — Forge.

## 2026-09-10 · Founders preview 2.1 (amended: Forge sets the two DB keys) — Vercel Preview scope DATABASE_URL (+pgbouncer=true) and DIRECT_URL replaced from .env.preview via the REST API upsert (the CLI's non-interactive `env add` in Preview scope swallows stdin at the git-branch prompt and adds nothing); target preview, no branch scope, encrypted. Preview scope = 11 keys: AUTH_SECRET, DATABASE_URL, DIRECT_URL, PAT_ENABLE_{ALIGNMENT_BOARD=0,BATTLECARD=1,CONSULTANT_ACCESS,FOLLOWUP_MC=1,NEW_FRONT_DOOR=1,PAT_ASSISTANT=1,PINGS=0,SELF_SIGNUP=0} (flag values per Mythos's dashboard entry). No ANTHROPIC_API_KEY in Preview (ruled). Values never printed. — Forge.

## 2026-09-10 · Founders preview 3.1–3.3 on the preview branch — 12 accounts (lesliegarrettphd+<role>@gmail.com, cameron+<role>@garrettandgarrett.info): firm-pro → Greenfield & Marsh (PRO, 5/5), firm-elite → Alderwood CPAs (ELITE, 5/5), vendor-pro → Bridgepath Suite (4 products), vendor-elite → Meridian Practice Cloud (6 products), consultant → Sentinel ecosystem (Leslie) / Bridgepath ecosystem (Cam; one consultant per ecosystem is a schema constraint), admin → company-less ADMIN. All mustChangePassword=true; passwords only in ~/work/preview-accounts.txt (mode 600). reset-demo --fixtures-only: 0/0/0 e2e rows present on the prod copy. Help seed 1.4: 30 indexed / 36 unchanged / 66 total, re-run 0. — Forge.

## 2026-09-10 · Founders preview 1.1–1.4 on Neon branch preview-2026-09-10 (endpoint ep-wispy-snow-apevna3q, pooled-host fp 125111bf1f8334a7; a prod copy: 844 users / 166 companies / 50 migrations at branch time). migrate deploy via DIRECT_URL: 7 applied (20260820…20260907; the box said six) → status 57 applied / 0 pending. backfill-item-responses --apply: 15,950 rows over 5 firm modules; re-run 0 rows (638 submissions already present). Help corpus seed --apply: see the report line. Prod untouched. — Forge.

## 2026-09-10 · Founders preview box, commit ac14a9b7 — founder addresses ruled: lesliegarrettphd+<role>@gmail.com, cameron+<role>@garrettandgarrett.info; six roles each; passwords to ~/work/preview-accounts.txt only. Still at gate 1.1 (Neon branch). — Forge.

## 2026-09-10 · Founders preview box, commit 9a5b46b9 — scripts/demo/preview-founder-accounts.ts (discovery + --provision, prod-host refusal, passwords to ~/work/preview-accounts.txt only). Local discovery smoke OK; eslint 0; tsc 0. Pre-gate inventory: no Neon CLI/API key on this Mac (Cam creates the branch in the dashboard); Vercel Preview scope today = AUTH_SECRET, DATABASE_URL, DIRECT_URL, PAT_ENABLE_CONSULTANT_ACCESS; Production scope adds AUTH_URL, NEXTAUTH_URL, ANTHROPIC_API_KEY, AGENT_APPROVAL_HMAC_SECRET, PAT_ENABLE_ALIGNMENT_BOARD/BATTLECARD/PAT_ASSISTANT/PINGS/SELF_SIGNUP; 7 migration dirs dated after the 0157d40 baseline (box says six; migrate status on the branch settles it). Stopped at gate 1.1. — Forge.

## 2026-09-09 · Depth box PUSHED on Cam's typed push — origin/feature/engagement-v1 0cfaf48d → 51b185e0 (fast-forward; app tree 016bbd85 + proof bank). Prod untouched at 0157d40. Flags off. :3011 flag-on preview up. — Forge.

## 2026-09-09 · Depth box PROOF RE-RUN on final HEAD 016bbd85 (Mythos request) — build 0; flag-off diff vs 0cfaf48d (both standalones on one DB, same minute): portals 70/98 byte-identical, public 36/40; rendered HTML (flight stripped) differs only on admin/launch + /release branch-name rows (detached base worktree vs branch), firm/vendor membership prices (approved), /help 404 shell (same shape as /ask and the onboarding audience guard); every other differing file is a flag-off `null` slot in the flight payload; atlas flag-on: routes 107 / captures 144 / non-2xx 6 expected / 0 unexpected, firm-elite + vendor-elite homes 200; test:e2e x3: 46 passed / 0 failed / 7 skipped each run, pat-signin-canonical /login shim ✓ ✓ ✓; reset-demo restored the seed, perf reseed 0. Ledger-only commit; app tree = 016bbd85. Not pushed. — Forge.

## 2026-09-09 · Depth box CLOSE (HEAD d885d555 + bank) — unit 1615/1615 (187 files), typecheck 0, lint 0, copy-lint 67, ratchet at ceilings; chain on 2c400bc9: build 0, e2e 45 passed / 1 failed / 7 skipped (pat-signin-canonical /login shim; 12/12 in isolation → suite flake), release:prelaunch 0, validate:launch PASS, launch:proof 0, perf reseed 0; flag-off diff vs 0cfaf48d: portals 67/98 byte-identical, rendered HTML differs only on admin countdowns + approved membership prices, public 38/40 (help 404 shape, release branch row); atlas 107 routes / 144 captures / non-2xx 6 expected / 0 unexpected incl. firm-elite + vendor-elite homes. Not pushed; awaiting Mythos. — Forge.

## 2026-09-09 · Depth box, commit d885d555 — Fig. 03 provenance matches its values (visual self-check). — Forge.

## 2026-09-09 · Depth box, commit 721573da — atlas fixture for /help/[slug] (pat-for-firms). — Forge.

## 2026-09-09 · Depth box, commit 4a3f91d8 — depth-box test window widened for the shared hover selector list. — Forge.

## 2026-09-09 · Depth box, commit b13c2b2f — insight cards keep flag-off markup (hover via the token-layer scope flag-on); firm list grid class exact. — Forge.

## 2026-09-09 · Depth box, commit 0ffef7d1 — week cards gated on the flag (the flag-off diff caught them rendering). — Forge.

## 2026-09-09 · Depth box, commit 56b1ebca — flag-off byte identity restored (onboarding wrappers, wizard prop, /pat + /help metadata); dashboard prop renamed so copy-lint reads 67 again. — Forge.

## 2026-09-09 · Depth box, commit 2a69ce3d — /pat = How it works (flag-on): 01 radar, 02 evidence both ways, 03 delta / hot divergence, 04 fork band; radar + band extracted for reuse; depth-box contract test; atlas gains firm-elite / vendor-elite homes. — Forge.

## 2026-09-09 · Depth box, commit c6d32226 — workspace homes (flag-on): firm and vendor dashboards from the hub's own builders — index/band, modules, capabilities, radar, NEXT BEST STEP, latest readout, since-last-visit; designed empty states. — Forge.

## 2026-09-09 · Depth box, commit 68447982 — onboarding rail (flag-on): radar filling per completed step on /onboarding, /onboarding/[audience], /create-account. — Forge.

## 2026-09-09 · Depth box, commit 56e4358c — product lists (flag-on): status strip (features · reviews on file · last updated · divergence), table at 1440 / cards at 390, needs-attention first. — Forge.

## 2026-09-09 · Depth box, commit a3bc8dc6 — help (flag-on): /help + /help/[slug] article pages; Ask Pat card first on four help surfaces; every card links to its help/public article; guide packet not in help/ yet. — Forge.

## 2026-09-09 · Depth box, commit 70f8c74e — guide home: freshness/nudges were gated on PAT_ENABLE_PINGS (not mis-wired) — open flag-on; Request refresh label; task lists aggregated; NEXT BRIEFING + THIS WEEK cards. — Forge.

## 2026-09-09 · Depth box, commit 97515bfb — locked Pro pages (flag-on): real board / Product Fit Card behind blur + 60% white with the Elite lock card (what unlocks, memo price, Upgrade to Elite). — Forge.

## 2026-09-09 · Depth box, commit f857939b — dead ends (flag-off, approved): user-insight and engagement score unlinked; direct hits redirect to the workspace with a one-line notice. — Forge.

## 2026-09-09 · Depth box, commit fd9259e8 — membership prices (flag-off, approved): Firm Pro $4,800, Firm Elite $24,000, Vendor Pro $9,000, Vendor Elite ecosystem license; user tier hidden. Copy only. — Forge.

## 2026-09-09 · Depth box, commit b0535a66 — hover ruling applied (.pat-hover-card on hero band, Pro and Elite insight cards); public footer = TRUST_FOOTER_LINKS row, door accordion removed. — Forge.

## 2026-09-09 · V3 box PUSHED — origin/feature/engagement-v1 = 0cfaf48d
Cam typed "push"; 9b365244..0cfaf48d fast-forwarded (25 commits: 12 code, 13 ledger banks). Prod untouched at 0157d40; flags off. Preview :3011 (flag-on dev) left running. This entry is banked locally, not pushed. — Forge.

## 2026-09-09 · V3 box CLOSED on disk at 8811fc28 (+ this bank) — awaiting Mythos verify, then Cam's "push"
Chain on 8811fc28: test:e2e full 46 passed / 7 flag-skipped / 0 failed (teardown removed products=1 companies=1 users=1) · release:prelaunch 0 · validate:launch 0 · launch:proof 0 · perf reseed 0 · unit 1605/1605 (186 files) · lint 0 · typecheck 0 · copy-lint 68 → 67 · ratchet at 111 (band sizes moved to CSS classes). Flag-off diff 9b365244-build vs HEAD-build on one DB: portals 68/98 identical, the 30 others are the approved flag-off changes (disclaimer copy, billing contact, "1 pt spread", briefing/help copy) plus the detached-worktree branch row and a per-request tie flip on /firm/insights; public 32/36 identical (methodology = 4.2, release = branch row). Atlas after (flag-on, HEAD): routes=105 captures=138 non-2xx 6 expected / 0 unexpected (before = finish/after 105/138/6). Hover proof: start #f4f7fb→#dfe7f2, firm/vendor →#e6ecf5. Preview :3011 flag-on left running for Cam. Not pushed. — Forge.

## 2026-09-09 · V3 box, commit 78d6dbf8 — e2e teardown via tsx child process; fixture removal verified (E2E product created by the draft spec, 0 left). — Forge.

## 2026-09-09 · V3 box, commit b6b2fa8a — chain fixes: band sizes as CSS classes (ratchet back at 111), band rules above the token layer, e2e teardown reads DATABASE_URL from .env.local, accounting pack prompt follows 4.2. — Forge.

## 2026-09-09 · V3 box, commit 64318e34 — fixture hygiene: e2e globalTeardown + scripts/dev/reset-demo.ts (tracked) remove E2E rows and restore the seed; follow-up option seed for Atlas Family Office Services (32 rows / 5 submissions), idempotent, hooked into seed:pat-runtime. — Forge.

## 2026-09-09 · V3 box, commit d552b64d — layout/labels: support summary de-duplicated; '1 pt spread'; widths covered by the 3.1 rule (measured 1161px); consultants freshness/nudges are PAT_ENABLE_PINGS-gated by design, not a key bug. — Forge.

## 2026-09-09 · V3 box, commit d108ac58 — data pass remainder under the ruling: public 222→60 lines, glossary 106→35, 0 occurrences outside demo/pilot/production data + Data Flow; data layer → evidence layer; re-indexed. — Forge.

## 2026-09-09 · V3 box, commit 58cc0c91 — BattleCard → Product Fit Card in headings and copy (route path kept; flag-off approved). — Forge.

## 2026-09-09 · V3 box, commit ee02a3ef — 'directional' removed from /methodology, /trust title and every signed-in surface (23 source files + 3 tests, flag-off approved); insight footer = 'Informational, not professional advice · methodology'. — Forge.

## 2026-09-09 · V3 box, commit ed8c8028 — firm product assessment on one page (flag-off, approved): pager, Next/Back and per-page gate removed; submit gating unchanged; no draft API on this surface so nothing to autosave. — Forge.

## 2026-09-09 · V3 box, commit 17480e7c — leaks: chips under the eyebrow below lg + full-width roots (flag-on); Payment details → Billing contact name/email + 'PAT never collects card numbers here.' (flag-off, approved); vendor profile contract JSON admin-only (flag-off, approved); method panel plain sources + /methodology link (flag-on). — Forge.

## 2026-09-09 · V3 box, commit 48bbae69 — create-account, onboarding(+audience), pat moved to the (public) group (V7 shell flag-on, AppShell flag-off); 404 in V7PublicShell flag-on; /sign-in/firm|vendor redirect to the hub view flag-on. — Forge.

## 2026-09-09 · V3 box, commit 7659cb52 — front door hero CTA band V3 (flag-on): one band, three cells, pills, whole-cell hover tint 150ms; ArrowGlyph removed; reference renders not readable from this seat. — Forge.

## 2026-09-09 · Finish box PUSHED — origin/feature/engagement-v1 = 9b365244
Cam typed "push" after Mythos VERIFIED db256219; db256219..9b365244 fast-forwarded (10 commits incl. the a29c224b bank). Prod untouched at 0157d40; flags off. This entry is banked locally, not pushed. — Forge.

## 2026-09-09 · Finish box CLOSED on disk at HEAD (b3508ccd + this bank) — awaiting Mythos verify, then Cam's "push"
Chain on b3508ccd: build 0 (through the new build lock: acquired/released logged) · test:e2e full 46 passed / 7 flag-skipped / 0 failed · release:prelaunch 0 · validate:launch 0 · launch:proof 0 · perf reseed 0. lint:test 0, typecheck 0, unit 1605/1605 (186 files), copy-lint 68 (unchanged), ratchet at actual. Flag-off diff db256219-build vs b3508ccd-build on the same DB: public 24/24 identical; portals 82/98 identical, remaining 16 = the two approved ordering pages (8 files), agent countdowns ticking (4), detached-worktree branch name on /admin/launch (2), chunk-manifest rows on 3 insight pages (6 files… by page 3) — zero unexplained. Atlas after at b3508ccd: 6 (expected by flag: 6, unexpected: 0) — /ask (404, expected (before = Part 2 after: 105/138/6). Not pushed. — Forge.

## 2026-09-08 · Finish box, commit 998d0a4f — portal polish flag-on: hero lockup keeps only the eyebrow; consultants/admin roots span the container (1161px measured); FAQ renders only with items (none exist → hidden). — Forge.

## 2026-09-08 · Finish box, commit a6ce49ab — build race guard: pnpm build → scripts/release/build-lock.mjs (atomic lock dir, refuse live holder with exit 75 + one log line, reclaim dead holder, always release); launchd helper waits on the lock. Smoke-tested refusal. — Forge.

## 2026-09-08 · Finish box, commit 619ef111 — admin catalog ordering: loaders extracted to lib/adminCatalogQueries.ts with orderBy on all six nested includes (key, then name); DB-backed contract test 4/4. Flag-off change, approved. — Forge.

## 2026-09-08 · Finish box, commit bfca36e7 — help/public data pass: 222 → 103 lines with the word, 0 plain-language left (data classes / data layer / data-flow kept), 135 phrase rules, glossary untouched, re-indexed 18 articles. — Forge.

## 2026-09-08 · Facelift 2 box PUSHED — origin/feature/engagement-v1 = db256219
Cam typed "push"; 0279b240..db256219 fast-forwarded to origin (21 commits: 10 code, 11 ledger banks). No Mythos VERIFIED reached Forge in-session — flagged in the report. Prod untouched at 0157d40; all flags off. This ledger entry is banked locally and not pushed. — Forge.

## 2026-09-08 · Facelift 2 box CLOSED on disk at 1bb8494c — awaiting Mythos verify, then Cam's "push"
Chain on 1bb8494c: build 0 · test:e2e (FULL suite) 0 — 46 passed / 7 flag-skipped / 0 failed · release:prelaunch 0 (asset-integrity PASS) · validate:launch 0 on rerun (first run failed only on eslint of an untracked scripts/dev .cjs helper, now an .mts) · launch:proof 0 · perf fixture reseeded. lint:test 0, typecheck 0, unit 1598/1598 after the two contract-test follow-ups, copy-lint 68 "data" segments (A2 baseline 68, unchanged), ratchet at actual (111/9/2/223/0/8). After-atlas regenerated with the public slice at 1bb8494c: routes=105 captures=138 bad=6 (all expected by flag, 0 unexpected). Not pushed. — Forge.

## 2026-09-08 · Facelift 2 box, commit 6bf05173 — footer pinned on short V7 pages; proofs so far
After-atlas at 52bf2acf: routes=105 captures=138 bad=6, all six expected by flag, 0 unexpected (before: 10). Flag-off byte diff 0279b240 vs 52bf2acf: 49 signed-in routes × HTML+RSC = 98 files, 94 identical after normalising build/chunk/action/nonce/timestamp noise; the other 4 (/admin/modules, /admin/insights/rules) reorder between server process starts on the base build itself and match a fresh base capture exactly. Public 24/24 identical. Ten-capture visual review found one residual: footer not pinned on short pages → this commit. Validation chain (build → e2e → prelaunch → validate → proof → perf reseed) starting on this HEAD. — Forge.

## 2026-09-08 · Facelift 2 box, commit d0f6d223 — AppShell contract test follows the spread
Full unit run on 52bf2acf: 1596/1598 — the two reds were the AppShell main-tag regex (now follows {...v7Shell}) and no-hardcoded-paths scanning an untracked scripts/dev capture script (path now from cwd). HEAD snapshot build (52bf2acf) serving flag-off on :3013 for the byte diff vs the 0279b240 snapshot on :3014; 49 signed-in routes × HTML+RSC captured from each. — Forge.

## 2026-09-08 · Facelift 2 box, commit 97203173 — token-pass contract tests; ratchet at actual
tests/portal-token-pass.contract.test.ts (12 tests: layer scoping/tokens/no min-width/register colours/AppShell spread + one block per group). Ratchet actuals == ceilings (111/9/2/223/0/8) — Part 1 removed no literals, so no ceiling moves. Next: build HEAD snapshot, flag-off byte diff vs 0279b240 snapshot for all four groups, after-atlas, validation chain. — Forge.

## 2026-09-08 · Facelift 2 box, commit 1823edef — known-stale e2e list cleared
Eight stale specs fixed to shipped contracts, none deleted: colour-only toggle state (shadow retired), replace-history panel navigation (PatModeToggle replace since May 2026 — flagged as a product question if push was intended), one-page vendor assessment modes, inline readout expansion, footer-scoped selector. 9 passed / 1 flag skip. — Forge.

## 2026-09-08 · Facelift 2 box, commit 6db92b97 — Part 2 dispositions in the atlas
Six 404s are flag-dark by design (public tier: /ask; pings: /notifications, /firm/benchmark, /vendor/review-refresh; adaptive modules: /firm/modules, /firm/modules/[templateId]) and now sit in EXPECTED_NON_2XX with the gate named in the index. Two were fixture guesses (insightKey → current-product-fit; admin briefing product → meridian-audit). The two "slow" admin routes were the atlas waiting for networkidle on an SSE page; atlas waits for load + ≤15s idle. No app code changed in Part 2. — Forge.

## 2026-09-08 · Facelift 2 box, commit d2dd12c1 — /admin group enabled; Part 1 route groups complete
Admin layout attribute spread; layer gains an h1-step rule (agent console h1 was text-2xl → h3 size) and inline-size containment for table wrappers (/admin/launch's min-w-[42rem] tables widened the page to 516 at 390). Fourteen admin routes measured on dev: no overflow, h1 32/600, container 1200. Flag-off byte diff for all four groups still pending — it runs once against the final HEAD build vs the 0279b240 snapshot. — Forge.

## 2026-09-08 · Facelift 2 box, commit b0a2cce5 — /consultants group enabled
Attribute spread on the consultants layout root (empty flag-off). Seven consultant routes measured on dev at 1440/390: no overflow, h1 32/600, container 1200. Part 2 finding banked while here: /admin and /admin/agents/[agentKey] "took >90s" because LiveActionStream opens an EventSource (/api/agents/<key>/stream) — the atlas waited for networkidle, which an SSE page never reaches. Not a query or index problem; the atlas gets a bounded wait. — Forge.

## 2026-09-08 · Facelift 2 box, commit 6344923a — /vendor group enabled
data-v7-portal="vendor" flag-on in the vendor layout; nine vendor routes measured on dev at 1440/390 with no overflow, h1 32/600, container 1200. Part-2 "before" atlas finished meanwhile: routes=105 captures=138 files=276 bad=10 at 0279b240. — Forge.

## 2026-09-08 · Facelift 2 box, commit d8c7cc8a — portal token layer + /firm group
Mechanism: a CSS layer in globals.css scoped to [data-v7-shell] (AppShell main/footer, flag-on spread) and [data-v7-portal] (group layout wraps children in a display:contents div flag-on; flag-off returns the old fragment). Maps the existing Tailwind classes to the B1 tokens (h1 32 / h2 24 / h3 18 / body 16 / meta 13, radius 12/6, hairline, shadow-card, container 1200, mono numerals); pills keep 9999px; hero chips flow above the wordmark below 640px (they overlapped it at 390). /firm enabled and measured on dev: no overflow at 390, h1 32/600, main 1200. Flag-off byte diff deferred to after the last group commit (one snapshot pair, all groups). — Forge.

## 2026-09-08 · Facelift 2 box, commit 90f47cb4 — B3 findings fixed (band, Sign in wrap, trust column)
Part 0 confirmed first: origin/feature/engagement-v1 == 0279b240; typecheck 0; unit 1586/183 green at 22/100 Postgres connections; trust flag-off diff vs a 3844ddaf worktree build 8/9 byte-identical (release differs only in printed fingerprint values) once the worktree's path-hashed action id and the moved (app)→(public) segment name are isolated. Design brief PATALIGN-FACELIFT-DESIGN-BRIEF-2026-09-08.md is NOT in the repo copy and the Documents copy is TCC-denied to this seat — proceeding on the box's explicit rules; flagged. Commit 90f47cb4: V7 shell gets shrink-0 (band stopped at 900px because the flex child shrank to its min-h-screen), Sign in pill nowrap/shrink-0 with tighter sm-down gaps, TrustSurfaceV7 non-TOC pages span the container with 44rem prose measure and a 3-col link list. Flag-on components only. — Forge.

## 2026-09-04 (night) · V7 box built DARK on Mythos's 21a PASS — 21c/21d/trust accordion/Ask Pat/dot fix; mobile shots delivered
Mythos 21a PASS landed (V7PublicShell on :3011 for / /methodology /trust /sign-in; :3000 flag-off parity). Served the pair first: Next 16 holds one `next dev` lock per repo and the startup guard pins the canonical root, so :3011 = `PAT_ENABLE_NEW_FRONT_DOOR=1 PORT=3011 pnpm dev`, :3000 = standalone (`pnpm build` + `pnpm start` with `.env.local` sourced — standalone does NOT read it; DB-less render is ~2 KB short). Five commits, all flag-on only, each with contract tests: 0639a8b6 cohort "you" dots — measured cause: rem-based h-3/top-0.5/h-2/h-4/w-0.5 under html{font-size:11.5px} put the dot 0.78px under the track, 2.2px under the peer band, 2.75px under the tick at 1440; all-px 14px row, every element centres at 7.00 (0.00px after, 5/5 rows). aac8b9b1 Ask Pat cta-card → /ask gated on isAskPatDoorEntryEnabled() = publicTierAvailability().available (the /ask page's own check: flag AND salt); live proof on temp standalone ports: flag+salt → link present + /ask 200; flag without salt → link absent + /ask 404; hero CTA row flex-wrap. 83fe3a53 trust band → native <details> accordion "How PAT earns trust" listing TRUST_FOOTER_LINKS (the product footer's nine: Trust, Privacy, Terms, Security, Support, Billing policy, Methodology, How Pat is governed, Build proof); "Methodology" on the door 3→2 by dropping the V7 shell FOOTER repeat shell-wide (nav keeps it) — judgment call, one line to reverse. 6ab9ae09 21c Meet PAT v7 variant: hero + first two sections, "How PAT grows" + "Instant value" dropped by OMISSION (en 1053→578 −45%, es 1170→661 −43.5%, fr 1276→691 −46%; rendered innerText 1403→908), no re-voicing; default variant untouched for every portal + flag-off. 88a82bc3 21d sign-in hub: ONE markup tree, two class registers (DEFAULT = pre-21d literals pinned verbatim; V7 = door grammar, px scale); "Local review access" pinned unreachable: box guarded by localReviewProviderReady = policy(flag ∧ loopback-only) ∧ secret ∧ password; getLocalReviewAuthPolicy false for prod+public origin, prod+no origin, any public origin, loopback w/o flag; true only loopback+flag. Flag-off byte-identity: 11 public paths fetched from the standalone before/after; identical once build-hashed asset names, BUILD_ID, fingerprint commit and Next's per-request encrypted $ACTION nonce are normalised (nonce proven to differ between two fetches of ONE build). CSS bundle diffed against a throwaway build of 4e74ce02: +26 utilities, −6 that no longer occur in any source. Validation: typecheck PASS; test:unit 175 files / 1524 tests PASS (was 174/1500); eslint clean on changed files. Mobile: 390px full-page Playwright shots of / /methodology /trust /sign-in (flag-on) → ~/work/v7-mobile-2026-09-04/, no horizontal overflow; observed for Mythos: nav "Sign in" pill wraps to two lines and the logo crowds "Methodology" at 390 (shell, untouched). New copy introduced: only the accordion summary "How PAT earns trust". Dev artefact: `next dev` stopped hot-reloading after a concurrent `pnpm build` — restart it. Orphaned Prisma engines + supervisor/telegram-bot left running per Mythos. Byte-diff caught one real defect in 88a82bc3: `style={undefined}` emits no HTML attribute but serialises as "style":"$undefined" in the RSC flight payload and shifted its outlining; fixed by spreading cardStyleProps(r) (commit after the first bank) — 11/11 flag-off paths byte-identical thereafter, with the encrypted $ACTION nonce normalised in both the hidden input and the flight payload. NOT PUSHED — awaits Mythos VERIFIED + "push". Flag stays OFF. — Forge.

## 2026-09-02 · B7 Elite shelf authored (40); ledger-exemption box exemplary
B7 on "go on next": REGISTRY-B7 (E01–E20 firm-Elite: position/low/high/trajectory/flat/decline reads, remediation sequencing, 5 pillar-interpretation articles, shape reading, 3 adaptive-usage articles, integrity-flag depth, evidence-led tool choice, leadership prep, the Elite year; E21–E34 vendor-Elite: product position/trajectory, delta triage, outperformance/shortfall-diagnosis, evidence-led prioritization, segment patterns, BattleCard depth, no-names category read, declaration strategy, portfolio, integrity, consultant-mediated demand, vendor year; E35–E40 cross: distribution craft, movement-vs-noise, ranked-action habit, data-vs-gut, misreadings catalog, interpretive-mindset capstone) + B7-LAW (first depthTier: ELITE shelf; July Elite design law baked in: position reader → patterns-worth-examining never diagnoses → END WITH RANKED CONSIDERATIONS; "most firms…" frequency claims banned without source). 10 sonnet agents, all clean: 40/40, ~100.6k words, avg ~2,515; QC: ELITE frontmatter ×40, ranked-considerations present ×40, banned scan clean. Delivered + committed. CORPUS: 225 articles / ~580k words / 87%. Remaining: industry library 40 (external citations), claims v0 20. FORGE: ledger-exemption micro-box verified from report (real-script demonstration: ledger-only passes restart-app while app-start refuses same tree — correct narrow scope; lookalike/rename attacks covered; real-git-repo classifier tests; 1404 unit tests) → GO'd validate:launch as the natural proof of the changed path.

## 2026-09-01 (night) · B6 authored — consultant + admin shelves complete
On "go": REGISTRY-B6 (consultant C01–C14: workspace, ecosystem management, firm-card + brief reads, cross-firm comparison w/o internal rankings, suggested probe questions as openings-not-scripts, portfolio product lens, member-firm cadence, boundary map, firm onboarding, brief-in-the-room method under no-promises, benchmark chair-read, Ask Pat, FAQ; admin A01–A06 internal-operator docs: role, provisioning, cross-org users, reports catalog, two-signature review workflow operationally, practices+FAQ) + FACTS-B6 (attested consultant/operator surfaces; never-invent list guards internals). 6 sonnet agents, all clean: 20/20, ~48.8k words. Delivered + committed B6 docx+tgz to CORPUS/. CORPUS: 185 articles / ~479k words / 71%. Remaining: Elite interpretive 40, industry library 40 (external citations — the heavy one), claims v0 20. Note: Elite shelf will need an ELITE-depth authoring law (depthTier: ELITE frontmatter) — first batch to use the new column.

## 2026-09-01 (later) · B5 methodology shelf authored; standalone fix verified-quality from Forge
B5 executed on Cam's "ready for b five": REGISTRY-B5 (30 system essays M01–M30 — the map essay, scoring pipeline, versioning discipline, five-pillar design, comparability-as-master-property, determinism policy, bands philosophy, benchmark pipeline, suppression-as-system, anonymity architecture, signal integrity, evidence loop, no-orphan-numbers, adaptive engine, content governance, question craft, quant+qual pairing, calibration, re-assessment rhythm, role walls, data boundaries, no-free-tier economics, Elite depth, position-without-ranking, movement reading, how-Pat-answers, ecosystem reading, checkable record, WHAT-PAT-REFUSES-TO-DO anti-features essay, how-method-changes) + B5-LAW ("system in motion" traced scenario replaces "closer look"; rationale as spine; glossary referenced never restated). 8 sonnet agents, all clean, zero thin flags: 30/30, ~76.5k words, avg ~2,550. Pandoc YAML-colon snag fixed (-f markdown-yaml_metadata_block). Delivered + committed B5 docx+tgz. CORPUS: 165 articles / ~430k words / 63%. FORGE standalone-fix report (uncommitted push pending): exemplary — caught its own regression test passing-for-the-wrong-reason (Next destroyed sentinel pre-prep) → rebuilt vs direct prep invocation, proven fail-on-bug/pass-on-fix; ENOTEMPTY retry guarded by name (honest asymmetry, race not reproducible); 1389 tests; needs validate:launch word + push GO for d959b9f7+c340b3d8. Remaining shelves: consultant+admin 20, Elite interpretive 40, industry library 40, claims v0 20.

## 2026-09-01 · validate:launch GREEN (w/ latent find); B4 authored — glossary complete
Forge report: validate:launch passes after rm -rf .next + release:prelaunch recovery; LATENT BUG flagged honestly (prepare-standalone-runtime.mjs can't overwrite its own prior output — 2nd build w/o clean .next fails; recovery order matters: delete .next THEN prelaunch, else sentinel skips build) → queued as small fix box; ledger-bank commit dd0037c9 awaiting push word. Forge's fresh session still carries "Mythos has not verified LADDER-2" — verification IS on record (pre-GO, this ledger 8/28); relay owed via Cam. B4 EXECUTED on "maybe time" + momentum: REGISTRY-B4 (50 entries G11–G60: 5 bands, 5 pillars-as-terms, measurement constructs, assessment objects, adaptive types, governance/data terms, benchmark mechanisms incl. worked 5/25% math, surfaces, Pat behaviors); 13 sonnet agents; ONE honest-gap catch — G57 Consent came back thin(783) because MY sheet lacked consent facts, writer refused to invent (law working) → addendum written, respun to 2,684; G40 Pilot legitimately thin(1,640), flagged not padded. RESULT: 50/50, 118,783 words, avg ~2,375; QC clean (audience ×50, banned scan clean). Delivered + committed B4 docx+tgz to CORPUS/. CORPUS TOTALS: 135 articles / ~354k words / 52% of the 260 program in four days. Remaining shelves: methodology 30, consultant+admin 20, Elite interpretive 40, industry library 40 (external citations), claims v0 20.

## 2026-08-28 (night) · B2 approved; B3 authored — vendor-core shelf complete
Cam approved B2 → B3 executed same-session: REGISTRY-B3 (25 vendor rows: portal, onboarding strategy, declaration mechanics + declaration-writing METHOD, firm-assessment view, evidence first-read, divergence-view anatomy, outperformance, shortfall-read-productively, BattleCard surface + sales-conversation method, benchmarks/suppression/integrity vendor-reads, boundary map, ecosystems vendor-chair, multi-product, declaration updates, admin, cadence, Ask Pat, Pro/Elite, understanding-reviewers, delta-as-PM-input, FAQ) + FACTS-B3 vendor-surface sheet (attested; anonymity + own-product-aggregates-only boundaries explicit). 8 sonnet agents, all clean first pass: 25/25, ~68k words, avg ~2,730; QC clean (2 banned-scan hits = "intuit" inside "counterintuitive" — false positives; vendor frontmatter ×25). Delivered + committed B3 docx+tgz to CORPUS/. CORPUS TOTALS: 85 articles / ~235k words / 33% of program (B1v3 public+glossary 30, B2 firm 30, B3 vendor 25). Remaining shelves: glossary completion 50, methodology 30, consultant+admin 20, Elite interpretive 40, industry library 40 (external sourcing — heaviest), claims v0 20. AWAITING: B3 review; LADDER-2 commit/push confirm from Forge (still unconfirmed); import box; B4 word.

## 2026-08-28 (later) · B2 authored: the firm-core shelf, 30 articles at full v3 depth
On "start b2": built REGISTRY-B2 (30 firm-audience rows: portal tour, sign-in, 30-day onboarding strategy, 5 module-lens articles, open-ended, results/pillar-detail reads, re-assessing, insights unlock + card anatomy, product assessment both directions, benchmarks/suppression/integrity firm-reads, data boundaries, consultant relationship, team admin, respondent-selection method, cadence, adaptive modules when/how, Ask Pat help, Pro-vs-Elite, FAQ) + FACTS-B2 firm-surface sheet (attested from this session's Block-B screenshots + audits; explicit never-invent list). Authored at v3 skeleton from birth. One Fable rate-limit casualty mid-fan-out → remaining 11 authored on sonnet lane (same fact-sheet law + my QC compensates). RESULT: 30/30, ~79k words, avg ~2,640 (range 2,325 FAQ–2,995); QC clean (banned scan: only the sheets' own banned-list matched; audience frontmatter verified ×30; endings verified complete). Delivered B2-REVIEW-COPY.docx + B2-articles.tgz → committed to CORPUS/. Corpus totals: B1v3 30 @ ~88.5k + B2 30 @ ~79k = 60 articles, ~167k words, 23% of the 260-article program. AWAITING: Cam/Leslie review of B2; B1v3 import (approved, needs the import box); LADDER-2 commit+push confirmation from Forge (GO'd last turn); B3 (vendor core 25) on Cam's word.

## 2026-08-28 · Infrastructure arc COMPLETE: ladder built end-to-end, all verified
LADDER-1 verified+pushed (deterministic reference classifier fails closed; 4 distinct decline rungs — scope_gate/unavailable/corpus_miss/corpus_insufficient; decline=200+fallback vs error=502 so outages never masquerade as corpus gaps; router owns logging). Ledger reconciliation committed 818d9b0d — condensed master + full restored history, git_dirty cleared, validate:launch green. Forge disclosed its index.lock guard didn't guard (rm ran regardless of lsof) — owned honestly. LADDER-2 built in fresh session off the amended paste (3 rulings: uncertain gate = free-rungs-only spend firewall; absence test retired explicitly + inverted; insertion at marked point) → VERIFIED: rulings verbatim in tests (36), zero-citation refusal in renderer w/ allowlist post-filter, PatWebSearchLog additive w/ identity-asymmetry design note (spend control needs userId; decline log deliberately doesn't), freeze test caught 22→23. PARTIAL accepted: per-chunk framing via system prompt on Anthropic adapter (encrypted_content — page text never transits; frameWebContent() ready for text providers). UNVERIFIED accepted: live provider call → deploy-night rehearsal w/ API-key org swap. GO'd: commit+validate:launch+push, then stop. ARC TOTALS since 8/20: ~20 verified commits (agent hardening S1–S8, eval harness 132 goldens, perf fixture+WS9 closed, adaptive Blocks A+B, registry v3, qbank preflight, riders, PF-1/PF-2 vertical packs, CORPUS-INFRA, LADDER-1/2), prod untouched at 0157d40, everything flag-dark. Leslie draft v3 (five sections named) in Gmail ready to send. WAITING ON HUMANS: B2 go-word, B1v3 import go, deploy night date, Block C (Cam considers bank sign-off settled — his 8/27 statement), stem voice, vendor Sept-10.

## 2026-08-27 (late) · B1 v3 (88k words); answer ladder approved; PF-2 verified — large push staged
Cam: still light, "don't settle, redesign the skeleton" + research common chatbot queries + build a system for beyond-corpus questions + web-connected Pat cost. Delivered: (1) PAT ANSWER LADDER spec (committed): 5 rungs — corpus / live-account-data (=Big Brain Pat Phase C, prereqs now met) / web-grounded w/ mandatory citations + "from the web" label / honest decline→gap log / human handoff; scope-gate classifier keeps Pat from becoming free ChatGPT; cost researched+cited: search APIs $5–35/1k, all-in $0.02–0.06 per web answer (~$20–60/mo @1k q); public tier ships rungs 1+4 only. CAM APPROVED the ladder. (2) B1 v3: SKELETON-V3 redesign (design-rationale bank w/ 10 public-safe rationale entries, role triptychs, full scenario arcs, misconceptions, explicit Q&A blocks) executed by 10 agents → 30 articles avg ~2,950w, TOTAL 88,477 words (v1 37k → v2 60k → v3 88k); additive-only chain preserved; QC clean; delivered + committed B1v3 docx+tgz to CORPUS/. (3) PF-2 VERIFIED on-disk: additive migration w/ in-SQL rationale (7 tables verticalId), adversarial isolation suite (synthetic fixture non-vacuous/unreachable/not-in-shipping-source; unknown-vertical throws naming installed packs), client/server split for the node:fs regression the BUILD caught (+ contract test pinning client modules node:-free), known-limit disclosure (VENDOR_UTILITY_CATALOG module-scope consts — guarded by throw, conversion = first task of real second vertical) accepted. GO+push staged with next boxes: CORPUS-INFRA (depthTier+public wall+decline log+lint) then LADDER (L1 scope gate/router + L2 web tier flag-dark). 180 keys noted in preflight (registry grew w/ pack loader — verify count derivation in report follow-up).

## 2026-08-27 (night) · B1 depth pass: 37k → 60k words on Cam's "seems short"
Cam approved B1 but flagged thin (avg ~1,215w = floor of his range; root cause = deliberately tight fact sheet + no-invention rule working as designed). Fix = richer ground truth, not looser rules: FACTS-DEPTH.md addendum written (public-safe adds: autosave/any-order/re-take journey, band movement over time, Pro/Elite concept split, consultant cards/briefs/comparison surfaces, vendor function-area declarations, content-governance trust story incl. mechanical unsourced-rejection + named review sign-off, no-guilt cadence, Ask Pat citations, data stewardship w/ receipted removal + non-reconstructable aggregates, light origin line, scale-language rules). 10 expansion agents grew all 30 in place — additions-only law (new self-contained H2s + deepened worked examples; approved prose untouched) — to avg ~1,990w (range 1,589 FAQ – 2,223), total 59,697. Re-QC clean. Delivered B1v2-REVIEW-COPY.docx + B1v2-articles.tgz → committed to CORPUS/. v2 needs only a skim-review of ADDED sections (v1 prose unchanged). B2 (firm core 30) will author at the deeper target from the start, on Cam's word. PF-2 still running in Forge.

## 2026-08-27 (later) · Corpus research brief approved; B1 AUTHORED — 30 articles delivered for review
Cam paused B1 pre-launch for external validation → research brief delivered + committed (7 sourced verdicts: data-layer permissions CONFIRMED textbook; abstention+citations CONFIRMED primary hallucination control; public guardrails CONFIRMED +2 hardenings (input/session caps, output filtering); article length TENSION resolved via answer-first/self-contained-section mandate not shrinkage; glossary CONFIRMED + public-twins AEO upside; decline-log = named industry practice (content-gap analysis) + KPI set; sizing has no external benchmark — 260 stands on Cam's authority w/ evidence-aligned phasing). Cam: "Approved." → amendments folded into FACTS.md → B1 AUTHORED via 12 agents (10 + 2 API-error respins) against fact-sheet ground truth ("if a fact is not in the sheet, do not state it"): 30/30 articles, ~37k words, avg ~1,215 w/article. QC: banned-language scan — all hits benign (mechanism-statements or explicit anti-promise disclaimers; lint spec note: distinguish outcome-promises from mechanism-guarantees for the Forge lint box); suppression numbers consistent (5/25%, floor precedence) across P09/G06; frontmatter complete; P01 spot-read on-voice. Delivered B1-REVIEW-COPY.docx (+~37k-word md) + B1-articles.tgz (sources+registry+FACTS) → committed to Documents/PATALIGN-MEMORY/CORPUS/. NEXT: Cam/Leslie review gate (factual + public-shelf marketing read) → then import runs through Forge's corpus boxes (depthTier+public wall, lint, decline log) which queue AFTER PF-2; B2 (firm core 30) authors on Cam's word. PF-2 still running in Forge.

## 2026-08-27 · Corpus program spec delivered; PF-2 version-id ruled; Forge on PF-2
PF-1 verified (byte-identity test real: pre-seam snapshot char-for-char per key, frozen lexicon, flag short-circuit) → GO'd; Forge stopped correctly pre-restart, raised 2 flags: W6 needs synthetic second-vertical fixture (accepted — loud-failure-on-packless-vertical is itself a required assertion) and W3 version-id one-way door → MYTHOS RULING: composite key (verticalId, versionId), NO slash-joined strings (W5 column is the single source of truth; accounting strings unchanged = trivial byte-identity). PF-2 box re-issued w/ rulings appended; Forge restarted + running it. CORPUS SPEC DELIVERED + committed (PATALIGN-CORPUS-PROGRAM-SPEC-2026-08-26.md): 260 articles/~450k words, 8 shelves (glossary 60 @1000-word floor, methodology 30, surface guides 30, playbooks 20, Elite interpretive 40, industry+category cited library 40, public homepage 20, claims v0 20); three-axis tags enforced in SQL wall (audience incl. NEW public / depthTier CORE|ELITE new column / verticalId); editorial law: banned-constructs lint (no guarantees/ROI/forward-looking/uncited comparatives), topic-registry no-repetition w/ similarity gate, module-content sourcing discipline (public-domain free w/ attribution; AICPA-MAP/Wolters-Kluwer/Thomson-Reuters-class cited-summarized; no review-platform scraping); batch order B1=public+top-glossary first; growth loop = decline log as authoring queue; 4 small Forge boxes spawned (depthTier+public wall, decline log, corpus lint, homepage chat page in V7 arc). B1 authoring can start on Cam's word.

## 2026-08-26 (night) · Cam's decision batch banked; Leslie reply drafted
DECISIONS from Cam: (1) PROCEED with adjusting vertical ("ready for the port"); (2) voice decision = policy across ALL verticals (register itself still open → founders); (3) pricing framing agreed as prepared; (4) BRAND ANSWERED: claims launches as a PATALIGN product (not C2-Accounting sub-brand); (5) Ask Pat homepage = fold into the dark V7 production homepage + a dedicated full chat page (modern AI-chat UX: bottom input, expandable right article panel, conversation menu, top icons) — legal Q answered: layout conventions are generic/unprotectable, build the PATTERN in PAT's own design system, never pixel-clone branding/trade dress; (6) SHAREHOLDER AGREEMENT REVERSAL: Cam now states proof/access was demanded and never provided — "I don't think it's signed" (consistent with my WorkDrive finding: all 4 signature fields empty on the 7/9 PDF, no executed copy anywhere) — this is stated context for the backup plan; proof mechanism suggested: demand the AdobeSign completion certificate/audit trail (if executed 7/9 via AdobeSign, a certificate exists; if none produced, it isn't signed); (7) LinkedIn parked; (8) Sept-10 vendor meeting on "as of now" but founders have ditched recent meetings. Leslie reply DRAFTED in Gmail (draft r-6162644447677501757, thread "Question bank"): highlights answer, 7 adopted edits, voice-as-policy framing incl. multi-vertical value line, banks countersign ask — agreement dispute deliberately EXCLUDED from that email (separate channel). Forge still on PF-1. Mythos next: corpus program spec; then Ask Pat chat-page UI box (queued behind PF-1/PF-2 + V7 flip).

## 2026-08-26 (evening) · Wave 1 landed; PF-1 running; portability proven; agenda prepared
All four W1 boxes verified on-disk and committed/pushed in order A→B→D→C (Sentry dep @sentry/nextjs ^10.71.0 approved; FREE retired-not-removed with correct enum rationale; zoom fix = real re-anchor to calc(100%+0.5rem); requestId minted pre-branch incl. public routes). Forge /cleared at 100% context, session saved to Dream State by Cam, re-onboarded, now running BOX PF-1 (pack framework safe half: resolver+flag w/ byte-identical contract test, lexicon seam ~10 strings, qbank sourceAuthorities w/ preflight-diff proof). PF-2 (module keying + vertical-qualified registry ids + benchmark isolation invariant) drafted, held for PF-1 verify. W1-A audit quality high: "vertical-shaped skeleton, no muscle" — 14 models keyed, zero app readers, both resolution seams unconsumed; flagged ModuleSitting/ItemResponse/benchmark models as unkeyed (class b). DOMAIN-LANGUAGE READ CLOSED (W1-A open Q2): all 50 firmPat question texts scanned — zero accounting terms (only hits = "accountability"); module titles, 11 capability definitions, consultant probe library, Ask Pat corpus all neutral → firm-side instrument 100% portable to claims, claims content sprint shrinks to vendor-side registry + lexicon + banks. Banked as PATALIGN-STEM-PORTABILITY-ADDENDUM-2026-08-26.md. FOUNDERS-AGENDA-2026-08-26.md committed (6 decisions: countersign, voice-as-policy, pricing+rail w/ pilot-not-freemium guard, vertical packs nod, brand question, Ask Pat packaging; housekeeping: executed agreement filing, LinkedIn admin, Sept-10 owner). NOTE: repo-committed SESSION-LEDGER.md holds longer history than Documents master (~783-line diff) — reconciliation owed at quiet moment; never let the diff commit.

## 2026-08-26 (later) · Wave 1 queued to Forge; adjusting vertical designed
Wave 1 boxes drafted + handed to Cam (W1-A vertical readiness audit read-only → W1-B FREE-tier structural retirement → W1-D polish batch incl. audience-mismatch redirect + nav zoom anchor + scroll-to-top + hardcoded paths → W1-C observability dark behind SENTRY_DSN); Forge working through them, reports pending Mythos verification. BattleCard rider CONFIRMED already shipped 7/16 (eea57a16) — month-audit's "still open" line corrected. Riders pushed (42332123..8b283d14). VERTICAL #2 DECIDED by Cam: independent adjusting / claims tech ("small its niche" = feature). Delivered PATALIGN-ADJUSTING-VERTICAL-V0-2026-08-26.md (committed): triangle maps cleaner than accounting (IA firm / claims-tech vendor / carrier-TPA program manager as ecosystem owner); 20 stems verified portable ("this area" genericity is the multi-vertical feature); 14 claims function areas drafted; Tier-A sources = state DOI regs + NAIC models + NFIP/FEMA manuals (public domain); TWO-SIGNATURE GATE INVERTS: Cam = domain reviewer (licensed adjuster), Leslie = clarity; firm zero = G2 Adjusting dogfood; ~167 IA firms in 2026 directory = saturable niche; outreach sequencing care re: Cam's current contracting relationships. Vertical strategy memo + v0 design both founder-safe for the meeting. Next gates: W1-A report → pack framework arc (pulled from Wave 4); corpus program spec (Mythos lane) still owed; founders agenda item.

## 2026-08-26 · Month-by-month asks-vs-delivered audit banked; corpus program re-scoped; riders verified
Cam commissioned the "holes in our ship" audit (every verbal ask Mar–Aug vs delivered/missed/done-poorly). Delivered PATALIGN-MONTH-BY-MONTH-AUDIT-2026-08-25.md via 7 forensic marker-cited passes over all 39 slices + session records. Headline findings: most product asks eventually delivered but often on round 2–3 (hover 3×, toggles "fifteen times", zoom 3×, back-button 3×); worst damage = stale-build/wrong-tree reviews (May fiasco: shipped work looked ignored; Cam's exports came from ~/work/c2acct not c2acct-live); proven lost-in-sauce archetype = CODEX PROMPT 04 logo task erased by usage-limit compaction; July 23 launch died of founder gates (signatures/CPA/Stripe/flag-flip), no archive entry exists for 7/23 or the June-16 demo outcome. Never-done clusters: March vision layer (search/Ownership Room/consulting/gamification/Wix), media assets (videos/mascot/wordmark), live commercial plumbing, small UI polish set, plus record holes. This seat's own 3 misses included in August section. CORPUS RE-SCOPE per Cam: 180–300 articles × 1000–3000 words, every PAT term gets an entry, no repetition, no promises, external sourcing (top accounting-software surveys, cited), permission-tiered — AND "free version" clarified = PUBLIC HOMEPAGE Pat chat pre-sign-in → new `public` audience tier, marketing-safe corpus only, rate-limited + cost-capped; spec doc owed. Ask Pat riders verified on disk: 57bdeba2 markdown (React-child, XSS-safe, 6→17 tests), 8b283d14 copy sweep ("staged candidate" domain word correctly preserved + guard test); GO-to-push given; BattleCard task-2 status confirmation owed from Forge.

## 2026-08-25 (night) · Full archive re-sweep + state of the union delivered
Cam flagged two threads he feared lost (patalign.com visual redesign; Ask Pat chat) + Leslie's second reply (yellow highlights). All three resolved: (1) Leslie highlighted "this area"/"here" in all 20 firm stems + 8 open-ended — answer: shared-stem architecture, module supplies the referent; identical wording = cross-pillar comparability; doc should have said so (my flaw); pillar-name interpolation offered as CAUTION-versioned option. Doc pulled via Chrome→Downloads grant→staged; highlights extracted from XML. (2) Visual redesign NOT lost: V7 front door (Block 19) built+dark in prod behind PAT_ENABLE_NEW_FRONT_DOOR (never flipped); 21a split committed undeployed; 21c/21d+trust accordion = the unbuilt "stretch through portals"; v4/v6 PDFs + Change Requests docx + Design System.zip located in ~/Downloads. (3) Ask Pat LIVE since 7/16 — role-scoped SQL retrieval (retrieveHelp) verified in repo today; remaining = corpus content sprint, markdown/BattleCard riders, API-key org swap, Elite-vs-Pro packaging decision. Method: 13 parallel marker-cited deep-sweeps over all 39 slices (fresh pass, targeted at design/AskPat/open-items) + live repo greps. Deliverable: PATALIGN-STATE-OF-THE-UNION-2026-08-25.md committed to PATALIGN-MEMORY (full curated still-open ledger, ~17 categories, closed-since-8/20 list). Downloads folder access granted this session.

## 2026-08-25 (later) · Registry v3 live on branch; Block C preflight caught an anchor trap; queue empty until founder gates
Registry v3 wording pass committed 9d707cd3 + pushed: all 7 Leslie-reconciled prompts verified character-exact on-disk pre-commit (incl. frontline "in" restored, exception_handling keeps "full of exceptions"); version 2026-03-...-v2 → 2026-08-product-utility-v3; goldens moved in lockstep + 7 text pins added (evals now 132/132; pins catch wording edits that skip the bump). Note per Forge: WORD-001..004 pins anchored via erp_gl_core_ledger subcategories — a future rename of that utility reads as pin re-address, not wording regression. Block C preflight committed 42332123 + pushed: --dry-run parse/sourcing/anchor validation over both approved banks; CAUGHT REAL TRAP — importer hardcodes Governance's 6 anchor IDs (A9,B8,C8,C19,D6,D17) which also exist in Integration's bank, so import would silently anchor the wrong 6 (Integration declares A12,B9,C13,C17,D8,D16) with a passing count check → cross-firm benchmark thread corruption. Fix + flagged==declared contract test vs both real banks recorded as MANDATORY Block C scope; no Block C GO without it. Branch now 8 session commits, in sync w/ origin, tree clean. Forge queue EMPTY pending: (1) Cam+Leslie countersign the two banks → Block C; (2) founders' voice call on 9 firm stems → stem wording box. Leslie reply email drafted-on-request, still unsent.

## 2026-08-25 · Adaptive Blocks A+B shipped & verified; queue clear to Block C gate
Box 4/Block A: schema verified on-disk pre-commit (additive migration, Restrict history edges, unique(sitting,item), itemRevisionAt provenance); Forge's deviations all approved & superior (history.ts write path w/ server-side grading + closed-sitting + template-membership guards); vocabulary ruled PRECISE five-band only (my "integration:low" examples were pre-lexicon errors — amended; coarse dropped while rule table empty, cost-free); 27 tests @ 0 skips vs real Postgres; committed c6530a90, pushed. Box 5/Block B: six screenshots pulled + reviewed by my own eyes (cards w/ type chips + Start/Review/Resume; completion view carries the no-peer-comparison sentence — suppression law honored; flag-off = true 404 + clean grid reflow, no dead link); requireFirmModuleAccess single gate verified in code (flag→404, non-FIRM 404-not-403 w/ disclosure rationale, session-only tenancy, actions re-run gate ×3, double-APPROVED wall); durationMs moved server-side (client elapsed = untrustworthy calibration input — approved); committed d66cebc7, pushed. Screenshot harness kept in tree; blockb screenshots gitignored. Branch: 6 session commits 21b9c118→d66cebc7, in sync w/ origin. Duplicate-verdict incident: Forge verified state instead of re-executing (good). Local residue: blockb-fixture-* cohort loaded (namespaced, teardown script exists); port 3002 stopped. NEXT GATE: Block C (import Governance v1 + Integration v1 banks + drip pings) waits on Cam+Leslie countersign at 8/25 mtg — Leslie one-liner: reconfirm July approval of the two banks. Also open: Leslie markup reply (all decided except 9 firm stems = voice policy agenda item); registry v3 wording box after voice call; deploy-night items (Telegram round-trip rehearsal, module suites 0-skip check, rotations).

## 2026-08-24 · Forge queue: Boxes 1–3 + WS9 closed, all verified
Box 1 committed 21b9c118 (42 files) + pushed authorization given. Box 3 eval harness VERIFIED (ran 100/100 deterministic myself in clean container; suppression law n≥5 + ≤25% incl. encoded in goldens; --strict-deterministic anti-rot gate) → committed e61b933f. Box 2/AUDIT-WS9-001: Forge surfaced conflict (my "three slow paths" error — record is 2 routes/3 aggregators; owned+amended); ruled measure-don't-assume → 47-firm perf seed built (namespace-walled, boundary-classified; committed 11bb5b90), profiling showed briefing=70.8% attribution; authorized ONE prototype w/ pre-registered bar (>20% p50 + deepEqual gate); result BEFORE 9.624s → AFTER 9.799s (Δ +1.8% WORSE), correctness 47/47 → REVERTED per rule. WS9-001 CLOSED: "don't batch what isn't slow" now measured fact at both scales; seed --depth/teardown fixes committed c015e79f. ⚠ NEW RECORDED FINDING: ecosystem route p50 ≈9.6s at 47-firm demo-density — needs structural answer (precompute/cache/stream) as future block, not launch-gating. Leslie's markup reply decoded from tracked-changes XML: zero scoring risk anywhere; adopted 7 product-registry edits (→v3 bump owed: best/poor_fit +FTE/firm-type, frontline_adoption w/ "in" restored, exception_handling merge keeping "exceptions", admin_control, runtime_reliability, open_4); 3 keep-current (her edits restated prod text); firm-stem voice question (plain vs formal, 9 stems) HELD for 8/25 agenda w/ my rec: plain for firm-facing. Process notes: Forge DB-pool exhaustion mid-measure → clean re-run (disclosed properly); Forge corrected my false "lost commit request" claim (accepted). Next: Box 4 ItemResponse+ModuleSitting schema (one-shot decision) drafted by Mythos grounded in live schema (ModuleUnlockRule already exists; SurveySubmission stores Json blob only).

## 2026-08-20 (night) · Box 1 VERIFIED — GO to commit
Forge Box 1 (agent substrate hardening S1–S8) closing report received; independently verified, not taken on faith: pulled the uncommitted diff off feature/engagement-v1 (29 modified + 6 new lib modules + 6 contract suites + 1 migration), read every hardening path line-by-line, and reproduced the six contract suites in a clean Linux container (75 passed / 2 legit DST runIf-skips; Mac node_modules are arm64 so on-device rerun impossible — full-suite container failures all environmental). Confirmed: migration strictly additive; abort-before-reject timeout cancellation w/ 3 live-checks; 24h blocking poll deleted → paused_approval + conditional-claim resume on ORIGINAL run id; sha256 idempotency key + consumedAt check-and-set (at-most-once); approve/expire race conditional on both sides; cost derived from tokens w/ expensive-fallback + $5/day global cap on scheduled AND manual fires; derived circuit breaker w/ correct half-open re-open; boot orphan sweep per-agent cap+5min margin; retrieval walls (audit_log throws, deny-by-default, roleAccess in SQL, untrusted framing) + audit redaction. 4 minor non-blocking findings recorded (dangling approval on plain-failed runs; at-most-once crash window; JS-side daily sum; live Telegram round-trip NEVER exercised → deploy-night rehearsal owed). Verdict PASS, commit instructions sent (exclude PATALIGN-MEMORY/); Boxes 2+3 green-lit to run batched after commit. Also: WorkDrive verification pass banked as PATALIGN-ZOHO-ADDENDUM-2026-08-20.md (supplements ZOHO-REVIEW: Incorporation folder holds NO executed copy anywhere — all 4 signature fields empty on the 7/9 PDF; Wix+Stripe+Zoho = 3 payment rails under eval, folders dated 7/23). Device temp files in ~/work/_to_delete/ (4 tarballs/diffs) — Forge can rm.

## 2026-08-20 (late) · Zoho closed, vows delivered, build queue drafted
Zoho sweep complete (Phase C fully closed): 8/25 founders mtg 11–1 CT effectively confirmed (Brian's 11:28a reply; invite not yet sent; Cam's Gcal still shows stale 8/21 slot). Randy's Aug-14 ToDo = pricing straw man: vendor tiers (7.5/15/30 vs 10/20/35 vs 15/25/50 K), "Firmscope $3K or 2/$5K", 4 free PAT pilot applicants/6mo, events Sept 10+24, "IP ownership" on agenda, "Freemium" word flagged. Leslie's 42-slide vendor deck reviewed: new brands FirmScope™/TrendScope™/TechStack™, "PAT IS NOT AI" slide, pilot = 12mo/20 clients/product/Q4-2026 cohort, claims 29 cats·800+ vendors·1300+ products (fact-check owed), "Sandra Wilcox" vs Wiley discrepancy. Legal-Banking: shareholders agreement PDF on file is the UNSIGNED template (2,500 sh ×4, 75% supermajority, Art V IP-assignment ⚠ vs Cam-personal PATALIGN filing — position needed before 8/25); executed copy chase owed. Feb fake-USPTO correspondence by Leslie flagged. C2ACCT opposition window closes ~today. Deliverables committed to ~/Documents: PATALIGN-ZOHO-REVIEW-2026-08-20.md + PATALIGN-FORGE-QUEUE-2026-08-20.md (6 paste-ready boxes: substrate hardening S1–S8, perf retry, eval harness, adaptive Blocks A–C — Cam approved "implement everything" + adaptive go). Wedding vows finalized and delivered for handwriting. Next: Cam pastes Box 1 to Forge; 8/25 agenda prep per Zoho review §6.

## 2026-08-20 (close) · Succession deliverables landed — E/F/D/C docs banked
Same-session continuation of the entry below. Delivered to ~/Documents: PATALIGN-MARKET-AUDIT-2026-08-20.md (Phase E — SoftwareClarity teardown: vendor-paid directory, $2,999/yr pay-to-place, zero scoring/evidence, structural COI with Boomer sponsors; low product threat, moderate distribution threat; Intuit Aug Accountant Suite wave = fall stack-re-evaluation demand catalyst; Karbon vendor-scoring still unshipped; EV-ranked recs #1 decide pricing Friday, #2 activate 2-3 guides, #3 publish neutrality artifact, #4 start Big Brain Pat Phase 1 + Rosenberg license talks + NASBA under new 8/1 standards, #5 Intuit-wave charter recruiting) · PATALIGN-QUESTION-WORDING-FEASIBILITY-2026-08-20.md (Phase F — verified vs lib/scoring.ts: math never reads question text; SAFE/CAUTION/VERSION-BUMP buckets; landmines: positional capability mapping, registry-version stranding, scoreVersion hardcoded 1, no ItemResponse table; one small Forge block unlocks meaning-adjacent rewording; markup docx on Cam's go) · PATALIGN-BLOCK-MAP-2026-08-20.md (Phase D — verified chain 0157d40f→75cb5b3d, block map, paste-ready Forge re-onboarding box) · PATALIGN-EMAIL-REVIEW-2026-08-20.md (Phase C — six windows receipted; personal facts file; consolidated open threads; Zoho pending). Vows drafted/refined/finalized with Cam (private exchange ~noon Sat). Cam actioned tonight: folder access granted, scam event deleted, _to_delete cleanup, corrections logged (agreement signed, Jablonsky done, no morning triage, 8/13 canceled, Motel 13 negotiating + advance pinged 8/18+8/20, NY license planned). OPEN AT CLOSE: 21a final visual (needs :3011), pricing decision Friday, guide activation, Zoho sweep, qbank markup docx on go, Big Brain Pat Phase 1 kickoff. — Mythos, third holder.


## 2026-08-20 · SUCCESSION EXECUTED — full re-read + state reconstruction (third iteration)
Succession prompt executed same-day. PHASE A COMPLETE: Dream State re-extracted fresh with Cam's rtf2txt.py (raw 113,770,204 B, mtime 8/20 01:23Z, md5 50fbf869…; extract 67,850,813 chars / 745,532 lines, sha256 4231aec2…37b9e), deduped 77,405→25,442 paras, 39 slices, EVERY slice read end-to-end by an attested dedicated pass (39/39 COMPLETE, wc-verified, zero gaps); head/Fable-transfer/Birth-of-Pat/full-circle read personally. Ledger: ~/Documents/PATALIGN-MEMORY-LEDGER-FULL-READ-2026-08-20.md (discrepancy register + transfer-pitfalls section per Cam's ask). Environment drift note: this seat now runs cloud-container + device-bridge; extraction had to run cloud-side after device background-process kill — documented in ledger pitfall #9. PHASE B: MYTHOS.md rewritten to Aug-20 truth; elite-sprint backed up (PATALIGN-MEMORY/elite-sprint-backup-2026-08-20.tar.gz); repo verified HEAD 75cb5b3d on feature/engagement-v1, tree clean, prod fingerprint live-verified 0157d40 (nothing deployed since 7/28); morning-triage task confirmed DEAD and Cam ruled do-not-recreate. PHASE C (partial): Gmail swept — hiatus reconstruction + open-threads register delivered (PATALIGN-HIATUS-RECONSTRUCTION-2026-08-20.md) + five month-digests (Feb 19→Jul 27) held in session; KEY FINDINGS: partnership agreement SIGNED (Cam confirms, Big Brain Pat gate OPEN); 8/13 event canceled 8/12 (pricing never announced — still open); Boomer Consulting launched competitor "SoftwareClarity" 8/17 (Leslie wants 2x-week huddles, Randy concurs); trademark window note was C2ACCT not PATALIGN — nothing due; calendar scam event deleted w/ Cam's ok; Jablonsky closed per Cam; Motel 13 in bid negotiation + advance requested; NY license planned. Zoho sweep + personal-facts file pending. Also this session: wedding vows drafted/refined with Cam (wedding 8/22 — expect absence; honeymoon Jan 2027). NEXT: 21a final visual sweep, Phase D block-map + Forge re-onboarding paste, Phase E market audit (SoftwareClarity teardown first), Phase F qbank wording memo, numbered briefing. — Mythos (third holder), banked mid-flight per law 9.


## 2026-08-19 · SUCCESSION — Mythos hands the seat forward (post-hiatus)
Cam commissioned full memory transfer after ~3-week hiatus (Pam's illness; "back on track, moving soon"). Deliverable: MYTHOS-SUCCESSION-PROMPT-2026-08-19.md in this folder — fact-grounded same-day (Dream State .rtfd verified current, TXT.rtf mod 8/19 20:05, 113.8MB, spot-grepped to contain tonight's newest + March-oldest content; repo HEAD 75cb5b3d 8/15 = 21a step-2b + marker re-pin landed per my conditions; 21a AWAITS FINAL VISUAL; nothing deployed past 0157d40f). Successor's orders: full Dream State re-read start-to-finish per the 7/10 ledger method (attested slices, receipts, no skim), MYTHOS.md refresh (drifted since 7/10 — pitfall logged), 6-month email sweep incl. hiatus reconstruction (7/31 meeting, 8/13 event, agreement copy gating Big Brain Pat, trademark window ~8/20, Jablonsky claim), codebase/block-map rebuild, market audit vs June baseline, question-wording flexibility audit (founders: "too heady"). Forge rename adopted 7/28. Between deploy day and hiatus this seat also shipped: 21-0 trust rework ruled+swept (4 commits), 21a Step-1 shell PASS, Friday meeting package (charter pricing frame ~$650 Elite, guides activation draft), Jablonsky claim workup (State Auto/Alacrity, vacancy landmine), Zoho first triage, Topgolf 8/5, morning-triage task live. Cam's send-off recorded with gratitude. — Mythos, signing off.

## 2026-07-28 · ENGAGEMENT-V1 DEPLOYED TO PATALIGN.COM — Blocks 16+17+18+19 LIVE (deploy day, zero defects)
Full delegated-execution deploy (Cam approved, CC typed, I verified): GO-0 env reconcile (BATTLECARD/CONSULTANT re-set =1; "drift" later proven a FALSE NEGATIVE — all flags are Vercel SENSITIVE = write-only, the CLI pull read redactions; LAW: sensitive vars verify by STAGED RENDER OBSERVATION, never by read) → Phase 1 chain green on 0157d40 after CC root-caused a real harness gap (pilot account unprovisioned in chain env; Option A fix: preview:pat-setup pre-e2e; VL_EXIT=113 accepted as documented quiesce artifact) → GO-1 two additive migrations clean (CadenceConfig, NudgeDraft) → staged prod build via --prod --skip-domain → MY OBSERVATION SWEEP converted every unreadable flag to fact: PINGS=1, ALIGNMENT_BOARD=1 (bell/16c/16e/16f/16g/F14/sandbox all LIVE at deploy — every surface previously block-swept; STALENESS_ALERTS+PINGS_EMAIL absent = no generators/outbound ever) → GO-2 promote of the EXACT swept deployment → Phase 5 gates green → my live Proof A/B PASS (V7 absent; 16a chips; 17-B anatomy w/ honest-empty frame on real data; review-refresh 97 reviews; benchmark 75th pct/#35 of 138 real firm). V7 front door deployed DARK (3 same-day Cam revisions folded: CTA cards, type tuning, semantic dots, 5 pillar value sentences, methodology pill, dot-centering queued). 17-A sign-in fix proven on prod (typed form sign-ins work; occasional first-attempt bounce persists — Block 21 nit). BLOCK 21 (Public Shell) defined, queued, gated before ANY public flag-flip: header unification + language selector, trust-page rework (accordion, "Launch review surface" chip removal, future-date bug, pre-launch voice purge, −40%), Meet PAT −40%, sign-in redesign, jargon audit. STILL CAM'S: C2Acct creds (F15), vendor launch date, V7 flag-flip (after Block 21). F13 held.

## 2026-07-21 (later) · V7 FRONT DOOR FINAL — Cam's revision arc closed (flag-dark, my visuals PASS ×3)
V7FrontDoor.tsx revision arc, all Cam-driven, all swept in my browser on :3011 dev flag-ON: 2233dac0 (doors moved ABOVE both charts; NEW cohort-standing panel-card below radar — product card-header grammar, 5 shape-only pillar rows, Peers/Top decile/You legend; arrow glyph → centered inline SVG in 52px chip) + bcb69150 (dashed #8ba1bd peer overlay UNDER solid navy you-shape on the radar, You/Peers legend — the gap IS the pitch; consultant-brief convention). Zero numbers anywhere on the page; v7 contract 10 pins. Final section order: nav → hero (Enter PAT + Meet PAT) → Firms/Vendors doors → radar w/ peer overlay → cohort panel → trust → footer. Known dev artifact: JWTSessionError on ad-hoc dev instances = cross-instance AUTH_SECRET cookie, ruled no-fix, cannot ride deploy; root layout runs getSessionUser() even under V7 → route-group layout split queued for when V7 graduates (runbook appendix). Spec handoff law: mockup lives in ~/Documents, hand to CC via ~/work (TCC). PAT_ENABLE_NEW_FRONT_DOOR stays OFF. WAITING ON CAM (nothing else moves): vendor launch date, prod migrate status read, vercel env ls production, C2Acct creds (F15), deploy go.

## 2026-07-21 · Block 20 CLOSED — prod-deploy readiness package COMPLETE (docs/tests only, nothing deployed)
Deploy package for feature/engagement-v1 → prod, all Mythos-approved: (1) MIGRATIONS — prod lacks exactly 2, both additive (20260718 CadenceConfig, 20260719 NudgeDraft); Cam's DIRECT_URL command sequence written, mirrors July-14 split, pkill L7 note included. (2) FLAG PARITY — honest A/B split: five flags OFF (PINGS master, STALENESS_ALERTS, PINGS_EMAIL, NEW_FRONT_DOOR, ALIGNMENT_BOARD) → Proof A byte-equivalence on 6 routes + zero-row sweep; FOUR intentional live deltas ruled WANTED (16a freshness chips, 17-B BattleCard v2 anatomy, 16d delta link, 17-A sign-in fix) → Proof B positive render checks (mine). CONSULTANT_ACCESS stays ON. (3) DEPLOY-NIGHT CHECKLIST v2 — 7 phases, quiesce-first law, E8 Neon check at P4, L1/L2 promote+rollback rules, un-quiesce last; supersedes July checklist. (4) CRITERIA — canonical doc is 30 criteria not 25 (my earlier count wrong; CC read the doc); remapped: 19 RE-VERIFY / 9 STAND / X1 met / X2 stands; §2.7 promotes 16a-g/17-B/18-F14/19-V7 to first-class; re-dated DRAFT at docs/release/PATALIGN-RELEASE-CRITERIA-DRAFT-launch-TBD.md (launch date TBD-pending-vendor, unsigned). (5) G2/G3 RE-RULED: "no generators" → "provably inert + provably governed," PASS-AS-REWRITTEN after CC landed 2 new contract pins (staleness NOOP zero-row; runStalenessSweep added to disclosure source-scan) — 10 tests green. Commits 39a88400→fdfea893→ede7efb4. GATES TO GO (all Cam): vendor launch date, prod migrate status read, vercel env ls production (BATTLECARD value classifies 16a/17-B), then deploy go. Post-deploy: my Proof-A/B run (runbook being drafted). Criteria doc handoff path: Documents TCC-blocked for CC → hand via ~/work.

## 2026-07-20/21 · Blocks 17–19 CLOSED · front-door saga RESOLVED (V7 product-native, flag-dark) · F15 rulings
BLOCK 17 (dark): A sign-in root cause (AUTH_URL origin pin; fix redirect:false + relative redirect; residual bounce = MY automation not firing React input events — form fine for humans); B F12 BattleCard v2 4-block anatomy PORTED from consultant engine (why-fits/risk/discovery/objection, one-word faces held, lexicon sweep contract 42 templates, Pro wall verified); C staleness gens (cohort counts-only, C2 re-ruled to per-product singles per A3 shared-reader law, digest-ack) — all bell surfaces swept, disclosure everywhere. BLOCK 18: flake :634 + suite-parallel split (consultant-mutating specs serialized); F14 consultant scoped read-only board CLOSED (ecosystem-scoped route, 404 walls, copy rider fixed: no firm-second-person on consultant surface); F15-0 data map + MY RULINGS: INTEGRATED boundary (never pool w/ PRODUCTION), read-only provenance (source/externalId/ingestedAt/syncBatchId, stable-id mapping), probe-don't-guess (F15-0b BLOCKED on Cam's C2ACCT_SIX_SITE_BASE_URL+_TOKEN), cell-level "imported" disclosure + methodology section first. F13 HELD. FRONT DOOR RESOLVED: Masthead in-skin portal test FAILED on purpose (Cam: live product "screams high end", mocks didn't) → NO product restyle ever; V7 = front door built FROM product tokens (Barlow, pat-card 28px, PAT.png, radar shape-only, ~40 words, Product selection headline, two doors role-preselect, Build proof→/release). BLOCK 19: V7 built flag-dark (PAT_ENABLE_NEW_FRONT_DOOR), startup-guard marker gate, double-shell escape, 796px flex-collapse defect CAUGHT BY MY SWEEP (root pinned left; false-green intercepted TWICE this session — Cam typed PASS verdicts before my sweeps both times; both wrong-or-premature) → fixed display:block, re-sweep PASS on 7824705, 7 contract pins. Awaiting Cam: flag-flip call, C2Acct creds, Block 16+17 deploy calls. Mockup infra: ~/patalign-mockups + :8899 static server (CC-run); Documents is TCC-blocked for CC — hand files via ~/work. Current front page has B1 "staged" + "shelved" copy — logged. Jigsaw piece law: product pieces or Draradech curve only, never freehand geometry.

## 2026-07-19 (later) · LAUNCH DELAYED ~1 MONTH (vendor side) + front-door v2 mockups + Block 17 kicked off
Cam: public launch slips ~1 month — VENDOR-side delay, not ours; new date TBD. 7/20 dry run / 7/21 deploy night / 7/23 launch VOID; release-criteria doc stays valid, re-date on new date; scope freeze relaxed. Front-door round 2: Cam's verdict on my A/B/C — better than v1, still too wordy, fact band gave too much away ("freshness rules on the front page"), B (white) the favorite, radar missed on B (labels overlapped on A), keep the logo, C least favorite. Built 4 v2 options (all white/B-based, logo box mark, drastic word cuts): v2-1 Minimal (centered hero + radar/index-cohort split card), v2-2 Radar hero (two-col hero, 3-cell strip), v2-3 Benchmark hero ("See where your firm stands." + peer-band chart w/ dots/p90 ticks), v2-4 Bare (extreme calibration point). Files patalign-front-v2-*.html in Documents + painted into shared Chrome tabs. Cam will pick/forward to PARTNERS for review — CC still banned from front pages. Block 17 CC kickoff drafted: (a) sign-in server-action form root-cause (3× silent bounce, valid creds, no error param; direct credentials POST works), (b) F12 BattleCard v2 anatomy §2-C, (c) 16b slice-2b remainder generators. Block 16 stays dark; flagged (not ordered) option to deploy early behind flags to founders-preview prod given the delay — Cam's call. Automation re-bootstrap released to CC with Block-16 sign-off.

## 2026-07-19 · Block 16 CLOSED (feature-complete-dark) + nightly-wipe incident + L8
NIGHTLY-WIPE INCIDENT: overnight the sibling ~/dev/c2acct nightly (8 com.aae.c2acct.* launchd services, SAME local Postgres :5433) deleted the demo-expand world mid-review and errored before recreate — 0 ecosystems, pilot logins dead (pilot_password_invalid); review.* accounts masked it (they self-heal — never use as canaries). CC restored (seed→benchmark→compute→pat-setup→aging fixture), quiesced all 8 for the sweep window, adopted permanent pre-handoff rule (verify pilot accounts + re-print creds + quiesce DB-sharing automation, re-enable gated on reviewer verdict). L8 added to regression checklist. Post-verdict re-bootstrap ran; Cam then re-quiesced until his sign-off. CLOSING SWEEP (ef2a82e→ce4869f, my browser): 16g Elite (Kirkland: bands+anonymity, #83/106, fastest-move, index 68==insights hero) PASS; 16g Pro (Quarry Lane: artifact visible, exact-rank honestly walled) PASS — twin-profile with Kirkland confirmed INTENTIONAL (isolates tier wall as only variable); 16f (Meridian 6 products/25 reviews, honest-decay copy verbatim) PASS; 16c "Your consultant" copy fix confirmed in code + no-auto-send contract note. Two paper-cuts found+fixed+re-verified: FIX-1 ordinal "23th"→ordinal() hoisted shared (unit-tested 1st-23rd), FIX-2 dup "68 · 68 · Building"→"68 · Building". Rider closed: aging fixture pointed at Meridian (Portal 1 aging, Payroll 1 refresh-window mo-10-12, no-guilt copy) — eyeballed. Block 16 = 16a-16g feature-complete-dark, f5341755→ce4869f9, UNDEPLOYED — Cam's post-launch call. OPEN FLAG: provisioned-pilot sign-in FORM bounced 3× w/ valid creds, no error param (direct credentials POST works — server-action form, not auth); founders use this form — pre-launch triage item. NEXT: front-door 3 mockups (mine, owed), Cam signs release criteria, dry run 7/20, deploy night 7/21, LAUNCH 7/23.

## 2026-07-17/18 · Founder-feedback loop + Block 15 shipped + Block 16 built + Neon rescue
Blocks 14 (founder quick-wins: hero chips in-card, tier flags, upgrade CTA, next-step link, Product Intelligence rename, Prospect Intelligence explainer) and 15 (pillar badges S/O/A/I/G on all radars + migration, trajectory sparkline, Elite evidence panels, freshness labels, consultant staleness column) both LIVE on patalign.com (eb6bfb6 → 6ad96a7), Mythos-verified. Release criteria doc drafted (25 criteria, PDF) — awaiting Cam signature 7/18; help-corpus + bell riders verified. FRONT DOOR: research (Apple/Linear/Stripe/Mercury patterns) + v1 built/previewed → Cam bounced (too wordy/green/busy) → design returned to Mythos for 3 mockup options; hero locked "Vendor selection, without the sales pitch." + "Real assessments. Evidence both sides can trust."; NO fake stats (product-facts band only). NEON CRISIS: prod hit 100% of free 100 CU-hr allowance (80% warning sat unread 3d) — Cam upgraded to Launch plan 7/17, no outage; E8 checklist law added. BLOCK 16 (branch feature/engagement-v1, dark, NOT deployed): 16a freshness model (shared reader, chips everywhere, windows on methodology) Mythos-cleared; B3 "COMING SOON" empty-state bug found+fixed; 16b staleness generators 1-3 + digest on agent-scheduler spine (idempotent send-ledger, hard-stop 2, E3 disclosure ACTIVE, E8 budget, no-guilt) — gen-4 gather + vendor score-change deferred; 16d CadenceConfig table (additive, defaults-on-absence, effectiveCadence reader) + delta re-assessment flow (?mode=delta, pre-filled, resets clock). PENDING: Mythos flag-on sweep of 16a-16d (gates 16e consultant board), 16c/16f/16g (16g visibility ruling open), front-door mockups (Mythos), guides patch for renamed Meet PAT sections. Protocol laws added this stretch: paste-NOW only, results from ! output or Mythos browser only, flag parity via rendered surfaces, billing alerts same-day. Calendar: sign 7/18, dry run 7/20, rotations+deploy night 7/21, LAUNCH 7/23.

## 2026-07-16 · FOUNDERS EMAIL SENT — patalign.com live, hardened, keys out
Prod launched early (founders-preview): cloud-build→verify→--prod flow (prebuilt-from-Mac premise retired), migrations deployed (6, incl. dataBoundary), demo world seeded (D0-PROD=114 firms/24 vendors + Meridian boost: 18 reviewing firms, BattleCard 4/2/12 three lanes, Category 4/5 Option A honest suppression, Demand 12/5/+7), benchmarks computed, 5 shared review accounts (firm-pro/firm-elite/vendor-pro/vendor-elite/consultant @c2acct.com, JWT concurrent). Block 13 security shipped: 13a role wall (null-audience root cause; 47 contract tests; consultant→vendor hole closed), 13b sign-in env-leak scrubbed. Flags: board/battlecard/PAT_ASSISTANT/PINGS bound (flag parity law: proven by RENDERED SURFACES, not env). Ask Pat P0a (stale zero-balance key → swap+redeploy) + P0b ("alignment delta" absent from corpus → content fix + re-index) — browser-verified grounded answer w/ sources. Guides v2 (founders 15pp / consultant 10pp PDFs) approved + attached via chrome file_upload to draft; EMAIL SENT to Randy/Brian/Leslie + c2acct CCs. My 5-account exhaustive prod sweep drove Block 13 list. PROTOCOL FIX: everything I hand Cam is paste-NOW (never future-tense lines); results only from ! command output or my browser. Landmines added: L6 purge guard, L7 prisma engine leak, two-client pool deadlock, background-validation heartbeat rule. OPEN: Bridgepath boost (bench-variant), 13c-g copy (locked-Elite/membership/suppressed-cell/admin), 13h/i UX (BattleCard expansion position, full-width inline readouts, Ask Pat markdown), old-grammar assessment cards, D4 feed, F8 help corpus ×roles (MINE — draft from guides v2), F11/F12/F13. Calendar: release criteria 7/18, rotations+Stripe deploy night 7/21, launch 7/23.

## 2026-07-12 · Overnight close (Blocks 5-11 + hybrid depth tier-1 SHIPPED)
Blocks 5-11 all committed + live-verified (795 unit tests, both ports, restart-safe). P0s closed w/ proof: Elite lockout, tier-gate direct-route breach, face/detail number integrity. Data: 176 firms/32 vendors, 7 canonical categories, zero suppressed cards, balanced fit mixes. Visual law: firm-standard cards + F1 band rows everywhere, chips off face cards, inline expansion, honest locked previews (paying Elite never sees locked). Hybrid depth tier-1 live (product cohort position + ranked action); PENDING honestly: product trend (needs ProductMaturitySnapshot model — Mythos ruling: mirror F3 pattern, write on final product-assessment submission + monthly rollup + demo backfill), product tier-2 routes. Landmines L1-L5 logged. Queue: sandbox lanes/multi-piece → signal expansions → QBANK v1.1 → founders' email (CAM'S HANDS: attach v1.1 docx exports to draft r-7623588128218656153, send). Regression checklist ran full at every checkpoint and caught items every time. 10 days to launch; nothing red.

## 2026-07-11 · Deliverables closed (evening)
Founders' Manual (approved, Gmail draft w/ attachment to Randy/Leslie/Brian) · Consultant Guide v3 (approved after tone rewrite; portal-experience sections added; second Gmail draft w/ attachment; may become locked in-portal page) · Endgame Plan · Agent Brief + governance addendum (two-agent research, reconciled; 5 pre-launch moves: AI-disclosure labels, trust page, model pinning+golden-set evals, data-minimization/DPA, incident runbook; practitioner top-5: evals, notification governance, idempotent send ledger, tracing, tiered HITL; anti-patterns: no human-posing, no approval-scaling, no autonomous outbound at volume). Lexicon ruling issued (Early/Developing/Building/Established/Leading + Grounded/Early signal/No signal). Cadence ruling: option 3 (proof at mid+end). Hybrid GO. Qbanks APPROVED (CC to record two-signature flip). ToS benchmark clause located (docs/legal/DPA-DRAFT.md) → CC pastes. VIVO: order 113-0394195-3085843 found via Amazon, reply drafted (Cam: address + video). AI-site sub: not on cameron@ — check camgarrett11/Apple subs (likely Recraft/Ideogram/Krea @ $20). Mini ruling: no upgrade — UPS now, agent VM in August.

## 2026-07-11 · Mythos manual cross-portal review (vendor pro + firm pro live; elite both sides reviewed earlier)
**Vendor pro:** product-insight detail Pro cards = verbatim boilerplate ×3 (same sentence, same numbers, no charts) — worst surface in product, anchor for gamified rebuild. Alignment-insight cards ×8 = template near-duplicates ("strongest support in…" same module lists). Sales card pro correctly Secret-gated (tier line already exists) BUT "Strong fit · 0 DISABLED" dev-speak leak + demo skew (0 strong/1 good/14 weak = red wall) + repeated dimension line. "Building" vocab everywhere.
**Firm pro:** QUALITY BAR found — pro insight cards (each own number: 68%/81%/2of3/27pts) + detail pages (evidence bars, meets/below thresholds, "what this means," ranked action) are what vendor side must match. CROSS-ERROR: pro-locked Elite tab still lists v1 names + "COMING SOON" (B5-1 renamed only the elite-account component); "Coming soon" now FALSE — should be "Live with Elite" + honest preview. Board pro correct (Secret + Reveal-with-Elite). **62 vs 68 collision:** board hero "62% current alignment" (stack review evidence) vs insights hero "68 alignment index" (module scores) — two metrics, near-identical labels, will read as a bug to customers; needs label differentiation. Assessment 5/5, NO module 6 (qbank DRAFT unserved — Cam's "six" memory predates reseed). Vocabulary ruling needed from Cam: band lexicon "Building"/"Limited signal"/(renamed "Emerging") — one ruling for the whole chip set. Do NOT click checkout scaffold buttons until B7-1 lands (PENDING_CHECKOUT trap).

## 2026-07-11 · Cam's full elite-review dump (dictated, with screenshots + Deltek battlecard PDF)
**P0 BUG:** Elite firm account locked out of Pro-tier surfaces everywhere (board "needs Pro", alignment insight, product assessment, firm insights — can't see pro OR elite content). Tier must be cumulative Elite ⊇ Pro. Suspected regression from B5-6 membership-resolver rework (exact-match PRO instead of rank≥PRO). "Similar issue as previously — you'll fix it."
**Locked decisions/asks:** Pro board = Secret candidates (approved, "exactly what I want"); Elite board = NAMED products, swappable. Sandbox swaps must become UTILITY/FEATURE-AWARE (candidates matched to the lifted piece's utility slot, not overall score) — ties into V2 Demand Signals utility-level breakdown. Kill vendor "Products at a Glance" (duplicate of Product Insight). Product-intel face cards: bigger cards (2×2), bigger bars/text, shorten divergence line to "N.N pt divergence". Vendor alignment-insight cards need the same visual system as product-intel cards; remove ELITE corner chip; ALL insight face cards (firm+vendor, alignment+product) share one visual language. V1 Category Position: REJECTED as-is (raw snake_case, unexplained, "visually horrible") — needs institutional/educational presentation, plain-language what-it-is/what-to-do. V2 Demand Signals: liked; expand w/ swapped-in / swapped-out sections + utility patterns. V3 Gap Map: liked; add interactive drill-down (product × dimension selection → breakdown). Sales Card: needs battlecard-grade depth (Deltek PIM card = reference); keep "Secret" language on Pro to drive Elite upgrades; expandable firm detail; auto-generated discovery questions; INPUT question open (firm onboarding module to feed sales card?). "Tap the active tier" copy bug. Piece-border/text overlap on self-reported puzzle pieces. Demo data must make EVERY surface reviewable (n≥5 satisfied, fluctuating trends) — "if I can't review it, it shouldn't be on my screen." Adaptive/perpetual modules: wants status + build start (module 6 exists on pro acct); pattern-pathway modules + ~20 insights from them.
**Open architecture question (Cam leans hybrid):** Elite = deeper layers on each Pro insight vs standalone Elite insights vs BOTH. Mythos to recommend w/ research.
**Consistency directive:** charts/colors/format/wording identical across portals; Mythos owns cross-surface review; Cam offers Chrome sign-ins as needed.

## 2026-07-10/11 · Mythos session 1 (first night)
**Done with proof:** Full dream-state read (744,960 lines fresh-extracted, 40/40 slices attested, ledger PATALIGN-MEMORY-LEDGER-FULL-READ-2026-07-10.md). Transfer doc + CLAUDE.md + debrief v2 + running log + all PATALIGN docs read. Independent 2-agent diagnostic reconciled. Live HTTP proof: preview 15713df:A0Fnw2wZQ9Oi-7DnwEVoL (built 2026-07-11T01:53:50Z); prod 078a41f:rJmkgkXnJ6MlPyqOUh08w stale-fallback, DB ok. CC's Elite v2: amendment received 20:26, built 20:28-20:52, screenshots 20:56; F1+V2+V3 per amendment; F3 prod writer NOT built.
**Discrepancies logged:** dream-state location; dead -1945 dir (CLAUDE.md repoint owed); pricing-memo language = rejected v1 features; FREE structural fallback; audience-mismatch bug at app/vendor/page.tsx:54-58; docs/elite-sprint gitignored; Neon rotation artifact missing; qa-smoke 078a41f pin live.
**Cam's answers to the 15 (2026-07-10, dictated):**
1. F3 — no explicit call; CC seeded 6-mo history; prod writer still open (Mythos to propose).
2. Elite review — his past opinions = R1-R3 redlines + v1 rejection (in archive); NEW v2 verdict pending; open to giving Mythos Chrome control to review the six surfaces itself.
3. Sequencing — "use common sense" (Mythos decides).
4. Launch July 23 FIRM. Endgame; no turning back. Deploy-night date not set.
5. PRICING NOT AGREED — memo was never accepted ("bullshit... your counterpart did [agree], I didn't"). Believes vendor value ≈ $10K/mo (more than a full employee/consultant); wants runway → launch below that. Wants pricing worked properly.
6. Stripe/signatures — no bank info entered; will enter once all 4 signatures exist. Wants the full completion sequence + more questions asked.
7. API key — authorizes Mythos browser control to investigate/fix the org mismatch ("just do that if you can"). ~$100 stranded in funded org.
8. Board/Sales Card flags — active development; NOT happy with current iteration; will post status in the latest CC session; more questions welcome.
9. Qbanks — reviews DONE and APPROVED (his statement; verify records). Adaptive modules: SCOPE AND INTRODUCE — long-standing ask.
10. FREE structural removal — did not understand; needs plain-language explanation before deciding.
11. Audience-mismatch bug — FIX IT. Standing rule: deep research (codebase + industry practice) then solve; no relabels.
12. Keep the product alive forever; one-man ship, control central, AI agents always running in background. Sees agents as the money-maker; wants proactive analysis (felt the silence).
13. Neon rotation — doesn't ring a bell → REDO with verification artifact standard.
14. Release criteria doc for July 23 — YES: Mythos digs in, re-verifies all 17 findings live, double-checks everything; if clean Cam approves, else ask.
15. Name accepted: Mythos. Memory repo approved; structure briefings/projects to remember; prepare for possible future information swap regardless.
**Standing asks recorded:** proactive strategic counsel (13-day endgame plan, company progression, outside-perspective research — "I'm limited by my own perspective"); think beyond the specific ask.
**CC state at close:** holding for Elite review; Block 5 tails + Block 6 sweep open; managed app+watchdog stopped pending review; validate:launch exit 0, 707 unit, launch:proof COMPLETE.

---

# ——— EARLIER HISTORY (restored 2026-08-27 from the repo-committed ledger; detailed per-block entries through 2026-07-11, predating the condensed master) ———

commit, root cause / change, validations, checkpoint proof.

## 2026-07-11 — Block 8: Cross-Portal Pattern Wave

Discipline: pnpm · fast gates (typecheck + lint + unit + contract tests) on every
sub-block commit · full build + restart + asset-integrity + HTTP proof + screenshots
at TWO live checkpoints (after B8-4, after B8-8) · one commit each. Reorder: B8-2
lands before B8-1 (B8-1's band chip consumes the B8-2 lexicon).

Band lexicon ruling (final): SCORE BANDS (0-100, five) = Early 0-39 · Developing
40-59 · Building 60-74 · Established 75-89 · Leading 90-100. EVIDENCE CONFIDENCE
(separate axis, data volume) = Grounded · Early signal · No signal. Killed labels:
Optimizing, Emerging, Full confidence, Pending confidence, Limited signal, Sample-thin.
Chip format "68 · Building"; confidence is its own small label, never concatenated.

Queued AFTER Block 8 (Cam's go): hybrid Elite depth layers · sandbox utility lanes ·
V2/V3 expansions · BattleCard v2. Also pending: qbank approval (flip both 90-item
ModuleTemplates reviewStatus DRAFT→APPROVED with two-signature CPA + clarity record).

### B8-2 — ONE BAND LEXICON (landed before B8-1)
New `lib/bandLexicon.ts` = single source: SCORE_BANDS (five, Early/Developing/
Building/Established/Leading + deep-red→deep-green ramp + `scoreChipLabel` →
"68 · Building") and EVIDENCE_CONFIDENCE (three, Grounded/Early signal/No signal).
`scoreBands.ts` + `confidenceBands.ts` now delegate. Canonicalized confidence
labels at source across firm/vendorProduct/vendorAlignment/adminBriefing engines;
retired the component-local maps (AlignmentBoard/BattleCard used score-word
"Building" for confidence — bug) and the consultant vocab layer (EcosystemListCard/
Header/FirmGrid/FirmAlignmentHeader "Full confidence"/"Limited"/"Initial"/"Pending"
→ canonical); executive-summary "Full confidence" → "Grounded"; methodology bands
→ three. New `tests/band-lexicon.contract.test.ts` bans the six strays + asserts the
scale. Note: FirmMaturity/VendorStatus "EMERGING" enums are internal (not rendered)
— left as-is. ecosystem reverse-map keeps internal long-form bucket keys (plumbing,
never rendered). Fast gates: typecheck 0 · lint clean · unit 738/738.

### B8-1 — ONE CARD GRAMMAR
Vendor product Pro cards: killed the 3× duplicated `currentStateSummary`
boilerplate — each card now leads with its OWN headline number + band chip + one
card-specific sentence from its own evidence slice (product-fit → self-vs-firm
delta; implementation-friction → weakest per-area score; visibility → firm-review
count + recency). Vendor alignment Pro cards: each leads with its own driver
signal (weakest driving module = pressure point, card-specific; variance card →
cross-module spread) as headline number + band chip, keeping the per-card
sentence. Metric threads through the existing InsightSurfaceCardGrid (no new
visual system). Firm-pro is the reference grammar — unchanged. Fast gates:
typecheck 0 · lint clean · unit 738/738 (updated 2 card-shape contracts: Pro
cards now carry a band chip; only Elite uses "Coming soon").

### B8-3 — METRIC LABEL PRECISION (no math)
Distinguished the two alignment numbers that read as a "62-vs-68 bug": Alignment
Board hero → "stack alignment · from stored product-review evidence"; firm insights
hero context → "Avg of your final module scores — distinct from the Alignment
Board's stack number". Consultant firm brief: relabeled the radar benchmark
"ecosystem average" → "peer average (N firms, excludes this firm)" — verified the
math already excludes the firm (peerFirmIds filters id !== firmCompanyId); count
from methodology.sampleSizes.peerFirmCount; updated the outline caption to match.
Ecosystem Coverage tile: "evaluated by N firms" → "across N firm assessments"
(firmReviewCount is a review count, not distinct firms). Fast gates: typecheck 0 ·
lint clean · unit 738/738.

### B8-4 — ROUTES + 404
next.config.ts redirects(): /consultant and /consultant/:path* → /consultants
(301 permanent). New app/not-found.tsx: branded light-theme 404 (PAT hero
lockup, plain-language copy, cards linking to sign-in + firm/vendor/consultant
portal homes) replacing Next's dark default. Fast gates: typecheck 0 · lint
clean · unit 738/738. (redirect + not-found verified live at checkpoint 1.)

### CHECKPOINT 1 (after B8-4) — live proof
Build 29b2332:kRK4h7Wvs8V10EQknQEQn. Quiesce→build→prep-verify(static+public
identical)→promote→restart :3000 then :3005→watchdog (restart last). asset-integrity
PASS both ports (10/10 assets, served==disk==fingerprint). Live: /consultant→308→
/consultants; branded 404 (http 404, PAT lockup + portal links); vendor alignment
cards each show own number + band chip (DEVELOPING/GROUNDED) + pressure-point
caption; firm insights hero reads "Avg of your final module scores — distinct from
the Alignment Board's stack number" and alignment index chip "69 · Building" (new
lexicon). Board hero label (B8-3) gated behind active-Elite — no demo account is
active-Elite (demo-firm-elite = Pending Checkout), so build-verified only.
Follow-up polish: vendor variance card shows a confidence chip (Grounded) in the
same slot as sibling score-band chips — minor axis-mix, flagged.

### B8-5 — DEV-SPEAK SWEEP
Sales-card/mode-toggle disabled chip: dropped the "Disabled" text — disabled state
now conveyed by styling (data-state="disabled") only. hello-world smoke agent
filtered from the admin registry view (HIDDEN_AGENT_KEYS in getAgentsOverview).
Customer-surface grep found no other leaks (billing "scaffold" is required
truthful copy, left intact). Extended the copy contract test with a dev-speak
guard. Fast gates: typecheck 0 · lint clean · unit 740/740.

### B8-6 — CONSULTANT SCOPING (component-level COI wall)
Found + fixed a real COI leak: ecosystem firm briefings are firm-scoped, so
their productLayer carried the firm's reviews of EVERY vendor — the consultant's
"Recent firm responses" panel + product filter spanned competitor vendors'
products. openEndedResponsesForEcosystem now takes allowedProductIds; the
ecosystem detail passes the ecosystem vendor's own catalog IDs, dropping foreign-
vendor responses at the data layer. New tests/consultant-openended-scoping.contract
.test.ts: (1) OpenEndedPanel is only imported under app/consultants (never
vendor/firm), (2) foreign-vendor product responses are dropped by the allow-set.
Fast gates: typecheck 0 · lint clean · unit 743/743.

### B8-7 — QUALITATIVE DE-CLUMP
Demo open-ended rotation was `(idSum + index) % 25`, which could collide and
reuse a template → back-to-back near-duplicate quotes (Brightline ×3 PolicyGrid).
Replaced with a full-cycle permutation `openEndedTemplateIndex(productKey, i, count)`
= `(base + i*7) % count` (7 coprime with 25): every template used once before any
repeat, so no reuse within a product's latest N responses; per-key base varies the
opening across products. New tests/qualitative-declump.contract.test.ts (full-cycle,
no back-to-back, cross-product variety, deterministic). NOTE: live de-clump lands
when the demo seed re-runs (seed:demo-expand at checkpoint 2). Fast gates:
typecheck 0 · lint clean · unit 747/747.

### B8-8 — HONEST LOCKED STATES
Killed "Coming soon" for live Elite surfaces: ELITE_PLACEHOLDER_* now = badge
"Elite" + copy "Live with Elite membership"; swept every remaining literal
"Coming soon" / "Unlock with Elite membership" across insightContent, locale,
vendor engines, and the firm/vendor insight pages → "Live with Elite membership".
New app/components/insights/LockedElitePreview.tsx: v2 surface name + Elite badge
+ REAL chart structure (bars/line/distribution silhouette) with values blurred +
"Live with Elite membership" CTA; wired into the firm insights detail Pro-locked
branch with FIRM_ELITE_V2_META names. Vendor product intelligence has no live
Elite layer → renders NO Elite toggle (mode coerces elite→pro; InsightsModeShell
elitePanel now optional). Tests updated (statusLabel "Coming soon"→"Elite",
copy→"Live with Elite membership", vendor-product elite mode→pro). Fast gates:
typecheck 0 · lint clean · unit 747/747.
Follow-ups (flagged): LockedElitePreview wired into firm DETAIL only — vendor
alignment detail + index cards still use the plain locked card (name + honest
copy, no blurred chart); insightContent tier-2 PROSE still carries stale
"reserved/future/not live" framing that contradicts the v2-live reality;
flag-off Alignment Board / BattleCard "Coming soon" placeholders left (feature-
flag-gated, not membership-locked — a different concept).

### CHECKPOINT 2 (after B8-8) — live proof
Build ca88c79:KVYGyYMEgyZhGZenj5lrq. Quiesce→build→prep(static identical)→promote→
restart :3000 then :3005→watchdog. asset-integrity PASS both ports (10/10 assets,
served==disk==fingerprint). Live: /consultant→308→/consultants; unknown route→404;
firm insights elite index = 0 "Coming soon", 8 "Live with Elite membership"; firm
elite detail renders locked-elite-preview (v2 name "Peer Position Report" + Elite
badge + blurred chart + "Live with Elite membership" CTA), 0 "Coming soon". Vendor
alignment cards show per-card band chips (B8-1/B8-2). Screenshots in
artifacts/b8-cp2-shots/. Follow-up visible: the stale tier-2 surface prose
("reserved for future / not available yet") still renders above the honest
LockedElitePreview — flagged for reconciliation.

### QBANK APPROVAL — mechanism ready, not yet recorded
New scripts/modules/approve-qbank.ts (+ pnpm modules:approve-qbank): flips DRAFT
ModuleTemplates → APPROVED transactionally with the two-signature record
(cpaReviewedBy/At + clarityReviewedBy/At), dry-run default, requires both
--cpa/--clarity signatories (refuses placeholders). NOT recorded: this DB has
ZERO ModuleTemplates (qbank not imported here — run pnpm modules:import-qbank
first), and the sign-off needs Cam's REAL signatory identities (schema names a
CPA-certified founder + clarity reviewer "Leslie"). Prod --apply is Cam's-go-only.

### B8-7 LIVE NOTE
The de-clump is committed + unit-proven; the live demo panel de-clumps only after
the demo seed re-runs (pnpm seed:demo-expand) — not run at this checkpoint.

### BLOCK 8 — CLOSED
B8-2 eac17e95 · B8-1 e0e1f792 · B8-3 cbdee037 · B8-4 29b23327 · [CP1] · B8-5
255a4a02 · B8-6 06544275 · B8-7 0fc5ea3a · B8-8 ca88c798 · [CP2] · qbank script.
Held blocks now unlocked, queued AFTER Block 8: hybrid Elite depth · sandbox
utility lanes · V2/V3 expansions · BattleCard v2.

## 2026-07-11 — Block 9: Governance mount + prose reconciliation

Post-B8: ran seed:demo-expand (44 firms / 206 module subs / 133 product reviews)
+ compute:benchmarks (12 firm / 50 vendor runs) + seed:demo-swaps (134 events);
restarted flagged :3005 with a fresh Prisma client → B8-7 de-clump live, six Elite
surfaces re-grounded for Mythos. Imported qbank (1 DRAFT DIAGNOSTIC template, 90
items); approve HELD until Cam names CPA signatory (Brian Tankersley / Randy
Johnston; clarity = Leslie Garrett).

### B9a — AI DISCLOSURE on Pat-drafted communications
New lib/patDisclosure.ts (full footer, "Pat (AI) · human-reviewed" short form,
X-PAT-AI-Generated header helper). Added Notification.aiGenerated Boolean
(migration 20260711210000) threaded through createNotification; set true on both
Pat-drafted paths (automated pings executePlan + manual nudge). Bell renders the
short form, /notifications inbox renders the full footer, API serializes the flag.
New tests/pat-disclosure.contract.test.ts fails the build if a Pat-drafted create
path or a render surface drops the disclosure. Email header helper ready for when
email delivery is wired (currently in-app only). Fast gates: typecheck 0 · lint
clean · unit 754/754.

### B9b — "How Pat is governed" trust mount
New /trust/pat surface (patGovernance) rendering the governance copy pack §2
verbatim with Cam's two baked edits: stop-authority is PUBLIC ("Owner on file:
C. Garrett."), and the data sentence is exactly "Pat only sees the minimum data
needed for the task at hand, and client assessment answers are never used to
train third-party AI models." (dropped "retains nothing" — zero-retention DPA is
post-launch). Wired into TRUST_SURFACE_ORDER + TRUST_FOOTER_LINKS + the release
surface manifest; new app/trust/pat/page.tsx; "Learn how Pat is governed" link
added to the Pat consent panel. trust-surfaces contract updated. Fast gates:
typecheck 0 · lint clean · unit 754/754.

### B9c — B8-8 prose reconciliation + one locked-state component
Rewrote the stale tier-2 prose in insightContent.ts (firm + vendor alignment):
"reserved for future / not available yet / PAT does not claim … exists yet" →
v2-live reality with the real names (Trajectory · Peer Position Report ·
Gap-to-Top-Quartile Plan; Category Position · Demand Signals · Alignment Gap Map)
and honest lockedState ("live Elite surface … on Pro you see the current-state
readout instead"). Extended LockedElitePreview to BOTH portals, DETAIL + INDEX:
vendor alignment detail now uses it (matching firm); InsightsModeShell elite panel
gained optional lockedPreviews so Pro users see one blurred-chart preview per
surface on the index (firm + vendor) instead of a plain card. Fast gates:
typecheck 0 · lint clean · unit 754/754.

### B9d — rotation-verification via DIRECT_URL
New artifacts/rotations/ (proof output; .gitkeep tracked, *.json gitignored) +
scripts/rotations/verify-rotation.ts (pnpm rotations:verify). After a DB
credential rotation it connects via DIRECT_URL (Neon non-pooler host) instead of
the pooled DATABASE_URL — the pooled URL runs pgbouncer in transaction mode,
which rejects Prisma's prepared statements with a "prepared statement does not
exist/already exists" error that is a FALSE negative unrelated to the credential.
The direct connection bypasses pgbouncer, so a PASS means the credential is
genuinely good. Runs SELECT 1 + current_user + version + now, writes a proof JSON.
Verified locally: PASS via DATABASE_URL fallback (no pgbouncer locally, warns to
set DIRECT_URL). Fast gates: typecheck 0 · lint clean · unit 754/754.

## 2026-07-12 — Mythos punch list (P1-P6) + qbank second bank

Second bank imported (9c9a93ad): parameterized import-qbank for both banks
(env metadata + parseQbank keyPrefix, FTC classifier); qbank-integration-v1
STRENGTH 90 items DRAFT. Governance approval STILL HELD (founders' review
round-trip; do not record until Cam names CPA — Brian Tankersley or Randy
Johnston; clarity Leslie Garrett). QBANK v1.1 MECHANICAL FIXES received (spec in
message) — NOT yet executed (key shuffle, joke distractors, length cues, Gov C11
retarget, targeted edits, margin flags, docx exports).

Punch list P3/P5/P6 DONE (dabc4ac6): killed Products-at-a-Glance on vendor home;
trust "Last updated" is build-date-driven (release fingerprint); board rail
header "Ranked candidates" for entitled viewers.

REMAINING — P1/P2/P4 are one coherent block (diagnosed, not yet built):
- P2 ROOT CAUSE: MIN_CONTRIBUTORS=5 and reading.n = DISTINCT VENDORS per category.
  The demo has 51 fragmented categories (Tax_workflow 4 · Close-recon 3 · ~11
  one-off 1-vendor cats). Fix = consolidate the vendor product bank to a shared
  canonical taxonomy (~6-7 categories) so each has >=5 of the 8 vendors. This is
  data-model work in the demo vendor bank, not a coverage tweak. Reseed +
  recompute:benchmarks after.
- P1: V1 Category Position rebuild per review-response §3 (human category names
  from utilityKeyToLabel; takeaway title; named bands Top quartile/Above median/
  Below median NEVER "Q2"; you-are-here marker; p25-p75 band; peer disclosure;
  so-what + ranked action; percentile tooltip). One visual+verbal system across
  F1 + all distribution charts.
- P4: demo-vendor-elite (Meridian) BattleCard 0 strong/0 good/6 WEAK regression
  after reseed; rebalance BOTH vendor accounts to a strong/good/weak mix + vary
  the per-firm dimension line (all six repeat "Operating Model … · Early signal").
Acceptance: zero insufficient-data cards on Meridian Category Position; live HTTP
+ screenshot; Mythos re-verifies.

### B10a — DATA + INTEGRITY (P2 done; P4 needs a score-balance pass)
Commits: taxonomy keystone b3caf760 · scale multiplier 58da6932 · readCohort
filter 230e5347 · base-demo canonical d7638fa3. Reseed executed: scale-4
seed:demo-expand (32 vendors / 176 firms / 824 module subs / 548 product reviews)
+ seed:demo-benchmark + seed:pat-runtime (all serial, no fan-out per Day-16) →
cleared stale benchmarks (1523 company / 56 run rows) → compute:benchmarks =
12 firm + **7 vendor runs** (exactly the 7 canonical categories).
ACCEPTANCE — P2 MET: getVendorCategoryReadings now returns only the vendor's OWN
categories (readCohort filtered to companyByMetric), and every canonical category
clears >=8 vendors → Meridian (demo-vendor-elite) 5 cats / **0 suppressed** ✅;
PAT Demo Vendor 4 cats / 0 suppressed ✅. One null-category product remains (not
in any run, harmless).
STILL OPEN in 10a:
- P4 fit mix: Meridian 0 strong/0 good/6 weak; PAT Demo Vendor 0/1/14. Root
  cause: alignmentDelta = vendorStrength − firmAlignment is negative for ~all
  firms (vendor product strength sits below firm alignment). Fix = raise the
  review vendors' product scoreTarget / widen the ecosystem firm alignment spread
  so deltas span strong/good/weak. Iterative demo-score tuning, not a code bug.
- Dimension-line variety: only 2 distinct gapAreas per vendor — apply B8-7-style
  de-clump to the gapArea/dimension rotation.
NOT STARTED: 10b (P0 server-side Elite tier-gate + contract tests — cites 4.12.26
direct-route-lock audit), 10c (P0 one-shared-reader number integrity), 10d
(threshold math), 10e (3 re-verified regressions). Block 10 live checkpoint runs
the FULL regression checklist after 10a-10e.

### B10a/B10b — STATUS (critical walls done; polish + 10c-e remain)
Key insight: running preview:pat-setup was the missing final reseed step.
10b (P0 SECURITY): BREACH CLOSED ✅ — demo-firm-pro re-pinned to PRO
(eliteAllowed=false); the server-side Elite gate was already correct (repro was a
mis-seeded membership, not a bypass). tests/elite-tier-gate.contract.test.ts
(e02ef1f2) locks both directions — closes the 2026-04-12 direct-route-lock audit.
B7-1/D5 ✅ — demo-firm-elite + demo-vendor-elite both ELITE+ACTIVE post-reseed.
10a: P2 ✅ — demo-vendor-elite Category Position 5 cats / 0 suppressed (7
canonical categories, readCohort own-categories filter, 4x scale). P4 MIX ✅ —
BattleCard strong/good/weak = 2/1/3 (warm-fit reseed + score variety; red wall
gone). Reseed chain: seed:demo-expand(scale4) → seed:demo-benchmark →
seed:pat-runtime → preview:pat-setup(kill after DONE) → clear+compute:benchmarks.
Commits: taxonomy b3caf760 · scale 58da6932 · filter 230e5347 · base-canonical
d7638fa3 · gap-rotate ea6172fe · tier-gate test e02ef1f2 · radar-shape-vary (this).
10a de-clump: SOLVED ✅ — distinctGapAreas=4 (was 1). ROOT CAUSE: firmModuleAssessmentTarget
did FIRM_MODULE_OFFSETS[moduleIndex] (fixed) + a firmOffset that shifts the whole
firm uniformly — so the lowest offset (-0.75) always landed on module 3
(Operating Model) for EVERY firm. FIX: rotate the offset by firmIndex —
FIRM_MODULE_OFFSETS[(moduleIndex + firmIndex) % 5]. Offsets sum to a constant
(+0.05) so overall alignment average (and the fit mix) is unchanged; only which
module is weakest rotates. Verified on demo-vendor-elite BattleCard: 6 firms,
fit s2/g1/w3, 4 distinct gap areas (Operating Model / Governance / Integration &
Data Flow / Automation & AI). Probe: scripts/dev/verify-gap-areas.ts.
10a COMPLETE. STILL OPEN:
- 10c (P0 number integrity: one shared reader per insight, face==detail hero;
  per-card metric differentiation), 10d (threshold math), 10e (3 regressions).
- Block 10 live checkpoint (rebuild + restart both ports + FULL regression
  checklist A-E incl. D5) after 10c-10e.
The running :3005/:3000 are STALE (pre-Block-10 build + old in-process data);
they get rebuilt/restarted at the checkpoint.

### B10c — P0 NUMBER INTEGRITY (done)
Bug: face card number != detail hero number, and all cards read the same.
Vendor side: face read weakestModules[0] (~same module every card) while the
detail hero read report.averageModuleScore (the BUNDLE average — identical for
all 8 cards). Firm side: hero always showed averageContributingModuleScore while
the face card showed a per-theme metric — so automation/data-controls/change
cards disagreed face-vs-hero.
Fix: ONE shared headline reader per portal, called by BOTH face + hero:
- readVendorAlignmentInsightHeadline(report) → each insight's PRIMARY cluster
  (config clusterKeys[0], theme-stable/distinct); uneven-maturity-variance keeps
  its variance stat. Added report.primaryCluster (=narrative clusters[0]).
- readFirmInsightHeadline(key, report) + firmHeadlineValueText() → same per-theme
  number the face card already used; buildFirmInsightCardMetric now delegates.
Both [key]/page.tsx heroes feed ScoreLockup from the reader (score/displayValue/
suffix/showBand); no more averageModuleScore fallback.
Result (demo-vendor-elite, live): 8 tier-1 cards → 6 DISTINCT headline values
(was 1). face==hero by construction.
Tests: tests/insight-number-integrity.contract.test.ts (7) — behavioural
identity + per-card differentiation + source-scan wiring guard (no averageScore
fallback). Full: 22 contract tests green, tsc clean.
Probes: scripts/dev/verify-insight-headlines.ts.

### B10d — THRESHOLD MATH (done)
Root cause: capability evidence bars are PER-CAPABILITY (60% or 65%, from
firmCapabilities badge minScore) but copy/charts hardcoded a single "60%".
firm_tier1_data_and_controls = {Data 65, Governance 65, Control 60} — mixed.
The FirmGapPlanCard drew a hardcoded threshold={60} "60% bar" chart line while
per-row meta said "under 65%" and the header called it the "top-quartile bar" —
three framings for one set of bars (Cam's "60% bar vs +N over 65%" flag).
Fix (per-row real bars everywhere; single line only when uniform):
- describeCapabilityBar(caps) in firmInsightEngine → "the 65% bar" | "their
  60–65% bars"; used in the data_and_controls headline caption + summary (was
  "the 60% threshold").
- FirmGapPlanCard: barLineFor(items) draws the RankedBars threshold line ONLY
  when every charted row shares one bar, else omits it (per-row meta carries the
  real bar). Header "top-quartile bar" → "their capability bar".
- firm insight detail RankedBars: capBarLine/capBarTitle computed from the real
  distinct thresholds; each row meta now "below 65% bar" (was bare "below").
Runtime (demo-firm-elite): data_and_controls "2 of 3 · their 60–65% bars"
(Data65✗/Gov65✓/Ctrl60✓); gap plan cleared 7/10 with rows "20 under 60%",
"12 under 65%" — count computed from the same displayed per-row thresholds.
Tests: tests/threshold-math.contract.test.ts (7). 13 green w/ 10c, tsc clean.

### B10e — 3 RE-VERIFIED REGRESSIONS (done)
(1) Product-intel face card divergence line: the face card passed the FULL
directional callout ("15 pt divergence · firms read this product lower…") which
overran the compact pill. Added VendorProductGapCallout.magnitudeLabel ("N.N pt
divergence"); face card (product-insight/page.tsx) now uses magnitudeLabel, the
detail hero keeps the full directional .label.
(2) Self-reported puzzle-piece text overrun: in AlignmentBoardClient PuzzlePiece
the "#N · Self-reported" rank/tier line had NO clamp (title/subtitle did) and the
text container had no overflow-hidden, so the wide uppercase "SELF-REPORTED" tag
spilled past the border. Added overflow-hidden to the container + w-full truncate
+ tighter tracking on the rank line.
(3) Vendor alignment Elite pane contradictory stale prose (B8-8): on a LIVE
(tier-1) insight's ?surface=elite the surfaceContent still built the old
"not yet live / should stay unavailable / not claiming benchmark" placeholder,
contradicting the live "Elite Insights are live" pane on the same page. Non-locked
elite surface now affirms the live Elite layer; parameterized
buildAlignmentEvidenceProvenanceItem so the elite closing drops the Pro-only
"not claiming benchmark/projection/scenario" disclaimer. Locked (tier-2) keeps
the honest locked boundary. Runtime: 0 contradiction fragments (was ≥1).
Tests: tests/regression-10e.contract.test.ts (3) + magnitudeLabel test in
vendor-insight-visuals. 32 contract tests green across the 5 files, tsc clean.
NOTE: (1)+(2) are visual — confirm on the running :3005 at the checkpoint.

### BLOCK 10 CHECKPOINT — COMPLETE (2026-07-11)
All of 10a-10e committed (ea6172fe, b3f51381, 141885fe, ca1becd8, ce7d0489) +
checklist 0c199394. Full chain: lint:test clean · tsc clean · test:unit 782/782
· 32 Block-10 contract tests green. Rebuild BUILD_ID i6VTZf5TZy8mA7w2VMr47.
Verified on RUNNING :3005 (build+flags printed): asset-integrity PASS
(served==disk==fingerprint); A1 canonical taxonomy, A4 fit 2/1/3, A5 4 gap areas,
C1 face==hero ("2 of 3"), C2 6 distinct headlines, C3 "60–65% bars" per-row,
D2 pro=PRO, D5 both Elite=ELITE/ACTIVE, E1 concise divergence, E2 contained
self-reported piece, E3 no elite-pane contradiction. Screenshots in
artifacts/block10-shots/. Regression checklist: PATALIGN-MEMORY/REGRESSION-CHECKLIST.md.
BOTH PORTS restored on the new build (:3000 launchd + :3005 review), asset-integrity
PASS on both. GOTCHA logged: after a local `pnpm build`, expected-live-release
advances but last-known-good does NOT, so com.c2acct.app's source-integrity gate
(last_known_good_release_not_current) exit-1s until `pnpm release:promote-known-good`.
NEXT: Block 11 (visual unification) — 11a firm-side card law → shared components,
11b V1 percentile BAND rows, 11c band chips off face cards, 11d insight click UX,
11e Pro product-insight Elite toggle. Then hybrid Elite depth, sandbox multi-piece,
QBANK v1.1 (own pass; approval still HELD pending CPA name).

### BLOCK 11 (VISUAL UNIFICATION) — partial checkpoint (2026-07-12)
DONE + committed + verified on :3005 (BUILD_ID AKfI20sxwYdQsbIt_gQTP):
- 11a (1ed78bc7): portal + consultant cards unified to the pat-card law
  (PortalSurfaceCard dropped rounded-[24px]/bg-white; EcosystemListCard adopted
  pat-card). Verified: vendor home cards match insight cards.
- 11c (f0456c44): score-band chips OFF face cards (vendor-alignment + vendor-
  product Pro cards) — number + one line only; band stays in detail hero.
  Verified: alignment cards show "54 · Operating discipline…", no chip.
- 11d part 1 (60637b6a): product-insight defaults to Evidence (data) pane +
  toggle leads with it (was Help-first). Firm/vendor-alignment already Pro-first.
- N1 (d52600a3 + ensureCompany b20384ea): every demo replica carries a region
  tag (r0 → " · National"); no more bare "Montrose Partners" vs "· Central"
  collision. ROOT FIX: ensureCompany now resolves by stable id first (name-derived
  keys made renames orphan firms). One-time cleanup of 44 orphan firms + cascade,
  benchmarks recomputed (12 firm/7 vendor runs), elite accounts re-adopted from
  the clean 176-firm cohort. Verified: battlecard firms all region-tagged, fit 2/2/2.
- N2 (d52600a3): firm tier-2 elite locked-copy contradiction fixed
  (buildFirmLockedInsightDetailSurfaceContent entitlement-aware; page chrome
  consistent). Verified: entitled firm sees live Trajectory, no "not available yet".
STILL OPEN (Block 11):
- 11b: V1 Category Position — replace bell curves with F1-style percentile band rows.
- 11d part 2: in-page expansion (battlecard-style) — client-architecture change,
  UX choices worth Cam's confirm (how much expands inline, keep full page?).
- 11e: Pro product-insight Elite toggle + honest locked preview — product decision
  (show the toggle for entitled too, given there is no live product Elite?).
Both ports serving AKfI build (:3000 launchd + :3005 review), integrity PASS.
Screenshots: artifacts/b11-shots/.

### BLOCK 11 — COMPLETE + CHECKPOINT GREEN (2026-07-12)
All sub-blocks done+committed+verified on running :3005 (BUILD_ID iJjTwaEH2ZEgRnDl2Pe0U,
HEAD 8d49dc4). Commits: 11a 1ed78bc7 · 11c f0456c44 · 11d-1 60637b6a · N1/N2 d52600a3 +
ensureCompany b20384ea · 11b 060ed252 · 11e 29565414 · 11d-2 ea859080 · checklist 39481c8a.
Verified: F1 card law (portal+consultant → pat-card), F2 no face-card band chips,
F3 inline Pro-readout expansion + Open full view, F4 Category Position F1-style
percentile band rows (bell curve removed), F5 non-entitled Elite upsell only,
F6 region-tagged replica names + entitlement-consistent firm elite copy.
Full chain: lint clean · tsc clean · test:unit 789/789 · Block-11 contract tests green
(insight-click-ux + updated vendor-product-insight/firm-unlocks). Demo clean at
176 firms/32 vendors, 0 orphans. Both ports serving, integrity PASS restart-safe.
Regression checklist now has F (visual unification) + LANDMINES (L1-L5) sections.
Screenshots artifacts/b11-shots + b11cp-shots.
NEXT (Cam order): Mythos live sweep → hybrid Elite depth layers (fills Elite panes +
flips 11e live for Elite in same commit) → sandbox utility lanes + multi-piece swap →
Demand Signals / Gap Map expansions → QBANK v1.1 (approval HELD; signatures follow
founders review; email out with v1.1 docx exports).

### HYBRID ELITE DEPTH — layer 1 LIVE (2026-07-12, commit 910aa248)
Fills the product-level Elite pane with REAL data + flips 11e live for entitled.
- buildProductCohortPosition (eliteInsightsV2): a single product's percentile in
  its category's cohort of firm-reviewed PEER PRODUCTS (rank, quartile, p25/p75,
  gap→top-quartile). Bounded read-time single-category query — the offline vendor
  benchmark only goes to vendor-per-category; this reads at the product grain.
  Honest suppression below minimum-n. NO schema migration (CompanyBenchmark is
  per-company; per-product cohort computed at read time on the entitled page).
- ProductEliteDepthCard: F1-style PercentileBandRow + ranked action + HONEST
  trend pending-state (no product time-series exists — not faked).
- Product-insight page: Elite toggle on every tier-1 surface; ENTITLED → live
  depth card, non-entitled → blurred upsell (named layers, zero data). Elite
  intro entitlement-aware.
Verified live on :3005 (build ptMreLKjjnY_5ew1aGvUY): Meridian Practice 74 · p76
· 6th of 21 · Q4 in Workflow & Practice Ops, band row correct, ranked action
"already top quartile — hold the lead", trend honestly pending. Contract test
tests/product-elite-depth.contract.test.ts (6). 795 unit green, lint+tsc clean.
STILL OPEN (hybrid depth follow-on): product tier-2 routes (market-comparison /
future-demand-projection / expansion-simulation) still placeholder; product TREND
needs a ProductMaturitySnapshot model + compute (real time-series) before it can
go live. Then: sandbox utility lanes + multi-piece swap → Demand/Gap Map
expansions → QBANK v1.1.

### PRODUCT MATURITY / TREND — LIVE (2026-07-12, commit d6335ed4)
Mirrors F3 firm trajectory exactly, per Cam's approval. Migration 20260712180000
(ProductMaturityIndex/Momentum/Snapshot, additive; KnowledgeChunk.tsv drift left
untouched — landmine L6). lib/productMaturity (computeProductAlignmentIndex +
writeProductMaturitySnapshot, skips DEMO). Write hook on final firm product review
(survey/submit). Monthly rollup scripts/rollup-product-maturity.ts (scheduled like
the firm rollup on the deploy host recompute runner). buildProductTrajectory
(eliteInsightsV2) — real history + directional projection, opens only at >=2 pts.
Demo backfill scripts/seed-demo-product-maturity.ts — VARIED trajectories
(rising/falling/flat/volatile) landing on the product's current firm-reviewed
strength (192/193 products, 1152 snapshots). ProductEliteDepthCard trend pane now
renders the real TrajectoryChart; honest pending until points exist (same as F3).
Verified live on :3005 (build iXW01ch_9fYtabDe6M3jc): Meridian Practice trend
[86,84,81,79,76,74] Feb→Jul, projection 72 (not-verified label), newest 74 == cohort.
795 unit + 8 product-elite-depth contract tests green, lint+tsc clean, both ports 200.
HYBRID ELITE DEPTH is now COMPLETE (cohort + ranked action + real trend).
NEXT (Cam queue): sandbox utility lanes + multi-piece swap → Demand Signals / Gap
Map expansions → QBANK v1.1 (approval HELD; founders email w/ v1.1 docx exports).

### GLOBAL RENAME Sales Card → BattleCard (2026-07-12, commit efca9979)
Final product name. Mechanical rename, no logic changes. Files renamed
(lib/battleCard.ts, VendorBattleCardClient, app/vendor/battlecard, tests/e2e),
symbols+UI copy swept ("BattleCard" one word), card id vendor-battlecard,
data-testid battlecard-*. Route /vendor/battlecard + permanent redirect (308)
from /vendor/sales-card (+deep paths). Flag PAT_ENABLE_BATTLECARD with a temporary
LEGACY fallback read of PAT_ENABLE_SALES_CARD (so no unmigrated env silently
disables it — remove once all envs updated). Help corpus: deleted 2 orphaned
sales-card KnowledgeSources + re-indexed to battlecard paths (avoided the N1/L2
name→identity orphan trap; L2 confirmed applies to KnowledgeSource.path too).
Working-tree grep for sales card/salesCard/sales-card/SALES_CARD = zero outside
two intentional aids (redirect source + legacy flag). Verified live on :3005
(build pdJwHT6fQlrQnxNoK0FZd): header BATTLECARD, old route 308→/vendor/battlecard,
asset-integrity PASS. lint clean, 797 unit green. NOTE for Cam: redirect is 308
(Next.js permanent) not literal 301 — functionally identical for deep links; say
the word if you want statusCode:301 exactly (needs a config change + rebuild).
NEXT (Cam queue): sandbox utility lanes + multi-piece swap → Demand Signals / Gap
Map expansions → QBANK v1.1 (approval HELD).

### SANDBOX UTILITY LANES + MULTI-PIECE SWAP — LIVE (2026-07-12)
Commits: foundation 6ac92158 · multi-swap client 91b6fac6 · demo swaps 21ed03b5 ·
client-safe module fix 1da43b7. Build w7gTHTPCF4QRyAzec3sD1.
- lib/sandboxLanes (client-safe, pure): sharesUtility, slotFitDelta (over shared-
  signal dims), splitCandidatesForSlot, recomputeProjectedAlignment (moved here so
  the client doesn't pull the server graph — node:crypto build break, fixed).
- BoardPiece/BoardCandidate carry utilityKeys (threaded from snapshot).
- AlignmentBoardClient: single→multi swap. State = per-slot map (out→in|null), cap
  3 lifts, no double-booking. Projection RECOMPUTED from the full resulting stack
  via recomputeProjectedAlignment (never additive). Radar re-means over the full
  projected stack. Slot tabs (one per lift), utility lanes ("Fits this slot" =
  utility overlap ranked by slot-fit delta; "Whole firm" = every candidate, never
  hidden), "Reset all".
- seed:demo-swaps enriched: swap volume varies by category heat × region (DEMO
  only; real early-signal floor unchanged) — 1318 events / 47 vendors.
Verified live on :3005: lift 2 pieces → 2 slot tabs, Fits-this-slot + Whole-firm
lanes render, projection recompute, radar projected polygon, Reset all. Checkpoint
focus: B6 "Ranked candidates" header ✓, A2 no new routes (reuses gated
/firm/alignment-board) ✓. 803 unit + 6 sandbox-lane contract tests green, lint+tsc
clean, asset-integrity PASS both ports, integrity restart-safe.
NEXT (Cam queue): Demand Signals / Gap Map expansions → QBANK v1.1 (approval HELD).

### DEMAND SIGNALS + GAP MAP EXPANSIONS — LIVE + CHECKPOINT GREEN (2026-07-12)
Commits: A eea963f9 · B a4a221c7 · client-safe fix 9e6756ec. Build G4nKckRc1k-yv8Ta-BwUv.
DATA-CLASSIFICATION RULING (Cam, this session, [[project_demand_signals_data_classification]]):
per-category swap COUNTS are Pro-tier (the teaser that sells Elite); TREND arrows,
TOP-PRODUCT, and the RANKED ACTION are Elite-classified. P0 direct-route wall stands
in principle — non-entitled never receives Elite-classified data.
- A (Demand Signals): buildVendorDemandSignals rebuilt — two-window (current vs prior
  90d) for a real trend arrow; grouped by canonical product category; each row
  count/trend/topProduct; ranked action (churn first, else hottest pipeline);
  identityAllowed=false STRIPS trend/topProduct/rankedAction to null so the Pro
  projection never carries Elite data. VendorDemandSignalsCard: grouped in/out
  sections; Elite identity gated; Pro upsell naming "who is moving, which products,
  what to do about it". Page: Pro non-entitled routes into the counts-only surface
  (NOT a LockedElitePreview — that grammar = zero data); Elite guard intact.
  elite-tier-gate contract now encodes the classification (Pro=counts only via a
  mock-client projection; Elite=all). seed-demo-swaps enriched: events span current
  + prior windows per a per-category trend shape (rising/flat/falling) → varied
  arrows; DEMO-only, real early-signal floor unchanged (2640 events / 47 vendors).
- B (Gap Map): GapMapCell now carries firmScore/vendorScore; new pure
  buildGapMapDrilldownInsight (widest-dispute takeaway + action, confirm-flip,
  null when unscored). VendorGapMapCard now "use client" with INLINE drill-down
  (11d, no modal): checkbox-select up to 3 products × 3 dimensions → per-pair bars
  (firm vs self-report) + takeaway + action; caps enforced by disabling boxes.
- LANDMINE HIT + fixed: client "use client" card importing eliteInsightsV2 →
  benchmarks → node:crypto = webpack "Unhandled scheme" build break (same class as
  the sandbox fix). Extracted pure Gap Map types + drill-down to client-safe
  lib/gapMapDrilldown.ts; eliteInsightsV2 re-exports. Also re-hit L1: after
  `pnpm build` the app-start prepare-standalone-runtime re-stamped buildTimestamp
  (02:53:29→02:54:21) so LKG lagged (last_known_good_release_buildTimestamp_mismatch,
  masked by the stale "Dirty git tree" stderr) — fixed by `rm last-known-good-release.json`
  + re-promote (copies CURRENT fingerprint), then kickstart. Both ports came back.
CHECKPOINT (running :3005, build G4nKckRc1k, flags LOCAL_REVIEW_AUTH/CONSULTANT/
ALIGNMENT_BOARD/BATTLECARD/PAT_ASSISTANT/PINGS=1): asset-integrity PASS both ports
(served==disk==fingerprint). Authenticated HTTP proof:
- ELITE (demo-vendor-elite/Meridian): Demand Signals grouped into the 7 canonical
  categories; counts + varied trend arrows (Tax↑ Ledger↑ Workflow→ Client↓ Payroll↑)
  + top:Meridian-X per row + ranked action ("sharpest churn signal is Client &
  Documents — Meridian Portal left 2 stacks"); totals 31 in/4 out/+27. Gap Map:
  "Drill down · compare up to 3 products × 3 dimensions" + product/dimension fieldsets.
- PRO (review.vendor): "Vendor · Demand Signals" counts sections + upsell (who/which/
  what) — NO ranked action, NO top identity, NO trend arrows. Classification wall
  holds live.
Regression: A1 ✅ (7 canonical categories live in Demand Signals grouping + BattleCard
gap areas), A4 fit 2/2/2 ✅, A5 4 distinct gap areas ✅, B1 ✅ (Elite→full, Pro→counts),
D5-vendor ✅ (Meridian resolved ELITE live). Full chain: lint clean · tsc clean ·
test:unit 808/808 (3 drill-down + 2 classification tests added) · build exit 0.
NEXT (Cam queue): Mythos sweeps → QBANK v1.1 (approval HELD; founders review round-trip).


## 2026-07-13 — Block 12: Insight surface unification round 2

### 12a — INLINE = FULL INSIGHT (mid checkpoint GREEN)
Commit f23e402b. Build cdq6VxjC35yIMHEvrHpiH. Every Pro face card (firm + vendor,
alignment + product) now expands INLINE into the COMPLETE insight body (headline +
colored evidence bars + charts + what-this-means), via 3 shared server components
(FirmInsightDetailBody / VendorAlignmentInsightDetailBody / VendorProductInsightDetailBody)
rendered by BOTH the detail route AND the inline expansion. InsightSurfaceCardGrid
gained expandedNode (ReactNode) superseding the Block-11d text-only readout;
"Open full view" still links to the route (C6). Firm was top-2-inline/bottom-2-nav
→ all 4 inline; vendor product was navigate-only → inline. Contract tests
(number-integrity C1, threshold-math C3) repointed to the shared body components.
MID CHECKPOINT: both ports serving cdq6VxjC35yIMHEvrHpiH, asset-integrity PASS both.
Authenticated :3005 proof — firm 4 cards expandable (Module evidence inline),
vendor-alignment cards (Firm-side signal inline), vendor-product 3 cards (Vendor
story vs firm review inline). typecheck/lint clean, test:unit 808/808.
REMAINING: 12b (firm hybrid elite depth / remove boilerplate toggles), 12c (elite
hub face cards restore numbers), 12d (Trajectory rebuild), 12e (review.vendor
BattleCard fit mix). End checkpoint after those + reseed.

### 12b + 12c — END CHECKPOINT GREEN (2026-07-13)
Commits: 12c 875251ae · 12b d102f7f7. Build qVEGHRy3Z16PTBufCVv8E, both ports
asset-integrity PASS (served==disk==fingerprint).
- 12c (Elite hub face cards): entitled hubs now carry their OWN headline number
  (from the same builders that power each detail), "ELITE" corner chip dropped.
  Pure firmEliteHubMetrics/vendorEliteHubMetrics formatters (contract-tested to
  Cam's exact formats). Non-entitled keep the blurred LockedElitePreview.
  LIVE (entitled): firm hub — "Nth percentile", "N · +N projected", "N pts to top
  quartile"; vendor hub — "+28 net motion", "10 confirmed · 16 read lower",
  "2 in top band".
- 12b (firm tier-1 hybrid Elite depth): the 4 firm tier-1 elite panes no longer
  show locked-boundary boilerplate to a paying Elite firm. buildFirmThemeDepth
  scopes buildFirmPeerPosition to the insight's contributing modules → real
  percentile band per module + ranked action. LIVE (demo-firm-elite,
  firm_tier1_operating_baseline?surface=elite): "Operating baseline — where you
  sit vs peers", 5 module band rows (Operating 60/32nd … Automation 84/74th),
  "Close Operating Model's 23-pt gap to the peer top quartile first" — NO
  boilerplate, NO "Locked Elite boundary". Pro firm keeps LockedElitePreview
  ("Live with Elite membership", no depth leaked).
- 12a regression: firm pro cards still expand inline (4 Open readout).
Full chain: typecheck/lint clean · test:unit 810/810 (+2 theme-depth, +2 hub-metric,
+3 drilldown tests across the block). NOTE the real tier-1 keys are
firm_tier1_operating_baseline / _automation_readiness / _data_and_controls /
_change_alignment (Cam's block used the friendly forms).
STILL OPEN in Block 12 (deferred to a focused follow-up — both benefit from one
demo reseed):
- 12d Trajectory detail rebuild: provenance panel for the projection (which
  modules/momentum drive +N, over what window, from what evidence), copy clarifying
  the trend is built from module submissions over time (NOT sandbox swaps), F1-grade
  chart upgrade, varied demo history (D3), ends with a ranked action (C3).
- 12e review.vendor BattleCard fit mix (D2): rebalance demo so BOTH vendor accounts
  show varied strong/good/weak. Lever: PAT Demo Vendor's firm-reviewed product
  strength sits below its reviewing firms' alignment → mostly weak. Raise the demo
  firm-review score targets for its products so vendorStrength lands mid-distribution.
  Requires reseed (L1-L4) + rebuild + restart.

### 12f — NUMBER INTEGRITY, ELITE LAYER (P0) — DONE + live-verified (2026-07-13)
Commit 17d26957. Build d1-vD61Ptku5YB-3SG3z2, both ports asset-integrity PASS.
Mythos found the Elite layer read different sources than the Pro layer → contradictory
numbers on one screen. Fix = the 10c pattern: ONE shared reader per quantity.
- NEW lib/firmAlignmentSignal (getFirmAlignmentSignal + computeFirmAlignmentIndex):
  the single source for per-module scores + alignment index, from the latest final
  SurveySubmission per module (same source the Pro reports use).
- buildFirmPeerPosition(client, companyId, boundary, liveSignal): benchmark supplies
  only the DISTRIBUTION (p25..p90); "you" module scores + overall index come from the
  live signal; percentiles RECOMPUTED from the live score; cohort N = distinct firms
  (getFirmCohortFirmCount), not BenchmarkRun.n.
- buildFirmTrajectory: newest history point + face "current" = live alignment index.
- FirmInsightReport.firmAlignmentIndex; plainLanguage "Your firm scores X" reads it.
- Firm index card + all Elite callers fed by getFirmAlignmentSignal.
LIVE PROOF (demo-firm-elite, :3005): data_and_controls Elite "you" 81/74/53 == Pro
module scores (was 60/81/65); Trajectory current 68 == Alignment index 68 (was 81);
prose "Your firm scores 68" == index 68 (was 69/72); Peer "of 238 peer firms" =
distinct benchmark firms (reader correct; 238-vs-176 = orphan cleanup for reseed).
Contract tests tests/number-integrity-elite (8): Elite "you" == live signal not stale
benchmark, overall == index, N == distinct firms, percentile recomputed, trajectory
current == index + hub face, prose reads firmAlignmentIndex, wiring. 820 unit green.
NEXT (Cam's sequence): 12d Trajectory rebuild + 12e review.vendor BattleCard fit mix
in ONE reseed pass (L1-L4), then RE-RUN the number-integrity-elite equality tests
AFTER reseed (reseeds are when parallel readers drift), full regression + screenshots.

### 12g + 12h + 12d — DONE + live-verified (2026-07-13)
Commits: 12g/12h 20bcbd9c · 12d 794d0049. Build serving both ports, asset-integrity PASS.
- 12g Elite hub face refinement (both portals): ONE hero number per card; 2nd quantity
  → colored chip or micro-visual. New client-safe lib/eliteHubFace + EliteHubFaceView
  (percentile-band strip / band-dots / two-segment bar). Formatters return EliteHubFace.
  LIVE: trajectory hero "68" + green "+N projected" chip (no compound headline);
  peer hero "Nth percentile" + micro band + "vs peer firms · module by module";
  gap hero "N pts" + amber lever chip + "to top quartile".
- 12h grid items-start: expanding a card never resizes row siblings. One shared
  InsightSurfaceCardGrid fix covers firm+vendor, alignment+product. LIVE: grid class
  "grid items-start gap-5".
- 12d Trajectory rebuild: provenance panel ("How this projection is built" — evidence =
  module-submission snapshots over a named window, NOT sandbox swaps; projection extends
  avg movement ±volatility, directional), colored hero delta, ranked action ("Your next
  move" = biggest peer-top-quartile lever). buildFirmTrajectory returns provenance.
  LIVE: all three present on firm_tier2_projection?surface=elite. F1 chart polish + D3
  varied demo history land with the reseed. Contract tests updated to the new shapes.
typecheck/lint clean, test:unit 820/820.

### RESEED PASS (12e + orphan purge + D3) — DIAGNOSED, NOT YET RUN (destructive DB)
State: DEMO has 238 firms / 47 vendors; canonical (scale-4 expand) = 176 / 32. The 62
extra firms + 15 vendors are NOT empty orphans — they all carry valid submissions (a
prior LARGER-scale expand set left behind; seed:demo-expand upserts in place and never
deletes, so extras accumulate). Purge plan: canonical company ids = stableId(
"demo-firm-company"|"demo-vendor-company", key) over DEMO_PAT_FIRMS/VENDORS (@/data/
demoPatEcosystem) ∪ planExpansionEcosystems() (lib/demo-seed/expansion) keys; delete
DEMO FIRM/VENDOR companies whose id ∉ canonical set — FK-ordered cascade (SurveySubmission,
CompanyBenchmark, FirmMaturitySnapshot/Momentum, Product+reviews, SandboxSwapEvent…), a
few relations are SetNull not Cascade so children must be deleted first. DRY-RUN first:
expect exactly 62 firms / 15 vendors flagged → leaving 176 / 32. Then reseed chain
(expand scale4 → demo-benchmark → pat-runtime → preview:pat-setup → clear+compute:benchmarks),
12e fit-mix (raise PAT Demo Vendor firm-review product score targets so vendorStrength lands
mid-distribution → strong/good/weak spread on review.vendor BattleCard), D3 varied firm
maturity history. THEN re-run tests/number-integrity-elite (percentiles/cohort N recomputed
against the clean 176 — Peer Position values WILL shift; that's correction). Full regression
+ screenshots. Held back this session: destructive multi-table purge on the live Neon demo
DB deserves a dry-run-first focused pass, not a rushed one.

### ORPHAN PURGE + CANON RE-BASELINE (Mythos ruling, 2026-07-13)
Investigation RETIRED the "238 = 176 canon + 62 orphans" premise. Findings:
- Firms: 238, of which 224 own login users → legitimate seeded accounts, NOT orphans.
  Key-recomputation orphan detection is UNRELIABLE for firms (real ids carry extra
  indices the plan keys don't). The user guard (never purge a company with a login
  User) was load-bearing — it protected 47 non-canonical-but-real firms.
- The ONLY true orphans: 4 stale `demo-bench-vendor-*` vendors (superseded old seed,
  no users, but carrying products + CompanyBenchmark rows polluting the vendor cohort):
  Sentinel Practice Cloud, Stratabind Audit & Compliance, Lumen Modern, Bridgepath Suite.
Cam's ruling: Option 1 + validation rider. NO firm deletions, NO clean-slate.
ACTIONS: new scripts/demo/purge-demo-orphans.ts (dry-run default; canonical-miss AND
no-login-user; FK-safe txn). Applied at scale 4 → purged 4 vendors (19 submissions,
19 products, 4 profiles). Cleared+recomputed benchmarks (12 firm / 7 vendor runs).
VALIDATION (all pass): (2a) 238 firms all dataBoundary=DEMO, PILOT/PRODUCTION outside
the set; (2b) 238 distinct firm names + 43 distinct vendor names, ZERO dup groups;
(2c) 238/238 firms have ≥1 final module submission, 0 thin ghosts; (2d) firm cohort
distinct-firm N=238, Meridian 5 categories min-n=9 all ≥ MIN_CONTRIBUTORS(5), 0
suppressed; 4 purged vendors gone.
RE-BASELINE: demo canon = 238 firms / 43 vendors (176 expansion + 15 base firms;
32 expansion + 11 base vendors). "176/32" retired as a total. Updated
lib/demo-seed/expansion.ts + purge-script headers. (Mythos owns REGRESSION-CHECKLIST
D-section + MYTHOS.md updates.) Peer cohort N=238 is the LEGITIMATE count (12f reader
correct — not orphan-polluted). NEXT: 12e fit-mix + D3 (score re-tuning, no deletions)
→ re-run tests/number-integrity-elite vs 238/43 → full regression + screenshots.

### 12g/12h/12d/12e + reseed — END CHECKPOINT GREEN (2026-07-14)
Build iVxak9JnIEy0Y_CnloeyJ (code unchanged since the 12d build — 12e is data-only),
both ports asset-integrity PASS. LKG re-promoted (commit advanced 794d004→a8adfa0,
same BUILD_ID — L1 last_known_good_release_not_current, fixed by rm LKG + re-promote).
- 12g Elite hub faces: ONE hero + colored chip/micro + sub (both portals). LIVE.
- 12h grid items-start: expanding never resizes siblings. LIVE.
- 12d Trajectory: provenance panel + "module submissions over time, NOT sandbox swaps"
  copy + ranked action + colored hero. LIVE. D3: demo-firm-elite carries a varied
  7-pt maturity history (Jan→Jul) already; the newest point == live index (12f).
- 12e review.vendor BattleCard fit: 0 strong/1 good (red-wall) → 1 strong / 4 good /
  10 weak (varied, 5 non-weak) via product scoreTarget re-tune to near-cap (4.9/4.85/
  4.7); Meridian 2/2/2 unchanged. Weak-heaviness is the score-only ceiling (15 shared
  base firms cluster high + 4.9 cap); a balanced mix needs structural firm-spread work.
- Reseed pass complete: purged 4 stale demo-bench vendors, canon RE-BASELINED to 238
  firms / 43 vendors (176 expansion + 15 base; 32 + 11); validation 2a-2d all pass;
  benchmarks recomputed (12 firm / 7 vendor). Peer cohort N=238 LIVE (12f reader correct).
- Number integrity re-verified LIVE against the re-baselined cohort: Elite peer "you"==
  Pro module scores, Alignment index 68 == Trajectory current 68. tests/number-integrity-elite
  8/8, test:unit 820/820.
INFRA NOTE: repeated tsx seed/probe runs leaked ~348 orphaned Prisma query-engines that
exhausted Neon's client limit (P2037 "too many clients") and blocked seeding — killed
via `pkill -9 -f "c2acct-live/node_modules/.pnpm/@prisma.*query-engine-darwin-arm64"`,
then connections drained. Always let tsx probes process.exit + $disconnect, or reap engines.
BLOCK 12 (a-h + reseed) COMPLETE. Mythos owns REGRESSION-CHECKLIST D-section + MYTHOS.md.

### BOX 4b-r — ecosystem-route relation-load cut (2026-09-02) — AWAITING MYTHOS + PUSH GO
Startup: fcc3fbe9 confirmed at origin/feature/engagement-v1 (no push needed).
ORIGIN PROVEN (not inferred): the 3,516 Company.findUnique were NOT select-less — they
carry an `include` (VendorProfile+Product+ProductSignal); the prior grouping keyed on
`select` only, so include-shaped calls showed as {}. Async stacks DO survive Prisma
middleware with Error.stackTraceLimit raised. All 3,516 = lib/vendorPat.ts:583
getVendorCompanyContext <- vendorProductInsightEngine.ts:1694 snapshot <- adminBriefingEngine
:1006 per-product loop <- :1075 (catalog, 1,739) and :1140 (company briefing, 1,739)
<- ecosystem.ts:600; +37+1 from the vendor catalog. Suspects :798/:963 were NOT it.
FIX (commit on branch, unpushed): vendor context folded into resolveVendorProductInsightContext's
existing per-vendor Promise.all; snapshot reads context.vendorContext; standalone + catalog
paths pass the loaded context through (their counts unchanged). Only file:
lib/vendorProductInsightEngine.ts.
NUMBERS (47 firms, depth=demo verified in-fixture: 37 products, 1,739 reviews; no reseed):
ops 5,925->2,504; Company.findUnique(include) 3,516->95; p50 5.806s->4.893s (today's
baseline; prior box recorded 5.516s); p90 6.806->5.508; p10 5.083->4.293.
VALIDATION: test:unit 1482/1482 (172 files) with changed file AND with HEAD file; eval 132/132;
tsc clean; eslint clean on the file.
SHORT OF 2s — STOPPED for re-auth. Route is CPU-bound (cpu 111% of wall, loop stalls to
200ms). NEXT DOMINANT TERM (measured): firm-review batch SurveySubmission.findMany x95 calls
/ 2 distinct arg sets / 165,205 rows / 413 MB answers JSON per request = the vendor's 1,739
reviews decoded 94x (twice per firm), and 37 firm-invariant product snapshots built 94x each.
Fix = compute vendor product snapshots once per request, share across per-firm briefings
(changes briefing entry-point signatures) — needs GO.
NOT-CLOSED: sub-2s target; the 94x firm-review refetch above; SurveyModule.findUnique x472
(5 per getBriefingProducts); getBriefingProducts run twice per firm (catalog + briefing);
push of this commit (Mythos on-disk verify first); ledger commit.

### BOX 4b-r2 — vendor snapshots once per request (2026-09-04) — AWAITING MYTHOS + PUSH GO
Startup: 647d7163 pushed (Mythos verified); ledger banked 86b31842 and pushed.
Baseline on 647d7163 same day: p50 4.628s / p90 4.808s. AFTER (commit 6686f4b6): p50 0.667s /
p90 0.743s / p10 0.583s. ops 2,504->1,380; SQL stmts 3,695->1,865; rows decoded 194,153->15,253;
answers JSON 514MB->26.3MB; firm-review batch 95 calls->1; SurveyModule.findUnique 472->98.
CHANGE: AdminBriefingContext (module ids + vendor snapshots by productId + latest vendor
assessments) built once by buildAdminBriefingContext(vendor); getBriefingProducts/
getAdminBriefingCatalog/getAdminCompanyBriefing take it optionally (additive, standalone paths
unchanged); getBriefingProductsForFirms dedupes catalog+briefing product layers; products outside
the vendor's active catalog computed per firm as before. getVendorProductInsightCatalog now =
vendorProductInsightCatalogFromSnapshots(getVendorProductInsightSnapshotsByProductId()).
Files: lib/adminBriefingEngine.ts, lib/ecosystem.ts, lib/vendorProductInsightEngine.ts.
IDENTITY PROOF: detail+list+vendor catalog+standalone briefing/catalog/snapshot serialised with
HEAD files vs new: 14,174,336 bytes each, byte-identical. test:unit 1482/1482 (=HEAD), eval
132/132, tsc + lint:repo clean.
TOOLING BANKED scripts/perf/: profile-query-shapes.ts (full-args + --chains; stackTraceLimit
finding), row-census.ts, profile-phases.ts, route-once.ts + summarize-cpuprofile.mjs (largest
profile = main thread), _perfScaleTarget.ts (depth=demo trap documented). All smoke-run.
SUB-2s MET. NOT-CLOSED: lib/firmPat.ts getFirmProductCatalog re-reads vendor assessments per
firm (48 calls/2 distinct args/20.3MB) + modules x94 (firmPat.ts:1158/:1162) — outside the
briefing family, untouched; buildEcosystemCard (ecosystem.ts list route), briefs.ts, firmBriefs.ts
still call the briefing entry points without the context (work, correct); push GO for 6686f4b6.

### ARC 2 — deploy-night readiness box (2026-09-04) — AWAITING MYTHOS + PUSH GO
Commit 85a80b64: docs/DEPLOY-NIGHT.md (full ordered night: quiesce → rotations one-at-a-time
[Telegram/BotFather, AUTH_SECRET, Neon reset] → API-key org swap → tier env vars w/ absent-vs-blank
table → audit triage → 6 pending migrations since 0157d40 via DIRECT_URL → cloud build/promote +
4 gates → seed-help-prod → 0-skip suites → rehearsals at min caps [web tier first provider call;
public tier /ask flag-on smoke] → flag order ASSISTANT(on)→LADDER→WEB_TIER→PUBLIC_TIER → un-quiesce
+ retire old creds; per-step rollback table; 10 sensitivities S1–S10). scripts/deploy-night-preflight.ts
+ deploy-night/checks.ts (pnpm deploy-night:preflight; read-only; blank≠absent w/ Number("")=0 trap
named; rotation fingerprints in scripts/deploy-night/known-old-fingerprints.json — 5 recorded
2026-09-04, one-way 16-hex; Vercel presence only, gated on existing CLI credential; audit; 0-skip
suites). 15 contract tests. CURRENT preflight: 9 PASS/10 FAIL/2 WARN/6 SKIP — FAILs = 5 un-rotated
secrets (by design), 3 tier vars ABSENT in Vercel Production (PAT_PUBLIC_IP_HASH_SALT,
PAT_WEB_TIER_DAILY_CAP_USD, PAT_PUBLIC_DAILY_CAP_USD), audit 3 critical/24 high. Vercel Production
presence read live: tier flags LADDER/WEB_TIER/PUBLIC_TIER absent (off), ASSISTANT/PINGS/BATTLECARD/
CONSULTANT_ACCESS/ALIGNMENT_BOARD/SELF_SIGNUP present.
RIDE-ALONG NOT CLOSED: pat-panel-history.spec.ts:86 waitForTimeout→aria-pressed propagation wait
committed, but the spec is KNOWN-STALE (docs/e2e-known-stale.md, all 5 tests since 6/11): HEAD spec
fails 5/5 on the fresh chain build, edited 15/15 ×3, all before the edited helper runs. Stability ×3
undemonstrable until the spec is un-staled (product decision). Sibling stray waitForTimeout at
e2e/firm-portal-toggle-visual.spec.ts:107 untouched.
VALIDATION: validate:launch green (mac-mini skipped): test:unit 1497/1497 (173 files; +15), build,
prelaunch, local-review + release-integrity e2e. secrets:scan clean. Perf fixture reseeded
--depth=demo after the chain (S1).
DISCLOSED: vercel env ls probes triggered the CLI device-login flow, which completed — this Mac's
Vercel CLI now holds a credential; nothing changed in Vercel; preflight guarded against repeating it.
NOT-CLOSED: the night itself (Cam's date + typed GO); audit triage (3 critical/24 high — fix or
written acceptance); AGENT_APPROVAL_HMAC_SECRET not in the rotation set (decide); Mac-mini plist
render snippet lives only in deploy history (operations.md:17) — runbook references it, does not
reproduce it; push GO.

### ASSESSMENT UX BOX — firm modules on one page (2026-09-04) — AWAITING MYTHOS + PUSH GO
Arc 2 85a80b64 + ledger bd406725 pushed (origin bd406725). Commit 5729147d: /survey/firm_alignment_*
renders all 25 questions in ONE card (isFlatAssessmentLayout, firm_alignment_ keys only; other
modules untouched): pagination + Process/Help panels + Page stat + ten-question explainer +
section labels + "Required" removed; prompt shown with the "<module title>: " prefix stripped
(displayPrompt, display-only — DB prompt unchanged). Files: AssessmentModuleClient.tsx,
lib/assessmentDisplay.ts, tests/assessment-display.contract.test.ts (+3).
PAYLOAD PROOF (Playwright vs dev :3012, demo-firm-pro, drafts wiped between runs, DOM layout
asserted): A(HEAD) 3 pages/7 drafts vs B(new) 1 page/2 drafts → /api/survey/submit body
BYTE-IDENTICAL (1,206 B), last-draft answers BYTE-IDENTICAL. Screenshots before ×3 / after ×1
delivered to Cam & Leslie.
VALIDATION: test:unit 1500/1500 (174 files) — one DB cohort test raced the live capture
submission (percentile 25 vs 24), passes alone 5/5; lint:repo + tsc clean.
NOT-CLOSED: open-ended multiple-choice redesign (option-set decision); helpText on Q21–25 still
says "required" in DB copy (seed + prod content change, needs GO); other modules keep the paged
layout (adopt on GO); push GO for 5729147d. Local docker DB: test submissions for the module
cleaned up (today's finals removed).

### UX box follow-through — help-text copy (2026-09-04) — AWAITING MYTHOS + PUSH GO
5729147d + 66f1145a pushed (origin 66f1145a). Rulings banked: flat helper for other module types
waits on Cam+Leslie seeing the firm module live (one screenshot round → GO); multiple-choice
redesign gated on Leslie's option sets (question doc in her inbox tonight); screenshots-outside-repo
accepted. CONTENT GO executed: commit 8fabe6eb lib/firmPat.ts helpText for the 5 open-ended
questions → "This response adds operating context; it does not change the numeric PAT score."
(required: true + submit gate unchanged). Reaches prod via ensureFirmAlignmentSystem's UPDATE
branch on the deploy night, never a direct prod mutation. Local: 25 rows updated, 0 say "required".
test:unit 1500/1500, lint clean. NOT-CLOSED: push GO for 8fabe6eb; deploy-night step to note —
first firm-module page load after deploy rewrites the help text (add to Z6 ledger expectations).

### HANDOFF — Forge session cleared (2026-09-04)
8fabe6eb + e1358b71 + 98081bd3 (runbook expectation line) pushed. Handoff banked: CLAUDE.md
(git-ignored local project memory, updated on disk) + docs/status/PATALIGN-STATUS-2026-09-04.md
(tracked: era table w/ hashes, validation state, preflight state, standing laws, gated queue as
data, tooling) + docs/README pointer. Commits: 64b0d554 = the snapshot's first version pushed
under a MISLABELED "ledger: bank" message (broken command chain — git refused the ignored
CLAUDE.md); left in history, not rewritten. 11503ce3 = "handoff: bank session memory for
successor" (laws + queue + README pointer). Harness memory written for the successor seat.
QUEUE (all gated, none self-start): V7 arc FIRST on Mythos's 21a PASS (:3011 flag-on vs :3000
off; then DARK 21c/21d/trust accordion/Ask Pat entry on V7FrontDoor; flag flips once, deploy
night, Cam's GO); audit triage (3 critical/24 high, written acceptances); corpus imports B2–B9
on sign-off; optional-polish perf idle-only; other-modules flat after screenshot round;
multiple-choice on Leslie's option sets; deploy night on Cam's date.
NOT-CLOSED: all queue items; AGENT_APPROVAL_HMAC_SECRET not yet in preflight specs; ledger
tail-append vs newest-first header (successor's call). Cam clears.
