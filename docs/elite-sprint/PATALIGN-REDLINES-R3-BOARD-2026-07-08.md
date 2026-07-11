# Board Redlines — Round 3 (layout + piece shape) · July 8
### Cam's verdict on R2 build: radar ✓ (liked), ranking ✓, winners ✓ — but layout is broken and pieces still aren't "puzzly." Fix these two things; touch nothing else.

## R3.1 — Layout: contain and wrap (the critical fix)
The page currently renders the stack as ONE non-wrapping horizontal row (~30 pieces running several viewports off-screen), pushes the radar entirely out of view to the right, and scatters candidates in a sparse broken grid. Required:
- Everything inside the portal's standard max-width centered container (same width as the insights pages). NOTHING may require horizontal scrolling at 100% zoom on a 13" laptop.
- Header band: stat lockup (66% → projected) on the LEFT, the current-vs-projected radar on the RIGHT, side by side in the same card.
- "Your stack": a WRAPPING grid of uniform pieces (auto-fit, ~5-6 per row), not a strip.
- "Secret candidates": wrapping grid below, in rank order (#1 first, left-to-right), no orphan columns or giant gaps.
- Detail card: full-width beneath the candidates.
- "What changes" breakdown: show ONLY the swapped piece + top 5 movers by default, with "Show all N" expander — 30 identical bars is noise.

## R3.2 — Stack size (data, not layout)
The demo stack ballooned to ~30 pieces. A firm's reviewable stack on the board should read like a real tech stack: seed/select 6-8 pieces for the board view (the rest can live behind a "full stack" link). Keep ~12 ranked Secret candidates.

## R3.3 — Piece shape: puzzly, not jigsaw-hinted
Current shape = card with one side-notch. Wanted = the CLASSIC puzzle piece: rounded square with a tab (outie) on one side and a blank (innie) on another, alternating across the grid so neighbors read as interlocking. One clean SVG path, generous rounding, tab/blank scaled visibly (not subtle). The selected/lifted state should change FILL + elevation (lift shadow), not add a thin outline box.

## Unchanged (do not regress)
Radar behavior, Fit ranking, winner deltas, R2 formatter (+18.10 style), Pro/Elite split, colors from R2 (light stack / c2-blue secrets).

## Checkpoint
Screenshots again after this round — full page at 100% zoom on a laptop-width viewport, Pro + Elite.
