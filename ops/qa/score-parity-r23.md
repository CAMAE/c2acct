# Score parity · local-before (localhost) vs local-after (localhost) · 2026-09-14T06:35:32.280Z

Firms in both: 157 (only local-before: 0; only local-after: 0). Products in both: 127 (only local-before: 0; only local-after: 0).
Firm differences: 0; product differences: 33; of which explained by a newer submission on local-after: 0.

Reading (Forge, box 2b R23, 2026-09-14). Same local database before and after `pnpm reset:demo` on the seed-ladder change in lib/demoPatEcosystemSeed.ts. No firm index moved. Every product row is explained by the change, not by a new submission (the tool tags "defect?" whenever the newest submission date is unchanged):
- 31 products: Demo Company's completed firm review deleted by its stable id (reviews 15 → 14; firm-reviewed average shifts by ≤ 0.4 pt). Demo Company now holds four reviews — APStream Control, LedgerFlow Close, Nexus Guard, PayGrid — plus the MetricBoard draft and ClientVault not-started, as before.
- PeopleLedger · PayGrid: Demo Company's review re-seeded at the weak target (~24%), so the cross-firm average falls 59.5 → 57.6 (reviews 15 → 15).
- PAT Demo Vendor · MetricBoard FP&A: vendor self-assessment 60 → 84 against an unchanged ~60 firm-reviewed average (n = 14, above the divergence floor) — the Pro vendor demo's large divergence.


## Firm differences

| firm | index local-before→local-after | modules | newest submission local-before / local-after | cause |
|---|---|---|---|---|

## Product differences

| product | self % | firm-reviewed % | divergence | reviews | newest submission local-before / local-after | cause |
|---|---|---|---|---|---|---|
| PracticePilot · Pilot Workflow | 60→60 | 58.8→59.2 | -1.2→-0.8 | 15→14 | 2026-05-25 / 2026-05-25 | **defect?** |
| Orbit Payables · Vendor Master Watch | 84→84 | 60.9→60.5 | -23.1→-23.5 | 15→14 | 2026-05-15 / 2026-05-15 | **defect?** |
| Northstar Ledger Systems · ReconNorth | 89→89 | 64.7→64.9 | -24.3→-24.1 | 15→14 | 2026-05-10 / 2026-05-10 | **defect?** |
| ComplianceGrid · Grid Approvals | 60→60 | 58.7→59.1 | -1.3→-0.9 | 15→14 | 2026-05-29 / 2026-05-29 | **defect?** |
| SignalWise Reporting · Variance Room | 89→89 | 70.1→70 | -18.9→-19 | 15→14 | 2026-05-17 / 2026-05-17 | **defect?** |
| PeopleLedger · Benefits Sync | 73→73 | 74.2→74.1 | 1.2→1.1 | 15→14 | 2026-05-21 / 2026-05-21 | **defect?** |
| Workpaper Forge · Evidence Bridge | 53→53 | 53.5→53.6 | 0.5→0.6 | 15→14 | 2026-05-18 / 2026-05-18 | **defect?** |
| RevenueCraft · BillCraft | 84→84 | 79.8→80.1 | -4.2→-3.9 | 15→14 | 2026-05-27 / 2026-05-27 | **defect?** |
| ClearPath Tax Automation · SafeSign Tax | 85→85 | 67.6→67.6 | -17.4→-17.4 | 15→14 | 2026-05-12 / 2026-05-12 | **defect?** |
| SignalWise Reporting · SignalBoard | 85→85 | 81→81.2 | -4→-3.8 | 15→14 | 2026-05-17 / 2026-05-17 | **defect?** |
| PeopleLedger · PayGrid | 89→89 | 59.5→57.6 | -29.5→-31.4 | 15→15 | 2026-05-21 / 2026-05-21 | **defect?** |
| ClearPath Tax Automation · TaxFlow Router | 82→82 | 78.5→78.9 | -3.5→-3.1 | 15→14 | 2026-05-12 / 2026-05-12 | **defect?** |
| Northstar Ledger Systems · ConsoliQ | 80→80 | 78.1→78 | -1.9→-2 | 15→14 | 2026-05-10 / 2026-05-10 | **defect?** |
| ClientBridge Collab · Engage Room | 82→82 | 79.3→79.4 | -2.7→-2.6 | 15→14 | 2026-05-23 / 2026-05-23 | **defect?** |
| PracticePilot · Pipeline Practice | 85→85 | 59.3→59.3 | -25.7→-25.7 | 15→14 | 2026-05-25 / 2026-05-25 | **defect?** |
| RevenueCraft · CollectCraft | 78→78 | 75.5→75.7 | -2.5→-2.3 | 15→14 | 2026-05-27 / 2026-05-27 | **defect?** |
| ComplianceGrid · PolicyGrid | 84→84 | 53.9→54 | -30.1→-30 | 15→14 | 2026-05-29 / 2026-05-29 | **defect?** |
| RevenueCraft · Revenue Bridge | 89→89 | 68.5→68.4 | -20.5→-20.6 | 15→14 | 2026-05-27 / 2026-05-27 | **defect?** |
| Northstar Ledger Systems · Northstar GL Hub | 93→93 | 64.9→65.3 | -28.1→-27.7 | 15→14 | 2026-05-10 / 2026-05-10 | **defect?** |
| ClientBridge Collab · Request Pulse | 53→53 | 54.9→54.8 | 1.9→1.8 | 15→14 | 2026-05-23 / 2026-05-23 | **defect?** |
| PeopleLedger · Timekeeper Link | 73→73 | 73.3→73 | 0.3→0 | 15→14 | 2026-05-21 / 2026-05-21 | **defect?** |
| Orbit Payables · SpendOrbit | 60→60 | 60.6→60.8 | 0.6→0.8 | 15→14 | 2026-05-15 / 2026-05-15 | **defect?** |
| PracticePilot · Capacity Radar | 84→84 | 54.2→54.3 | -29.8→-29.7 | 15→14 | 2026-05-25 / 2026-05-25 | **defect?** |
| RevenueCraft · CashWatch AR | 80→80 | 78.1→77.9 | -1.9→-2.1 | 15→14 | 2026-05-27 / 2026-05-27 | **defect?** |
| PeopleLedger · Workforce Vault | 84→84 | 59.8→60.1 | -24.2→-23.9 | 15→14 | 2026-05-21 / 2026-05-21 | **defect?** |
| Orbit Payables · Orbit Invoice | 64→64 | 61.3→61.8 | -2.7→-2.2 | 15→14 | 2026-05-15 / 2026-05-15 | **defect?** |
| ComplianceGrid · TrailKeeper | 60→60 | 60.5→60.6 | 0.5→0.6 | 15→14 | 2026-05-29 / 2026-05-29 | **defect?** |
| PAT Demo Vendor · MetricBoard FP&A | 60→84 | 59.9→59.9 | -0.1→-24.1 | 14→14 | 2026-05-08 / 2026-05-08 | **defect?** |
| Workpaper Forge · ControlPaper | 53→53 | 56.1→56.1 | 3.1→3.1 | 15→14 | 2026-05-18 / 2026-05-18 | **defect?** |
| ClientBridge Collab · Bridge Portal | 89→89 | 71.3→71.6 | -17.7→-17.4 | 15→14 | 2026-05-23 / 2026-05-23 | **defect?** |
| Workpaper Forge · Forge Workpapers | 85→85 | 82.5→82.7 | -2.5→-2.3 | 15→14 | 2026-05-18 / 2026-05-18 | **defect?** |
| SignalWise Reporting · Forecast Lens | 73→73 | 74.5→74.6 | 1.5→1.6 | 15→14 | 2026-05-17 / 2026-05-17 | **defect?** |
| Orbit Payables · CashRail Connect | 84→84 | 55.1→55.1 | -28.9→-28.9 | 15→14 | 2026-05-15 / 2026-05-15 | **defect?** |
