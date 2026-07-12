# Cam's Review Redlines — Round 1 (July 8) · paste-target for Claude Code
### Rule of the batch: every fix lands component-level (shared-component register discipline). Cam's explicit note: anything fixed in one portal must be verified in all portals.

## 🔴 Bugs
R1. **Consent toggle doesn't live-update the bar** (vendor + firm): unchecking Meet Pat leaves the Ask Pat bar mounted until who-knows-when; re-checking doesn't restore it either. Fix the consent → mount invalidation (router.refresh()/revalidate on the consent action) so the bar disappears/reappears immediately. e2e: toggle off → bar gone same page-load; toggle on → back.
R2. **Float display leak, shared formatter needed**: "-15.100000000000001" (Alignment Board projected delta) and "+7.799999999999997" (BattleCard deltas). Create ONE shared delta/score formatter (round to hundredths, e.g. +7.80 / −15.10) and sweep every surface that renders computed deltas — board, BattleCard, briefs, insights. Contract test: no rendered number longer than 2 decimals.
R3. **"Return to C2Acct" menu item broken in consultant portal** — navigates to the consultant ecosystems page instead of https://www.c2acct.com. Fix in the shared nav (and check it in all four portals).
R4. **Alignment Board has no entry point** from the firm portal (direct URL only). Add a workspace card. **Cam's naming: call it "Sandbox"** (or "Alignment Sandbox") — label the card that way.
R5. **BattleCard has no entry point** from the vendor portal. Add the workspace card/nav entry.

## 🟡 Preview wiring (so Cam can actually review Elite + expansion)
R6. Upgrade the review-walkthrough firm (review.firm's subject) to ELITE in preview-setup — Cam must be able to flip between Pro teaser and Elite reality without account gymnastics — OR attach demo-firm-elite to a populated expanded ecosystem. Same for the vendor side: an Elite vendor able to see named BattleCard detail + click-into-firm cards.
R7. Consultant can only see its one assigned ecosystem (correct tenancy). For review: give review.admin a path to view the 8 expanded ecosystems (admin org catalog), or provision review.consultant-2 assigned to an expanded ecosystem. Tell Cam which route you took.
R8. **223 hot divergences** on the expanded demo ecosystem card — sanity-check the expansion generator's divergence spread; if the number is real, fine, but confirm the unit (product-firm pairs) renders with the right noun per the units sweep.
R9. Draft-persistence verification is invisible to a human ("nothing changes" after reload = success, but nobody can tell). Add a subtle **"Draft saved · HH:MM" indicator** on the assessment page (and a saved-state check on resume) so persistence is visible. That doubles as real-user reassurance.
R10. Module-order rotation is unverifiable by eye. Add a dev-only debug line (flag-gated) or document the two-account comparison in the preview checklist.

## 🔵 Design round — Alignment Board (Cam's vision, priority)
R11. Rebuild the board visual as **actual puzzle pieces**: colorful interlocking pieces (brand palette, like the charts), current stack pieces connected together; click a stack piece to highlight → click a candidate piece to **swap with a visible animation** (pieces exchange places); top score banner recomputes live. Drag-and-drop if cheap, click-swap is acceptable v1.
R12. Projection detail: don't just show a single delta — show the **five-module/feature-set breakdown** of the projected change (which modules improve/degrade), same visual language as the insight radar/bars.
R13. Demo firm stack is only 2 products — unrealistic. Seed the review firm's stack to 4-6 products so the board feels like a real tech stack.
R14. Secret pieces keep zero detail (correct) — but style them as visually distinct "mystery" pieces (silhouette/dashed) so the tease reads at a glance.

## 🔵 Design round — BattleCard
R15. Header card formatting is off (67% + "15 firms…" collision). Redesign to the **consultant-brief visual standard** (Cam: "like the consulting page — colors, graphs, really well done"): proper stat lockup, colored fit bars or mini-viz per firm row, delta chips with semantic color, and a one-line explainer of what alignment delta means for a vendor.
R16. Elite version: firm rows click into a detail card (named firm, module-level gaps this vendor covers, suggested action) — verify it exists and wire it for the Elite review vendor (R6).

## 🟠 Small
R17. Remove the navy "P" circle avatar from the Ask Pat bar until the mascot is chosen — placeholder text only.
R18. Block G (nav cleanup incl. **Sign out in the dropdown menu** — Cam re-confirmed) and Block H (help corpus — Ask Pat currently answers "no help library," Cam hit it) come off the back burner: run them in this same round.

## Process notes
- Cam approved: QBANK Governance 90, QBANK Integration 90, methodology, module spec (founder approval; CPA-founder accuracy signature still required before reviewStatus flips to approved/servable).
- Everything above rides tonight's deploy window with the rest.
