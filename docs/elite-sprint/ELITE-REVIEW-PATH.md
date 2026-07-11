# Elite review path — dedicated Elite approval pass

Nothing Elite counts as approved until Cam has clicked it. This lists every
Elite-only surface with its URL + account so the Elite tier can be reviewed in
one pass. Preview server: `http://127.0.0.1:3005` (all flags on). Re-run
`node --import tsx scripts/dev/preview-pat-setup.ts` after any DB reset.

## Elite accounts
| Account | Password | Role | Company |
|---|---|---|---|
| `demo-firm-elite@pat.local` | `PatEliteDemo7x` | Elite FIRM | Kirkland Reyes LLP (adopted, full board) |
| `demo-vendor-elite@pat.local` | `PatVendorElite7x` | Elite VENDOR | Meridian Practice Cloud (named Sales Card) |

Pro counterparts for the teaser side-by-side: `demo-firm-pro@pat.local /
PatProDemo7x` (Pro board) · `review.vendor@pat.local` (Pro Sales Card).

## Elite-only surfaces to approve

1. **Alignment Sandbox — named board** · `/firm/alignment-board` · **demo-firm-elite**
   - Elite reveals real candidate product NAMES (Pro sees "Secret Product N").
   - Confirm: connected puzzle stack, shaped radar, green→red fit heat, click-swap
     recomputes banner + radar + breakdown, candidate detail shows product/vendor.

2. **Vendor Sales Card — named firms + firm detail** · `/vendor/sales-card` · **demo-vendor-elite**
   - Elite reveals real FIRM names + the click-in detail card (module gap this
     vendor closes, firm's current alignment, suggested action). Pro sees "Secret
     Firm N".
   - Confirm: stat lockup + explainer, fit-tier toggle (All/Strong/Good/Weak),
     green→red fit bars, detail card on click.

3. **Firm Insights — Elite membership surfaces** · `/firm/insights` · **demo-firm-elite**
   - The Elite-tier insight groups (beyond the Pro readout). Confirm Elite content
     renders and does not stack the Pro readout (Elite-stacking fix `830d45b9`).

4. **Vendor Alignment Insights — Elite surfaces** · `/vendor/alignment-insights` · **demo-vendor-elite**
   - Elite vendor alignment insight groups. Confirm the Elite detail renders.

## Notes
- Consultant read-only bypass sees named board/brief for scoped firms
  (`/firm/alignment-board?firm=<id>` as a consultant) — cross-tenant `?firm=` 404s.
- The 17 PRO gates stay PRO (core); ELITE gates = the surfaces above.
- Approval is per-surface: tick each only after clicking it in the preview.
