/**
 * The V7 alignment radar — shape only, no numbers (the home's Fig. 01). Shared
 * by the front door and /pat "How it works" (depth box 2). Solid navy "you"
 * shape over the dashed peer overlay, five pillar labels, legend beneath.
 */
export default function V7RadarFigure() {
  return (
    <>
              <svg viewBox="0 0 400 330" className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label="Five-pillar alignment radar — shape only, no scores">
                <defs>
                  <radialGradient id="v7rg" cx="50%" cy="52%" r="60%">
                    <stop offset="0%" stopColor="var(--brand-c2-blue)" stopOpacity=".16" />
                    <stop offset="100%" stopColor="var(--brand-c2-blue)" stopOpacity=".05" />
                  </radialGradient>
                </defs>
                <g stroke="#d9e0ea" fill="none" strokeWidth="1">
                  <polygon points="200,58 322,146 275,282 125,282 78,146" />
                  <polygon points="200,98 283,158 251,249 149,249 117,158" opacity=".8" />
                  <polygon points="200,138 244,169 227,218 173,218 156,169" opacity=".6" />
                  <path d="M200,178 L200,58 M200,178 L322,146 M200,178 L275,282 M200,178 L125,282 M200,178 L78,146" />
                </g>
                {/* Peer overlay — dashed, under the solid navy "you" shape. */}
                <polygon points="200,96 286,152 249,236 153,244 116,152" fill="none" stroke="#8ba1bd" strokeWidth="2" strokeDasharray="6 5" strokeLinejoin="round" />
                <polygon points="200,82 298,154 247,246 151,262 121,154" fill="url(#v7rg)" stroke="var(--brand-c2-blue)" strokeWidth="2.5" strokeLinejoin="round" />
                <g fill="var(--brand-c2-blue)" stroke="#fff" strokeWidth="1.5">
                  <circle cx="200" cy="82" r="5" />
                  <circle cx="298" cy="154" r="5" />
                  <circle cx="247" cy="246" r="5" />
                  <circle cx="151" cy="262" r="5" />
                  <circle cx="121" cy="154" r="5" />
                </g>
                <g fontSize="14" fill="var(--shell-muted)" fontWeight="700" textAnchor="middle">
                  <text x="200" y="34">Strategy</text>
                  <text x="358" y="140">Operations</text>
                  <text x="297" y="314">Automation</text>
                  <text x="103" y="314">Integration</text>
                  <text x="42" y="140">Governance</text>
                </g>
              </svg>
              {/* Legend beneath the radar — You (solid navy) vs Peers (dashed). */}
              <div className="mt-6 flex items-center justify-center gap-[26px] text-[14.5px] text-[var(--shell-muted)]">
                <span className="flex items-center gap-2"><span className="inline-block h-[11px] w-[11px] rounded-full bg-[var(--brand-c2-blue)]" /> You</span>
                <span className="flex items-center gap-2"><span className="inline-block w-[26px] border-t-2 border-dashed border-[#8ba1bd]" /> Peers</span>
              </div>
    </>
  );
}
