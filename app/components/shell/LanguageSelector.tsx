"use client";

import { useEffect, useRef, useState } from "react";
import { localeOptions, type AppLocale } from "@/lib/locale";

/**
 * EN / FR / ES language selector — extracted from AppHeader so the V7 public shell
 * (Block 21a) reuses the exact same control + behavior: POST /api/locale then reload.
 * Self-contained (own open-state + click-outside) so it drops into any nav. AppHeader
 * keeps its own inline copy for now (its shell must stay byte-identical for the 21a
 * Step-2 flag-off contract test); a later cleanup can point AppHeader here too.
 */
export default function LanguageSelector({
  currentLocale,
  menuLabel = "Language",
  triggerLabel = "Open language menu",
  buttonClassName,
}: {
  currentLocale: AppLocale;
  menuLabel?: string;
  triggerLabel?: string;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  async function setLocale(nextLocale: AppLocale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    setOpen(false);
    if (typeof window !== "undefined") window.location.reload();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (cardRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          buttonClassName ??
          "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] text-[var(--shell-muted)] hover:text-[var(--shell-ink)]"
        }
        aria-expanded={open}
        aria-controls="v7-language-card"
        aria-label={triggerLabel}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="1.8">
          <path d="M4 7.75h16" strokeLinecap="round" />
          <path d="M4 12h16" strokeLinecap="round" />
          <path d="M4 16.25h10" strokeLinecap="round" />
          <circle cx="17.5" cy="16.25" r="2.25" />
        </svg>
      </button>

      {open ? (
        <div
          ref={cardRef}
          id="v7-language-card"
          className="absolute right-0 top-[3.55rem] z-[65] min-w-[11rem] rounded-[1.25rem] border border-[var(--shell-border)] bg-white/98 p-2.5"
        >
          <div className="px-2.5 pb-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
            {menuLabel}
          </div>
          <ul className="space-y-1">
            {localeOptions.map((language) => (
              <li key={language.code}>
                <button
                  type="button"
                  onClick={() => setLocale(language.code)}
                  aria-pressed={currentLocale === language.code}
                  className={`flex w-full items-center justify-between rounded-[1rem] border px-3 py-2.5 text-left text-[0.92rem] font-medium ${
                    currentLocale === language.code
                      ? "border-[rgba(6,54,116,0.18)] bg-[rgba(6,54,116,0.05)] text-[var(--shell-ink)]"
                      : "border-transparent text-[var(--shell-ink)] hover:border-[rgba(6,54,116,0.18)] hover:bg-[rgba(6,54,116,0.025)]"
                  }`}
                >
                  <span>{language.label}</span>
                  {currentLocale === language.code ? (
                    <span className="text-[0.9rem] leading-none text-[var(--shell-ink)]">•</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
