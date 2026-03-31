"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandLockup from "@/app/components/brand/BrandLockup";
import { localeOptions, type AppLocale } from "@/lib/locale";

export type HeaderNavItem = {
  href: string;
  label: string;
};

type AppHeaderProps = {
  currentLocale: AppLocale;
  navItems: HeaderNavItem[];
  uiText: {
    closeNavigationMenu: string;
    homeAriaLabel: string;
    language: string;
    navigation: string;
    openLanguageMenu: string;
    openNavigationMenu: string;
  };
};

export default function AppHeader({ currentLocale, navItems, uiText }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const languageCardRef = useRef<HTMLDivElement | null>(null);
  const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const iconButtonClassName =
    "inline-flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-[1.15rem] border border-[var(--shell-border)] bg-white text-[var(--shell-ink)] hover:border-[rgba(6,54,116,0.32)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]";

  async function setLocale(nextLocale: AppLocale) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    setLanguageOpen(false);
    router.refresh();
  }

  useEffect(() => {
    if (!open && !languageOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setLanguageOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (
        cardRef.current?.contains(target) ||
        triggerRef.current?.contains(target) ||
        languageCardRef.current?.contains(target) ||
        languageTriggerRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
      setLanguageOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [languageOpen, open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--shell-border)] bg-white/92 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-1.5 sm:px-6">
          <Link href="/" className="min-w-0 shrink-0" aria-label={uiText.homeAriaLabel}>
            <BrandLockup mode="header" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                ref={languageTriggerRef}
                type="button"
                onClick={() => setLanguageOpen((current) => !current)}
                className={iconButtonClassName}
                aria-expanded={languageOpen}
                aria-controls="language-nav-card"
                aria-label={uiText.openLanguageMenu}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5 stroke-current" fill="none" strokeWidth="1.8">
                  <path d="M4 7.75h16" strokeLinecap="round" />
                  <path d="M4 12h16" strokeLinecap="round" />
                  <path d="M4 16.25h10" strokeLinecap="round" />
                  <circle cx="17.5" cy="16.25" r="2.25" />
                </svg>
              </button>

              {languageOpen ? (
                <div
                  ref={languageCardRef}
                  id="language-nav-card"
                  className="absolute right-0 top-[3.8rem] z-[65] min-w-[11.5rem] rounded-[1.35rem] border border-[var(--shell-border)] bg-white/98 p-2.5"
                >
                  <div className="px-2.5 pb-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                    {uiText.language}
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
                            <span className="text-[0.9rem] leading-none text-[var(--shell-ink)]">
                              •
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((current) => !current)}
              className={iconButtonClassName}
              aria-expanded={open}
              aria-controls="global-nav-card"
              aria-label={uiText.openNavigationMenu}
            >
              <span className="sr-only">{uiText.openNavigationMenu}</span>
              <span className="flex flex-col gap-[4.5px]" aria-hidden="true">
                <span className="block h-[2px] w-[24px] rounded-full bg-current" />
                <span className="block h-[2px] w-[24px] rounded-full bg-current" />
                <span className="block h-[2px] w-[24px] rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="global-nav-title">
          <div
            ref={cardRef}
            id="global-nav-card"
            className="pointer-events-auto absolute right-5 top-[4.9rem] w-[min(18rem,calc(100vw-1.75rem))] rounded-[1.75rem] border border-[var(--shell-border)] bg-white/98 p-3 sm:right-6 sm:top-[5.1rem] sm:w-[19rem]"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--shell-border)] px-3 pb-3">
              <div id="global-nav-title" className="text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                {uiText.navigation}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto inline-flex h-10 w-10 items-center justify-center text-[var(--shell-ink)] hover:text-[var(--shell-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
                aria-label={uiText.closeNavigationMenu}
              >
                <span aria-hidden="true" className="text-[1.8rem] leading-none">
                  ×
                </span>
              </button>
            </div>

            <nav className="px-1 pt-3">
              <ul className="space-y-1.5">
                {navItems.map((item) => {
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center rounded-[1.15rem] border px-4 py-3 text-[0.95rem] font-medium leading-none ${
                          active
                            ? "border-[rgba(6,54,116,0.14)] bg-[rgba(6,54,116,0.05)] text-[var(--shell-ink)]"
                            : "border-transparent text-[var(--shell-ink)] hover:border-[var(--shell-border)] hover:bg-[rgba(6,54,116,0.025)]"
                        }`}
                      >
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
