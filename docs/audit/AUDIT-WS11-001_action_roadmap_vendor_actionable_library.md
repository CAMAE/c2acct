# AUDIT-WS11-001 — Action Roadmap vendor-actionable library

**Status:** Open, P1 for WS11 (post-demo).
**Filed:** 2026-05-17 during WS10-A.

## Problem

Vendor brief Section 6 currently renders actions like "Get more individual PAT submissions" — PAT-meta tasks that ask the consultant to do PAT work, not vendor-aligned actions that help the vendor better align their product with their firms. Cam's framing: "this should be in the focus, in the frame of helping the vendor better align their product."

## Fix

Rebuild `lib/actionRoadmapLibrary.ts` (which doesn't exist yet — only `lib/perFirmQuestionLibrary.ts` did the WS5 work for Section 4). Author ~20-30 vendor-actionable templates keyed by score-delta band + capability area. Each template returns a 30/60/90/Q4 action that the vendor (not the consultant, not PAT) could take to better serve the firm.

Examples of good vendor-actionable templates:
- "Schedule pre-renewal call with {firm} to walk through {capability} delta evidence"
- "Roadmap {capability} integration depth for {firm}'s rollout plan by {date}"
- "Bring {firm}'s specific {capability} concerns into the next quarterly product review"

Examples of bad PAT-meta templates (current state):
- "Get more individual PAT submissions" (asks PAT to do PAT work)
- "Re-run the integrated PAT briefing" (asks PAT to do PAT work)

## Estimated effort

3-5 hours: author library, integrate, validate. Defer to post-demo.

## Acceptance

Section 6 unmuted in `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx` (re-enable the `ActionRoadmap` import + render). Add the Section 6 entry back to `BriefTOC.tsx`. Each rendered action has a vendor verb in the title (Schedule / Roadmap / Bring / Reach out / Document / etc.) and references a specific capability + firm context.

## Where the muting happens

- `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx` — import commented out at the top of the file; render commented out inside the section list.
- `app/consultants/ecosystems/[ecosystemId]/vendor-brief/_components/BriefTOC.tsx` — Section 6 entry removed from `TOC_ENTRIES`.
- The component itself (`ActionRoadmap.tsx`) is untouched and still exists; only its mount points are muted.
