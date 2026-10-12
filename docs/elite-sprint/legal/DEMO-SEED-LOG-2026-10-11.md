# Legal demo seed log (legal-load, R64) · 2026-10-11

Target: the preview database (host printed below; no env value appears). PAT_ENABLE_VERTICAL_PACKS=1 in the seed shell. Scripts: scripts/demo/seed-legal-demo.ts (dry run, then --apply), then scripts/compute-benchmarks.ts --cutoff 2026-09-30 --vertical legal. Passwords: ~/work/preview-accounts.txt only.

```
db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech

================ LEGAL DEMO SEED — DRY RUN ================
Namespace: demo-legal-ecosystem-* / demo-legal-vendor-* / demo-legal-firm-* · vertical legal · boundary DEMO

  Marrowfield Legal Systems Ecosystem [large-incumbent] · 4 products · 9 firms (mid-tier×3, high-performing×3, compliance-heavy×1, struggling×1, tech-forward×1)
  Copperline Practice Cloud Ecosystem [modern-fast-mover] · 4 products · 8 firms (compliance-heavy×2, mid-tier×3, high-performing×2, struggling×1)
  Ledgerwick Trust Software Ecosystem [niche-depth] · 2 products · 7 firms (tech-forward×2, compliance-heavy×1, mid-tier×2, high-performing×2)
  Quillstone AI Ecosystem [modern-fast-mover] · 5 products · 9 firms (mid-tier×4, sample-thin×2, struggling×1, high-performing×1, tech-forward×1)
  Northfork Docket Works Ecosystem [mid-market-specialist] · 3 products · 7 firms (high-performing×1, compliance-heavy×1, mid-tier×4, struggling×1)

TOTALS: 5 vendors · 18 products · 40 firms · 106 firm product reviews (plus module submissions per completionRate).

DRY RUN — nothing written. Re-run with --apply.
---- dry run exit: 0 ----

================ LEGAL DEMO SEED — APPLY ================
Namespace: demo-legal-ecosystem-* / demo-legal-vendor-* / demo-legal-firm-* · vertical legal · boundary DEMO

  Marrowfield Legal Systems Ecosystem [large-incumbent] · 4 products · 9 firms (mid-tier×3, high-performing×3, compliance-heavy×1, struggling×1, tech-forward×1)
  Copperline Practice Cloud Ecosystem [modern-fast-mover] · 4 products · 8 firms (compliance-heavy×2, mid-tier×3, high-performing×2, struggling×1)
  Ledgerwick Trust Software Ecosystem [niche-depth] · 2 products · 7 firms (tech-forward×2, compliance-heavy×1, mid-tier×2, high-performing×2)
  Quillstone AI Ecosystem [modern-fast-mover] · 5 products · 9 firms (mid-tier×4, sample-thin×2, struggling×1, high-performing×1, tech-forward×1)
  Northfork Docket Works Ecosystem [mid-market-specialist] · 3 products · 7 firms (high-performing×1, compliance-heavy×1, mid-tier×4, struggling×1)

TOTALS: 5 vendors · 18 products · 40 firms · 106 firm product reviews (plus module submissions per completionRate).

APPLYING…
Ecosystem "Marrowfield Legal Systems Ecosystem": vendor + 4 products, 9 firms, Guide review.consultant+legal-marrowfield@pat.local
Ecosystem "Copperline Practice Cloud Ecosystem": vendor + 4 products, 8 firms, Guide review.consultant+legal-copperline@pat.local
Ecosystem "Ledgerwick Trust Software Ecosystem": vendor + 2 products, 7 firms, Guide review.consultant+legal-ledgerwick@pat.local
Ecosystem "Quillstone AI Ecosystem": vendor + 5 products, 9 firms, Guide review.consultant+legal-quillstone@pat.local
Ecosystem "Northfork Docket Works Ecosystem": vendor + 3 products, 7 firms, Guide review.consultant+legal-northfork@pat.local

Legal demo seed complete: {
  ecosystems: 5,
  vendors: 5,
  products: 18,
  vendorProductAssessments: 18,
  consultants: 5,
  firms: 40,
  firmModuleSubmissions: 174,
  firmProductReviews: 106,
  linkedFirmUsers: 152,
  boundaryClassified: { demo: 209, pilot: 4 }
}
Legal companies: 45 (DEMO: 45); legal submissions: 298; legal follow-up pick rows: 1047.

Hub cards (R-S), one line per legal demo firm: modules complete · alignment index · a prose sample
  Rivermark Employment Law · 4/5 · 58 · "Marrowfield Legal Systems treats discovery review as a check-the-box feature rather than a first-class workflow. Adequate, not ambitious."
  Halden Marsh · 5/5 · 69 · "Since rolling out Marrowfield Vault across our discovery team, error rates on month-end close have dropped to near zero."
  Linden Pike Litigation · 4/5 · 68 · "Marrowfield Docket is functional for client communication but has not kept pace with the modern automation tools our peers are adopting."
  Quennell Litigation Group · 5/5 · 68 · "Marrowfield Legal Systems is solid where it's solid. The reporting layer is consistently solid; the automation layer is less mature."
  Ashgrove Partners · 5/5 · 70 · "We see clear runway with Marrowfield Ledger for the next 18 months. The discovery review roadmap they shared aligns with where our practice is headed."
  Stanmore Appellate · 4/5 · 56 · "Marrowfield Docket delivers on its core docketing promise. Where it falls short is when we try to extend it into e-billing rejections."
  Ellery Shaw Business Law · 5/5 · 73 · "Since rolling out Marrowfield Docket across our client communication team, error rates on month-end close have dropped to near zero."
  Hartwell & Dunne · 3/5 · 45 · "Marrowfield Ledger surfaces too many notifications without clear prioritization. Staff have started ignoring alerts, which defeats the discovery oversight purpose."
  Whitfield Harbor · 5/5 · 63 · "We see clear runway with Marrowfield Gate for the next a full fiscal year. The docketing roadmap they shared aligns with where our practice is headed."
  Granholm Insurance Defense · 5/5 · 67 · "Copperline Matters handles transactional work well, but we've had to build workarounds for legacy document management migrations. Net positive but not without rough edges."
  Northgate Criminal Defense · 4/5 · 68 · "The first a full fiscal year with Copperline Intake was rough; the platform has stabilized since. We're now in a steady-state discovery usage pattern with no urgent complaints."
  Vantage Patent Group · 5/5 · 82 · "Copperline Intake replaced three separate tools we used to stitch together. Onboarding new staff is materially faster now."
  Serrano Whitlock · 5/5 · 77 · "The first the past three years with Copperline Matters was rough; the platform has stabilized since. We're now in a steady-state discovery usage pattern with no urgent complaints."
  Westerly Bankruptcy Law · 4/5 · 65 · "Our practice is at an inflection point. Whether Copperline Connect can support us through a new practice group depends on how aggressively Copperline Practice Cloud invests in the trust reconciliation layer."
  Delacroix Real Estate Law · 3/5 · 61 · "We need deeper matter analytics for our trust accounting engagements and Copperline Practice Cloud doesn't appear to have it on the roadmap. We're already evaluating our court e-filing accounts."
  Drummond Chase · 4/5 · 66 · "We need multi-office conflicts search solved before we can scale our intake and conflicts practice to two lateral partners next year. Copperline Practice Cloud has hinted at it but no firm timeline."
  Fairbanks Lowell · 5/5 · 73 · "Copperline Matters replaced three separate tools we used to stitch together. Onboarding new staff is materially faster now."
  Marrow Street Law · 5/5 · 69 · "We've used Ledgerwick Trust Software for the past three years and the docketing workflow has cut our cycle time by roughly half. The integration with our practice management system just works."
  Corvid Lane Defense · 5/5 · 77 · "Our 12-month plan assumes Ledgerwick Reconcile will close the gap on API-first integration. If that slips, we'll need to evaluate our practice management system as a primary alternative."
  Brennan Vale LLP · 4/5 · 59 · "After 18 months we still find Ledgerwick Reconcile useful for litigation but we wouldn't recommend it for firms whose primary need is legacy document management migrations."
  Pellerin Global · 5/5 · 62 · "We've used Ledgerwick Trust Software for roughly a year and the trust reconciliation workflow has cut our cycle time by roughly half. The integration with our e-billing portal just works."
  Caldwell Municipal Law · 4/5 · 56 · "Ledgerwick Trust Software treats conflicts clearance as a check-the-box feature rather than a first-class workflow. Adequate, not ambitious."
  Thorne & Castellano · 5/5 · 74 · "The reliability of Ledgerwick Trust Software's docketing infrastructure is genuinely uncommon. We've had near-zero unplanned downtime over roughly a year."
  Monarch & Tate · 5/5 · 77 · "The reliability of Ledgerwick Trust Software's trust accounting infrastructure is genuinely uncommon. We've had near-zero unplanned downtime over roughly a year."
  Baymont Immigration · 4/5 · 55 · "Quillstone AI treats discovery review as a check-the-box feature rather than a first-class workflow. Adequate, not ambitious."
  Ashby Clinic for Veterans · 4/5 · 67 · "Quillstone AI's pricing structure punishes growth. Adding seats for the trust accounting team last quarter doubled our annual cost."
  Redfern Collective · 3/5 · 55 · "We need deeper matter analytics for our litigation engagements and Quillstone AI doesn't appear to have it on the roadmap. We're already evaluating our document management system."
  Harrowgate Trusts · 5/5 · 81 · "Quillstone AI has been the most reliable platform in our stack for two years. Their support response is consistently still maturing."
  Kestrel Rowe · 4/5 · 67 · "Quillstone AI's discovery review interface needs a refresh. Functionally it works but it doesn't reflect how a modern firm operates."
  Okafor Injury Law · 5/5 · 67 · "We've used Quillstone AI for the past three years and the trust reconciliation workflow has cut our cycle time by roughly half. The integration with our trust accounting ledger just works."
  Vesterholm Legal Aid · 4/5 · 60 · "The next two years of our transactional work growth plan assumes Quillstone Research continues its current trajectory. So far we have no reason to doubt it."
  Greer & Holloway · 4/5 · 56 · "After 18 months with Quillstone AI we have a stable discovery review setup, though the outside counsel guideline variations side still needs manual oversight."
  Camden Peake · 4/5 · 76 · "Quillstone Signals handles intake and conflicts well, but we've had to build workarounds for cross-border data rules. Net positive but not without rough edges."
  Oriel Tax Controversy · 5/5 · 73 · "Northfork Rules is the cleanest trust reconciliation solution we've evaluated in a full fiscal year of looking. Implementation took roughly half the time of comparable platforms."
  Bellweather Healthcare Law · 5/5 · 79 · "Northfork Rules handles intake and conflicts well, but we've had to build workarounds for cross-border data rules. Net positive but not without rough edges."
  Pruitt Family Law · 4/5 · 68 · "Northfork Rules delivers on its core client communication promise. Where it falls short is when we try to extend it into legacy document management migrations."
  Ironwood Energy Counsel · 4/5 · 68 · "We need privilege log granularity solved before we can scale our intake and conflicts practice to a new practice group. Northfork Docket Works has hinted at it but no firm timeline."
  Lindqvist Estate Counsel · 3/5 · 46 · "We've documented the cross-border data rules gap in Northfork Budget for 18 months. The vendor's response has been polite acknowledgement without action."
  Tallis Reed · 4/5 · 76 · "Our 12-month plan assumes Northfork File will close the gap on configurable approval flows. If that slips, we'll need to evaluate our internal intake form as a primary alternative."
  Sable & Orrin · 4/5 · 75 · "After the past three years we still find Northfork Budget useful for client communication but we wouldn't recommend it for firms whose primary need is outside counsel guideline variations."

  guide · review.consultant+legal-marrowfield@pat.local
  vendor (elite) · demo-legal-marrowfield-vendor@pat.local
  firm (pro) · demo-legal-rivermark-employment-law-0-0-user1@pat.local
  firm (elite) · demo-legal-halden-marsh-0-1-user1@pat.local
  firm (pro) · demo-legal-linden-pike-litigation-0-2-user1@pat.local
  firm (pro) · demo-legal-quennell-litigation-group-0-3-user1@pat.local
  firm (elite) · demo-legal-ashgrove-partners-0-4-user1@pat.local
  firm (pro) · demo-legal-stanmore-appellate-0-5-user1@pat.local
  firm (elite) · demo-legal-ellery-shaw-business-law-0-6-user1@pat.local
  firm (pro) · demo-legal-hartwell-and-dunne-0-7-user1@pat.local
  firm (elite) · demo-legal-whitfield-harbor-0-8-user1@pat.local
  guide · review.consultant+legal-copperline@pat.local
  vendor (elite) · demo-legal-copperline-vendor@pat.local
  firm (pro) · demo-legal-granholm-insurance-defense-1-0-user1@pat.local
  firm (pro) · demo-legal-northgate-criminal-defense-1-1-user1@pat.local
  firm (elite) · demo-legal-vantage-patent-group-1-2-user1@pat.local
  firm (pro) · demo-legal-serrano-whitlock-1-3-user1@pat.local
  firm (pro) · demo-legal-westerly-bankruptcy-law-1-4-user1@pat.local
  firm (pro) · demo-legal-delacroix-real-estate-law-1-5-user1@pat.local
  firm (pro) · demo-legal-drummond-chase-1-6-user1@pat.local
  firm (elite) · demo-legal-fairbanks-lowell-1-7-user1@pat.local
  guide · review.consultant+legal-ledgerwick@pat.local
  vendor (pro) · demo-legal-ledgerwick-vendor@pat.local
  firm (elite) · demo-legal-marrow-street-law-2-0-user1@pat.local
  firm (pro) · demo-legal-corvid-lane-defense-2-1-user1@pat.local
  firm (pro) · demo-legal-brennan-vale-llp-2-2-user1@pat.local
  firm (elite) · demo-legal-pellerin-global-2-3-user1@pat.local
  firm (pro) · demo-legal-caldwell-municipal-law-2-4-user1@pat.local
  firm (elite) · demo-legal-thorne-and-castellano-2-5-user1@pat.local
  firm (elite) · demo-legal-monarch-and-tate-2-6-user1@pat.local
  guide · review.consultant+legal-quillstone@pat.local
  vendor (elite) · demo-legal-quillstone-vendor@pat.local
  firm (pro) · demo-legal-baymont-immigration-3-0-user1@pat.local
  firm (pro) · demo-legal-ashby-clinic-for-veterans-3-1-user1@pat.local
  firm (pro) · demo-legal-redfern-collective-3-2-user1@pat.local
  firm (elite) · demo-legal-harrowgate-trusts-3-3-user1@pat.local
  firm (pro) · demo-legal-kestrel-rowe-3-4-user1@pat.local
  firm (elite) · demo-legal-okafor-injury-law-3-5-user1@pat.local
  firm (pro) · demo-legal-vesterholm-legal-aid-3-6-user1@pat.local
  firm (pro) · demo-legal-greer-and-holloway-3-7-user1@pat.local
  firm (pro) · demo-legal-camden-peake-3-8-user1@pat.local
  guide · review.consultant+legal-northfork@pat.local
  vendor (pro) · demo-legal-northfork-vendor@pat.local
  firm (elite) · demo-legal-oriel-tax-controversy-4-0-user1@pat.local
  firm (pro) · demo-legal-bellweather-healthcare-law-4-1-user1@pat.local
  firm (pro) · demo-legal-pruitt-family-law-4-2-user1@pat.local
  firm (pro) · demo-legal-ironwood-energy-counsel-4-3-user1@pat.local
  firm (pro) · demo-legal-lindqvist-estate-counsel-4-4-user1@pat.local
  firm (pro) · demo-legal-tallis-reed-4-5-user1@pat.local
  firm (pro) · demo-legal-sable-and-orrin-4-6-user1@pat.local
---- apply exit: 0 ----
Benchmarks computed at cutoff 2026-09-30T23:59:59.999Z for vertical legal: 0 firm runs, 0 vendor runs.
---- compute legal exit: 0 ----
```

Follow-up (same shell, after the seed): the seeded legal rows are dated in October, after the 2026-09-30 cutoff, so the September run above has 0 legal rows. The legal cohort is computed at the current quarter's cutoff (the published default rule), which is where October submissions land.

```
Benchmarks computed at cutoff 2026-12-31T23:59:59.999Z for vertical legal: 6 firm runs, 8 vendor runs.
  vendor:demo Billing, Payments & Trust: 3 vendors, max share 33% → SUPPRESSED (insufficient_contributors)
  vendor:demo Docketing, Conflicts & Records: 2 vendors, max share 50% → SUPPRESSED (insufficient_contributors)
  vendor:demo Documents & Knowledge: 2 vendors, max share 50% → SUPPRESSED (insufficient_contributors)
  vendor:demo Matters & Practice Management: 1 vendors, max share 100% → SUPPRESSED (insufficient_contributors)
  vendor:demo Intake, Clients & Portal: 1 vendors, max share 100% → SUPPRESSED (insufficient_contributors)
  vendor:demo Security, Integration & Projects: 3 vendors, max share 33% → SUPPRESSED (insufficient_contributors)
  vendor:demo Research, Analytics & AI: 1 vendors, max share 100% → SUPPRESSED (insufficient_contributors)
  vendor:demo Discovery, Litigation & Holds: 1 vendors, max share 100% → SUPPRESSED (insufficient_contributors)
---- compute legal (default cutoff) exit: 0 ----
```
