"use client";

import { useEffect, useState } from "react";

type TOCEntry = {
  id: string;
  number: number;
  label: string;
  comingSoon?: string;
};

// WS1-D (manual-review item 23): Section 2 Market Context dropped entirely.
// Cascade renumber: old 3→2 (Methodology), 4→3 (Positioning), 5→4 (Strengths),
// 6→5 (Capability), 7→6 (Action Roadmap). Section IDs retain their semantic
// slug component so deep links / anchors keep meaningful URLs across the
// rename.
const TOC_ENTRIES: readonly TOCEntry[] = [
  { id: "section-1-executive-summary", number: 1, label: "Executive summary" },
  { id: "section-2-methodology", number: 2, label: "Evaluation methodology" },
  { id: "section-3-positioning-visual", number: 3, label: "Positioning visual" },
  {
    id: "section-4-strengths-cautions",
    number: 4,
    label: "Strengths / cautions",
  },
  { id: "section-5-capability-comparison", number: 5, label: "Capability comparison" },
  { id: "section-6-action-roadmap", number: 6, label: "Action roadmap" },
] as const;

export default function BriefTOC() {
  const [activeId, setActiveId] = useState<string>(TOC_ENTRIES[0].id);

  useEffect(() => {
    const trackedEntries = TOC_ENTRIES.filter((entry) => !entry.comingSoon);
    const elements = trackedEntries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0].target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Brief section navigation"
      data-testid="brief-toc"
      className="sticky top-6 hidden lg:block"
    >
      <div className="pat-label mb-3">Contents</div>
      <ol className="space-y-2">
        {TOC_ENTRIES.map((entry) => {
          const isActive = activeId === entry.id;
          const isComingSoon = Boolean(entry.comingSoon);
          const baseClasses =
            "flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm leading-snug transition-colors";
          const linkClasses = isActive
            ? "bg-[var(--shell-panel-soft)] text-[var(--shell-ink)] font-semibold"
            : "text-[var(--shell-muted)] hover:text-[var(--shell-ink)] hover:bg-[var(--shell-panel-soft)]";
          const disabledClasses =
            "text-[var(--shell-muted)] cursor-not-allowed opacity-60";
          return (
            <li key={entry.id} data-testid="brief-toc-item">
              {isComingSoon ? (
                <span
                  className={`${baseClasses} ${disabledClasses}`}
                  data-active="false"
                  data-coming-soon={entry.comingSoon}
                >
                  <span className="w-5 shrink-0 tabular-nums text-right">{entry.number}</span>
                  <span className="flex-1">
                    {entry.label}{" "}
                    <span className="text-[10px] uppercase tracking-[0.16em]">
                      ({entry.comingSoon})
                    </span>
                  </span>
                </span>
              ) : (
                <a
                  href={`#${entry.id}`}
                  className={`${baseClasses} ${linkClasses}`}
                  data-active={isActive ? "true" : "false"}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className="w-5 shrink-0 tabular-nums text-right">{entry.number}</span>
                  <span className="flex-1">{entry.label}</span>
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
