"use client";

import {
  applyFollowUpPick,
  type FollowUpMcAnswer,
  type FollowUpQuestion,
} from "@/lib/assessment/firmFollowUpOptions";
import type { FollowUpMcRuntime } from "@/lib/assessment/followUpMcRuntime";

/**
 * The follow-up option rows (MC redesign box, lifted here by the vendor-followup-mc
 * box so the firm module page and the vendor product assessment render one
 * component). Label first (bold), consequence clause muted beneath; radio for
 * SINGLE, checkbox for MULTI; "Other" reveals an inline short-answer box. Every
 * click goes through applyFollowUpPick, so the exclusive not-an-issue option and
 * the Other rules live in the registry module, not here. The markup is the firm
 * page's, unchanged.
 */
export type FollowUpMcOptionRowsProps = {
  questionId: string;
  mc: FollowUpMcRuntime;
  value: FollowUpMcAnswer | null | undefined;
  onChange: (answer: FollowUpMcAnswer) => void;
  otherMaxLength: number;
  /** Placeholder and accessible label of the Other box (the firm page's defaults). */
  otherPlaceholder?: string;
  otherAriaLabel?: string;
};

export default function FollowUpMcOptionRows({
  questionId,
  mc,
  value,
  onChange,
  otherMaxLength,
  otherPlaceholder = "Short answer",
  otherAriaLabel = "Other: short answer",
}: FollowUpMcOptionRowsProps) {
  const registryQuestion: FollowUpQuestion = { ...mc, moduleKey: "", moduleSectionKey: "", pillar: "", index: 0, hint: null };
  const current: FollowUpMcAnswer = value ?? { optionKeys: [], otherText: null };
  const single = mc.selectionMode === "SINGLE";
  const otherKey = mc.options.find((option) => option.kind === "other")?.key ?? null;
  const otherSelected = otherKey ? current.optionKeys.includes(otherKey) : false;
  const pick = (optionKey: string) => onChange(applyFollowUpPick(registryQuestion, current, optionKey));

  return (
    <div
      className="grid gap-2"
      role={single ? "radiogroup" : "group"}
      aria-label={mc.stem}
      data-testid="followup-mc"
      data-selection-mode={mc.selectionMode}
    >
      {mc.options.map((option) => {
        const checked = current.optionKeys.includes(option.key);
        return (
          <label key={option.key} data-active={checked} className="pat-question-choice pat-sans cursor-pointer">
            <input
              type={single ? "radio" : "checkbox"}
              name={`followup-${questionId}`}
              value={option.key}
              checked={checked}
              className="mt-1 shrink-0"
              onChange={() => pick(option.key)}
              // A checked radio fires no change event on re-click; route that click
              // through the same pick so SINGLE can be cleared too.
              onClick={single && checked ? () => pick(option.key) : undefined}
            />
            <span className="grid min-w-0 gap-1">
              <span className="font-semibold text-[var(--shell-ink)]">{option.label}</span>
              {option.consequence ? (
                <span className="text-sm leading-6 text-[var(--shell-muted)]">{option.consequence}</span>
              ) : null}
            </span>
          </label>
        );
      })}
      {otherSelected ? (
        <input
          type="text"
          value={current.otherText ?? ""}
          maxLength={otherMaxLength}
          placeholder={otherPlaceholder}
          aria-label={otherAriaLabel}
          className="pat-input"
          data-testid="followup-mc-other"
          onChange={(event) => onChange({ optionKeys: current.optionKeys, otherText: event.target.value })}
        />
      ) : null}
    </div>
  );
}
