"use client";

import Link from "next/link";

export type PatModeToggleState = "default" | "locked" | "disabled";

export type PatModeToggleOption = {
  key: string;
  label: string;
  href?: string;
  state?: PatModeToggleState;
  statusLabel?: string;
};

type PatModeToggleProps = {
  activeKey: string;
  ariaLabel?: string;
  options: readonly PatModeToggleOption[];
  onChange?: (key: string) => void;
  navigationMode?: "push" | "replace";
};

function getVisibleStatusLabel(option: PatModeToggleOption) {
  if (option.statusLabel) {
    return option.statusLabel;
  }

  if (option.state === "locked") {
    return "Locked";
  }

  // B8-5: a disabled filter chip conveys its state through disabled styling
  // (data-state="disabled") only — never the dev-speak label "Disabled".
  return null;
}

export default function PatModeToggle({
  activeKey,
  ariaLabel,
  options,
  onChange,
  // WS11-D Block K: default flipped from "push" to "replace" site-wide.
  // Every in-page toggle (Workspace/Pat/Admin/Help, Available/Completed,
  // Existing/Add New, brief panel toggles, etc.) should not pollute the
  // browser-history stack. Pressing Back should return the user to the
  // page they came from, not walk through prior toggle states.
  navigationMode = "replace",
}: PatModeToggleProps) {
  return (
    <div aria-label={ariaLabel} className="pat-mode-toggle">
      {options.map((option) => {
        const active = option.key === activeKey;
        const state = option.state ?? "default";
        const statusLabel = getVisibleStatusLabel(option);
        const className = "pat-mode-toggle__option";

        const content = (
          <>
            <span>{option.label}</span>
            {statusLabel ? (
              <span className="pat-mode-toggle__status" data-state={state}>
                {statusLabel}
              </span>
            ) : null}
          </>
        );

        if (!onChange && option.href) {
          return (
            <Link
              key={option.key}
              href={option.href}
              role="button"
              replace={navigationMode === "replace"}
              scroll={false}
              className={className}
              data-active={active}
              data-key={option.key}
              data-state={state}
              aria-current={active ? "page" : undefined}
              aria-pressed={active}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={option.key}
            type="button"
            className={className}
            data-active={active}
            data-key={option.key}
            data-state={state}
            aria-current={active ? "page" : undefined}
            aria-pressed={active}
            onClick={
              active
                ? undefined
                : () => {
                    if (onChange) {
                      onChange(option.key);
                      return;
                    }
                  }
            }
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
