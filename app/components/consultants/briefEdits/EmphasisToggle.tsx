"use client";

import { useState, useTransition } from "react";
import { submitBriefEditChoice } from "@/app/(app)/consultants/_actions/briefEditChoice";
import type {
  BriefEditSectionKey,
  BriefKind,
} from "@/lib/briefEditChoice";

/**
 * Bounded edit control: emphasis toggle.
 *
 * Renders a small toggle button next to each emphasizable element. The
 * consultant flips the emphasis on/off; the rendered text never changes
 * (only the visual treatment via the `--brief-emphasis-active` class on
 * elements with matching data-emphasis-id).
 *
 * The choiceValue is the comma-joined set of currently-active target ids
 * for the section — single row per (section, EMPHASIS) by design. The
 * server-side validator (lib/briefEditChoice.ts) enforces target ids
 * against a per-section allowlist.
 *
 * AUDIT-WS5-A-001 (DEFERRED): this is a multi-select tag-chip pattern,
 * not the mutually-exclusive `.pat-mode-toggle` pill row. Per WS5 prompt
 * (Block A halt rule on structural differences), do not invent a new
 * .pat-mode-toggle variant to accommodate multi-select semantics. Awaits
 * Cam adjudication: (a) convert to canonical with multi-select shape,
 * (b) keep the chip pattern as a separate sanctioned family, or (c) ship
 * a new sanctioned class for editorial multi-select chips.
 */

export default function EmphasisToggle(props: {
  briefKind: BriefKind;
  briefId: string;
  ecosystemId: string;
  sectionKey: BriefEditSectionKey;
  targetElementIds: readonly string[];
  activeEmphasisIds: readonly string[];
}) {
  const [active, setActive] = useState<Set<string>>(new Set(props.activeEmphasisIds));
  const [status, setStatus] = useState<string>("");
  const [, startTransition] = useTransition();

  function toggleTarget(targetId: string) {
    const previous = new Set(active);
    const next = new Set(active);
    if (next.has(targetId)) next.delete(targetId);
    else next.add(targetId);
    setActive(next);
    setStatus("");

    const choiceValue = Array.from(next).join(",");
    startTransition(async () => {
      const result = await submitBriefEditChoice({
        briefKind: props.briefKind,
        briefId: props.briefId,
        ecosystemId: props.ecosystemId,
        sectionKey: props.sectionKey,
        choiceType: "EMPHASIS",
        choiceValue,
      });
      if (!result.ok) {
        setActive(previous);
        setStatus(
          result.reason === "not-found"
            ? "Unable to save — refresh the page."
            : "Emphasis rejected. Refresh the page."
        );
      }
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]"
      data-testid="emphasis-toggle"
      data-section-key={props.sectionKey}
    >
      <span>Emphasize</span>
      {props.targetElementIds.map((targetId) => {
        const isActive = active.has(targetId);
        return (
          <button
            key={targetId}
            type="button"
            onClick={() => toggleTarget(targetId)}
            data-testid="emphasis-toggle-button"
            data-target-id={targetId}
            data-active={isActive ? "true" : "false"}
            className={
              isActive
                ? "rounded-md bg-[var(--brand-c2-blue)] px-2 py-0.5 text-white"
                : "rounded-md border border-[var(--shell-border)] bg-[var(--shell-panel)] px-2 py-0.5 text-[var(--shell-ink)]"
            }
          >
            {targetId}
          </button>
        );
      })}
      {status ? (
        <span role="status" className="normal-case text-[var(--brand-c2-blue)]">
          {status}
        </span>
      ) : null}
    </div>
  );
}
