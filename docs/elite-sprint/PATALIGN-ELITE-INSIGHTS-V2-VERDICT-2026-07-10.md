# Elite Insights v2 — Verdict, Evidence, and Rebuild Spec
### July 10, 2026 · Response to Cam's rejection of v1 · Built from two research streams: (1) 17-search competitive study of how survey/benchmark SaaS gate premium tiers, (2) full repo inventory of what PAT's data can honestly support

---

## THE VERDICT UP FRONT

**Keep the Elite tier. Kill Elite Insights v1. Rebuild as six decision products — and the data to do it already exists in our database, unused.**

Your instinct was exactly right: v1 is descriptive statistics wearing an Elite badge. "Firm-side average 78 across 101 firms" answers *what is the number* — which is a Pro-level question. Every 5x-priced tier in the industry answers four different questions: **Where do I rank against my peers? Who is moving toward or away from me? What should I do first? What can I show my partners/prospects?** V1 answers none of them. That's why Pro looked better — Pro was designed as a product; v1 Elite was designed as a disclaimer.

The repo inventory found the smoking gun: **`BenchmarkRun` already stores p10/p25/p50/p75/p90 percentile distributions and `CompanyBenchmark` already stores each firm's percentile position** (schema lines 64-70, 202) — and v1 *deliberately discards them*, rendering only a mean with the copy "not a ranking or percentile" (eliteInsights.ts:175). We built honest math, stored it, then hid it. The same is true of trend data (`FirmMaturitySnapshot` + `FirmMaturityMomentum` store delta, velocity, trend, volatility — **no surface reads them**), capability gap lists (computed, then collapsed to "N of M cleared"), and per-module divergence (computed per-utility, then collapsed to one number). The honesty rules were never the ceiling. The ceiling was that nobody designed for the data we have.

---

## 1 · WHY AN ELITE TIER OF INSIGHTS EXISTS (the research answer)

Across G2, Gartner Digital Markets, TrustRadius, Culture Amp, Gallup, APQC, Payscale, RMA/ProfitCents, Rosenberg, and IPA, premium analytics tiers gate the same eight things, in frequency order:

1. **Percentile/distribution depth instead of averages** — the single most universal gate. Base gets the mean; premium gets "you are at the 71st percentile," quartile bands, full distribution curves (RMA's enhanced edition sells *the entire curve*).
2. **Peer-referenced specificity** — premium compares you to the entities you actually compete with, not "the market."
3. **Custom peer cuts** with an anonymity floor of ≥5 (Payscale's rule is literally our suppression rule).
4. **Demand/behavior signals — "who is looking at you"** — the highest-priced vendor-side gate everywhere (G2 Buyer Intent runs $10K-87K/yr *as an add-on*).
5. **Marketable artifacts** — quadrants, badges, licensed reports vendors can publish.
6. **Scenario modeling / forecasting.**
7. **Prescriptive, decision-framed output** — ranked "fix this first," plain-language narrative (ProfitCents built a business selling auto-narrative to accountants).
8. **Human time + exports** (we already have this: quarterly consultant session, success manager).

Directly relevant to our exact market: **CPA firms already pay for percentile benchmarking as a standalone product.** The Rosenberg Survey charges $650-$1,200/yr for a PDF whose entire pitch is "Where does your firm rank?" IPA's paid product is a "firm report card — 20 KPIs vs all firms and vs your revenue band." Our Firm Elite can deliver that continuously, interactively, from live data. That's not a gimmick; that's displacing a line item our buyers already budget for.

**So: yes, Elite Insights should exist — but only as rank, trend, demand, and prescription. Never as averages.**

## 2 · WHY V1 FAILED (specifically)

- All six surfaces render **averages** — the one statistic research says must stay in the base tier.
- **Zero charts.** Premium analytics is signaled by percentile bands, distribution curves, heatmaps, quadrants. V1 shipped words.
- "Future demand projection" contains **no projection** — you caught this precisely. It shows current firm-side averages; nothing time-based, nothing forward.
- Future-state projection **is** a glorified Sandbox readout — same mean-swap arithmetic, minus the interactivity and the radar. The Sandbox does it better, so this card subtracts value.
- Elite Insights got a **duplicate card on the portal home** that leads to the same tab — navigation noise. Agreed: remove it; Elite lives as the tab inside Alignment Insights (both portals).

## 3 · WHAT THE DATA ALREADY SUPPORTS (the "dark data" — all honest, all in-DB today)

| Dark asset | Where it sits | What it becomes |
|---|---|---|
| p10-p90 distributions + per-firm percentile | BenchmarkRun / CompanyBenchmark | "You are here" percentile band charts — the #1 premium gate |
| Snapshot history + momentum (delta, velocity, volatility, trend) | FirmMaturitySnapshot / FirmMaturityMomentum | Real trajectory charts + honest directional projection |
| Per-capability gap-to-threshold (computed, discarded) | firmInsightEngine | Ranked "fix first" gap list with point deficits |
| Per-utility / per-section divergence (computed, collapsed) | vendorProductInsightEngine | Divergence heatmap: where vendor story ≠ firm reality |
| Sandbox swap-in/swap-out of a vendor's products | alignmentBoard (needs event logging) | First-party demand signal — G2 Buyer Intent's value story from our own data |
| Ordinal rank (computed in 3 engines, never shown to the subject) | salesCard / alignmentBoard / platformPicture | "You rank Nth of M" with suppression |
| Review recency/velocity | timestamps on every submission | Freshness + momentum signals |
| Score arrays behind every average | every engine | Distribution/spread visuals instead of single numbers |

Known gap: `Company` has **no size/segment field**, so custom peer cuts (research pattern #3) need a schema addition — roadmap, not launch.

## 4 · ELITE INSIGHTS V2 — THE SIX SURFACES

Design law for every card: **lead with a chart, position the customer inside a distribution, end with a ranked action.** Suppression (n≥5, >25% dominance), divergence floor (≥3), boundary wall, confidence bands, and "directional — not professional advice" all stay exactly as shipped.

**FIRM ELITE**
- **F1 · Peer Position Report** (replaces "peer benchmark view"): per-module shaded p25-p75 band with p90 "top decile" line and *your marker inside it*; overall percentile headline ("62nd percentile of 106 firms"); IPA-style report card table (each KPI: you / peer band / verdict chip). Data: BenchmarkRun + CompanyBenchmark, already stored.
- **F2 · Gap-to-Top-Quartile Plan** (replaces "recommendation engine"): ranked horizontal gap bars — every capability below its 60% bar with exact point deficit, ordered by drag on the alignment index; each gap paired with the module that moves it and a plain-language narrative block (ProfitCents idiom). This is prescription, not description.
- **F3 · Trajectory** (replaces "future-state projection", now genuinely time-based): line chart from snapshot history with momentum chips (velocity, volatility, trend); directional projection band clearly labeled; closing link to Sandbox expressed as percentile movement — "your best available swap moves you 48th → 71st percentile." That last framing turns the Sandbox and F3 into complements instead of duplicates.

**VENDOR ELITE**
- **V1 · Category Position** (replaces "market comparison"): distribution curve of vendor alignment strength with your marker; quartile chip; anonymized rank ("3rd of 9 in your category") once category n≥5 — suppressed below.
- **V2 · Demand Signals** (replaces "future demand projection" — the 5x headline): which firm segments are reviewing you, review velocity trend, divergence direction (closing = trust building), and Sandbox motion — *your products swapped IN to N simulated stacks, OUT of M, this quarter* (pipeline vs churn-risk signal). This is exactly what G2 sells for $10K-87K/yr, generated entirely by our own platform. Requires one new table: sandbox swap event logging — start recording NOW so signal accrues; surfaces honestly as "early signal" until floors are met.
- **V3 · Alignment Gap Map** (replaces "expansion simulation", which you rightly distrusted): per-module/per-utility divergence heatmap (green = firms confirm your story, red = firms read you lower) + taxonomy whitespace strip (workflow stages your reviewed footprint doesn't cover). Where to fix the story; where to expand next.

**Both audiences, post-launch roadmap (not July 23):** quarterly shareable PDF artifact + top-quartile badges (research pattern #5 — the G2 "right to publish" gate), custom peer cuts once firm-size fields exist.

## 5 · SHIP / HOLD DISCIPLINE

F1, F2, V1, V3 are computable from stored or already-computed-but-discarded data — buildable inside the launch window. F3 depends on snapshot depth (demo/pilot accounts need seeded history to demo honestly); V2 needs the event log started immediately and renders "early signal" states truthfully. **If any surface can't meet its bar by deploy night, it ships dark (flag off) rather than thin — an Elite tab with four excellent cards beats six mediocre ones.** Worst case, Elite still justifies itself at launch on Sandbox reveal + named Sales Card + unlimited Pat + consultant sessions, with Elite Insights following as the first post-launch drop. But the data says we don't need the fallback.

## 6 · CLAUDE CODE PROMPT (paste when you approve)

> Read docs/elite-sprint/PATALIGN-ELITE-INSIGHTS-V2-VERDICT-2026-07-10.md. Elite Insights v1 is rejected — rebuild per §4. Order of work:
> 1. Remove the duplicate "Elite Insights" card from both portal home pages; Elite Insights is reached only via the Alignment/Firm Insights tab toggle.
> 2. Wire the dark data: read BenchmarkRun p10-p90 + CompanyBenchmark.percentile into F1/V1; stop discarding the capability gap list (F2), per-utility divergence rows (V3), and snapshot/momentum tables (F3).
> 3. New: SandboxSwapEvent logging (companyId, productIn/Out, boundary, createdAt) writing from the board immediately; V2 reads it with confidence floors.
> 4. Charts are mandatory per card: percentile band (F1), ranked gap bars (F2), trajectory line + projection band (F3), distribution curve + marker (V1), trend chips + swap-flow tiles (V2), heatmap grid (V3). Reuse the radar/consultant-brief component family and visual standard; every projection labeled directional; all suppression/COI/boundary/confidence rules unchanged; demo seed must produce full-looking (never fabricated-live) states for every card, including seeded snapshot history for F3 demo accounts.
> 5. Full validation chain + ledger; HTTP-fetch verification against the running preview per the standing rule; screenshots of all six cards for Cam's review.

---
*Sources: full competitive report (G2, Gartner DM, TrustRadius, Culture Amp, Gallup, Lattice, APQC, Payscale, Rosenberg, IPA, RMA/ProfitCents, Boomer) with URLs, and the file:line data inventory, both preserved in session research — ask and I'll export either as standalone appendices.*
