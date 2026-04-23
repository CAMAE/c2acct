"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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

  if (option.state === "disabled") {
    return "Disabled";
  }

  return null;
}

export default function PatModeToggle({
  activeKey,
  ariaLabel,
  options,
  onChange,
  navigationMode = "push",
}: PatModeToggleProps) {
  const router = useRouter();

  return (
    <div aria-label={ariaLabel} className="pat-mode-toggle">
      {options.map((option) => {
        const active = option.key === activeKey;
        const state = option.state ?? "default";
        const disabled = state === "disabled";
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

        if (!onChange && option.href && !disabled && navigationMode === "push") {
          return (
            <Link
              key={option.key}
              href={option.href}
              aria-current={active ? "page" : undefined}
              className={className}
              data-active={active}
              data-state={state}
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
            data-state={state}
            aria-disabled={disabled}
            aria-pressed={active}
            disabled={disabled}
            onClick={
              disabled
                ? undefined
                : () => {
                    if (onChange) {
                      onChange(option.key);
                      return;
                    }

                    if (option.href && navigationMode === "replace") {
                      router.replace(option.href, { scroll: false });
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
