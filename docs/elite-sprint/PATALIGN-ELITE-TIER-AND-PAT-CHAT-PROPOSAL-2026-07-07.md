# Patalign — Elite Tier, Pat Chat & Consent v2
### Prepared July 7, 2026 · Grounded in the March-10 AAE Guide + June Pat/agent blueprints · Proposal, not shipped code

## 1. Consent copy v2 — no loophole needed, and here's why

You asked for a loophole so that opt-outs don't shrink the benchmark data. Good news: **you don't need one, and you shouldn't want one** — a loophole that users later discover is how trust products die. The clean, standard, defensible structure (this is how essentially every serious SaaS does it) is to separate two different things:

**Thing 1 — Platform data.** Assessments, scores, deltas, aggregated benchmarks. This is core product functionality, governed by the **Terms of Service and Privacy Policy everyone accepts at sign-up**. Benchmarks are computed from all participants' data, anonymized/aggregated — that's the product working as described, not an AI feature. Opting out of Pat has zero effect on this, the same way turning off Slack's AI summaries doesn't remove your messages from Slack.

**Thing 2 — The Pat assistant.** A conversational interface. The opt-in toggle governs only this: whether you get the chat experience. That's it.

**The consent copy (short, honest, ends with the terms reference like you wanted):**

> **Meet Pat — optional AI assistant**
> Pat is Patalign's AI guide. Turn Pat on and you can ask questions about using the platform — and, on Elite, about your own scores and alignment data — in plain language, any time.
> Pat is optional and off by default. It doesn't change your platform experience, your scores, or how Patalign's aggregated, anonymized benchmarks work, as described in the [Terms of Service] and [Privacy Policy].
> ☐ Turn on Pat. I understand Pat is an AI assistant, not a person.

*(Per Cam, July 7: the "conversations may be reviewed to improve quality" line moves into the ToS/Privacy Policy, not the checkbox. Final copy above.)*

**One action item this creates:** verify the ToS/Privacy Policy (the May-19 `.pages` files) actually contain the aggregated-benchmark language. If they don't, that sentence gets added there — that's the honest home for it, and it's also what protects the benchmark product itself. This isn't burying it; it's putting data terms where data terms belong and keeping the AI toggle about the AI.

**Important flag for the Elite data-aware Pat (§3):** when Pat can discuss a firm's own live data, the consent copy above already covers it ("about your own scores and alignment data"). What changes is engineering, not consent: the retrieval layer must scope live-data queries to the user's own tenancy exactly like the portal pages do. Consent is not the wall; the database is the wall — same rule as always.

## 2. Pat is the living layer (your reminder vision — already designed, partly built)

What you described — "Hi, I'm Pat. Firm B hasn't touched modules 4 and 5" to a consultant — is precisely the locked Phase A+B fusion from June 18: the deterministic trigger engine (progress / inactivity / quarterly-deadline / escalation-after-3-ignored-nudges) decides *when and who*, and Pat is the voice and personality that *composes* the message and answers "why am I getting this?" In-app + email only — no SMS, agreed. `lib/notifications/` (triggers, cadence, nudge, sweep) already exists in the working repo behind `PAT_ENABLE_PINGS`; what remains is the notification-center UI, Resend wiring, and turning trigger output into Pat-voiced copy. So the "living Pat" isn't a new project — it's the same one, and it's the personality layer that makes the mascot (pick a letter from the concept sheet) feel inevitable.

## 3. The Elite tier — "Ultimate Alignment"

Grounded in the March-10 AAE guide (deltas as the primary intelligence metric, confidence bands on thin data, sample thresholds against false precision) plus your Tinder-Gold instinct. Elite is the same engine, pointed forward:

**For firms — the Alignment Board (the puzzle-board).** Your current stack laid out as pieces, each carrying its live alignment score against your firm's five-module shape. Drag a piece out, drop a candidate product in → the firm's projected alignment recomputes in front of them, with confidence bands (AAE discipline: never fake precision on thin data). Ranked "best next swap" recommendations underneath. This is the Stack Forecaster from the June docs with your animation framing — the "what if" toy that a managing partner will play with for an hour, and the renewal moat: the longer you're on PAT, the better your board knows you.

**For vendors — the BattleCard.** The same math, reversed: "Firms with shapes like these are your best-fit market; here's where your product closes their gap; here's the pitch, pre-loaded with the delta evidence." Layups, like you said. This is what makes Elite irresistible on the vendor side — it converts PAT from a report card into pipeline.

**Pat chat placement (your instinct is right — two tiers, not three):**
- **Pro:** Pat included, help-and-navigation scope, usage-capped (~50 questions/mo). Costs us fractions of a cent per question; huge perceived value; keeps SKU count at two.
- **Elite:** Pat unlimited **and data-aware** — "talk to Pat about your BattleCard / your Alignment Board." Pat explains the delta, drafts the pitch paragraph, walks the partner through the swap simulation. The chatbot isn't the product you sell; it's what makes the Elite data products feel alive. Don't price it separately — price Elite higher because Pat is in it.

**Pricing thinking (your call, my read; numbers to pressure-test with the partners):** you rejected the $199/$799 research anchors as too light, and with quarterly consultant fly-outs attached you're not selling software, you're selling a program. Anchors I'd model: **Firm Pro $349–$499/mo · Firm Elite $1,500–$2,500/mo** (annual, includes quarterly consultant session — the fly-out cost math has to live inside this number, so set it after you cost a fly-out) · **Vendor Pro $500–$750/mo · Vendor Elite (BattleCard) $2,500–$4,000/mo** — vendors pay more because Elite feeds revenue, not just insight. Kill the FREE tier in copy everywhere (it's already dead in your design decisions; the enum keeps FREE only as a technical rank-0).

**Build order (post-Thursday, pre-revenue-critical):**
1. ELITE entitlement gate in code (today nothing checks ELITE — 15 call sites check PRO only; this is the prerequisite for everything above).
2. Alignment Board v1: real data, existing radar/delta math, swap = recompute; animation polish second.
3. BattleCard v1 for vendors (query + ranked fit list + evidence bullets).
4. Data-aware Pat (Phase C from the agent vision: `query_database` tools, tenancy-scoped, human-reviewed answers first).
5. Consent v2 copy + ToS benchmark-language verification (§1) ships with whichever of the above goes live first.

## 3b. July-7 additions (Cam's calls, locked)

**Clickable puzzle pieces — the "Tinder profile" card.** Every piece on the Alignment Board opens a detail card: product name + vendor, price band, alignment score vs. this firm's shape, top capability strength, top gap, adoption/sample stat, one-line "why it fits / why it doesn't." Professional, sparse, swipe-simple — five facts max, no paragraphs. (On Pro-teaser boards the card renders anonymized: "Product 3 · Practice management · would raise your alignment +11" — identity unlocks with Elite.)

**Pro teaser boards (the incentive game).** Pro firms get the same Alignment Board with anonymized candidates — "Product One, Product Two" — so they can drag pieces and watch their score change without seeing which products they are. "I'd score 78 with these three swaps… what ARE they?" is the upgrade moment. Same for vendors: Pro gets a BattleCard teaser (count + shape of best-fit firms, anonymized); Elite names them. **Naming locked (Cam, July 7): "Secret Products" and "Secret Firms."** Piece label: "Secret Product 3 · Practice management · +11 alignment." Unlock CTA: "Reveal with Elite."

**Adaptive firm modules (the original AAE feature, revived).** Firms get the vendor-style card-select experience: pick your practice areas/tools/utilities as cards → the question set expands from those selections (same Latin-square cadence as vendor product assessments). Then delta-driven follow-ups: PAT clusters firms into scoring-pattern subsets and unlocks the next module based on the pattern the firm's answers place it in — each completed module unlocks additional insight (and gives PAT another data point). Progressive unlocks = engagement loop + richer benchmark data. Design nod: modules unlock sequentially like a course path; completion of module N gates module N+1.

**Tier decisions reaffirmed:** FREE is dead — remove it from every surface and every copy pass (the enum's rank-0 stays as a technical artifact only, never rendered). Two tiers: Pro = basic Pat chat + core assessments + teaser boards. Elite = everything: data-aware unlimited Pat, named Alignment Board, named BattleCard, adaptive module tree, quarterly consultant sessions.

## 3c. Applying the Systematic Influence & Control Framework (Cam's MASTER doc)

Your Modules 0–5 doctrine, mapped onto the product and the sell — using its structure, keeping everything factual (your own no-fake rule stays the ceiling):

- **Module 0 (Law of Averages / Gumball) → Pat's ping cadence and vendor outreach.** The nudge engine is the gumball machine institutionalized: consistent, repeatable asks; 2-3 nudges max then escalate; no emotional reaction to any single "no." Pat never chases — it pulls the next gumball. This is also the vendor-pipeline metric to show on the admin surface: asks made, not deals closed.
- **Module 1 (Control ≠ Pressure / Excited Indifference) → the demo voice and Pat's personality.** Pat's copy is calm, structured, never needy: "Firm B is at 40% on modules 4-5 — worth a nudge?" not "URGENT!" Same register in the C2F session scripts: frame early, let them talk first, silence after the hero number (89 vs 56 — say it, then stop).
- **Module 2 (CPR / Discovery creates ownership) → the adaptive firm modules.** The card-select + expanding-question design IS staged discovery: surface questions earn depth questions; the firm's own answers create ownership of the result. Build the module tree with that staging explicitly (Stage 1 easy cards, Stage 2 surface, Stage 3 depth-unlock).
- **Module 3 (Flow / Bullet Theory / Framing) → the BattleCard layout.** Each card = one bullet: single claim, single evidence line, single next action. The Tinder-card five-fact cap comes straight from this.
- **Module 4 (Urgency / Lightning / No-Tomorrow) → real scarcity only.** Pilot-seat counts, founder-pricing windows, quarterly assessment deadlines — all true, all expiring, all usable as decision windows. No manufactured countdowns; your trust positioning ("a score nobody can buy") dies the day a fake timer ships.
- **Module 5 (Closing / Assumptive forward motion / Follow-Up Frenzy) → onboarding + Pat's lock-in sequence.** Session close is assumptive: "Let's get your products on the board" → account provisioned in-meeting. Post-session, the follow-up sequence is Pat's job: day-1 recap ping, day-3 first-value nudge, day-7 progress note — the Frenzy, automated, from a friendly identity.

## 4. Wednesday all-hands flip list (draft — confirm)

Rotate: Neon DB password (verify June rotation actually happened first), cameron@ admin password, all four demo pilot passwords (`scripts/audit/diagnose-pilot-logins.ts --reset`), Telegram bot token if it's ever been in scrollback, `AUTH_SECRET`. Flip on (prod env): `PAT_ENABLE_PAT_ASSISTANT` (after consent v2 lands — otherwise it's all-users-on with no opt-in, which contradicts the client promise), `PAT_ENABLE_PINGS` (in-app only; leave `PAT_PINGS_EMAIL_ENABLED` off until Resend + SPF/DKIM/DMARC exist), `PAT_ENABLE_SELF_SIGNUP` only if you truly want public account creation before the agreement is signed. Stripe live keys + bank account: you enter these in the Stripe dashboard (Settings → Bank accounts → payouts), then `PAT_BILLING_ENABLED=1` + price IDs + webhook subscription check per the readiness report.
