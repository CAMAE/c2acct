# Post-deadline fast-follow backlog

Tickets deferred past the launch deadline, captured so they aren't lost.

## FF-1 — Alignment Sandbox: drag-and-drop swap input
**Filed:** 2026-07-08 (Cam, R3-Board approval)
**Priority:** post-deadline fast-follow (v1 ships with click-swap)
**What:** Add drag-and-drop as an alternative input to the click-to-swap flow on
the Alignment Sandbox (`app/components/firm/AlignmentBoardClient.tsx`). Drag a
candidate puzzle piece onto a stack slot to stage the swap; keep click-swap as
the accessible fallback. The projected banner, radar, and breakdown already
recompute on swap state, so this is purely an input affordance.
**Why deferred:** click-swap was accepted as v1; DnD is more build + a11y/touch
testing and isn't worth blocking the deadline.
**Notes:** reuse the existing `swapOutId`/`swapInId` state; HTML5 DnD or a small
pointer-based handler. Ensure keyboard + click paths remain.
