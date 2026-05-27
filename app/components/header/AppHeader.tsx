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
  individualSurfacesEnabled: boolean;
  membershipHref: string | null;
  navItems: HeaderNavItem[];
  uiText: {
    homeAriaLabel: string;
    language: string;
    membership: string;
    navigation: string;
    openLanguageMenu: string;
    openNavigationMenu: string;
  };
};

function resolveMembershipHref(
  pathname: string | null,
  fallbackHref: string | null,
  individualSurfacesEnabled: boolean
) {
  if (
    pathname === "/sign-in" ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/consultants")
  ) {
    return null;
  }

  if (!pathname) {
    return fallbackHref;
  }

  if (pathname.startsWith("/vendor") || pathname.startsWith("/sign-in/vendor")) {
    return "/vendor/membership";
  }

  if (pathname.startsWith("/firm") || pathname.startsWith("/sign-in/firm")) {
    return "/firm/membership";
  }

  if (
    pathname.startsWith("/user") ||
    pathname.startsWith("/sign-in/user") ||
    pathname.startsWith("/sign-in/invitee")
  ) {
    return individualSurfacesEnabled ? "/user/membership" : null;
  }

  return fallbackHref;
}

export default function AppHeader({
  currentLocale,
  individualSurfacesEnabled,
  membershipHref,
  navItems,
  uiText,
}: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const languageCardRef = useRef<HTMLDivElement | null>(null);
  const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const iconButtonClassName =
    "inline-flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-[1.05rem] border border-[var(--shell-border)] bg-white text-[var(--shell-ink)] hover:border-[rgba(6,54,116,0.32)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]";
  const resolvedMembershipHref = resolveMembershipHref(pathname, membershipHref, individualSurfacesEnabled);
  const membershipActive =
    resolvedMembershipHref
      ? pathname === resolvedMembershipHref || pathname?.startsWith(`${resolvedMembershipHref}/`)
      : false;
  const membershipButtonClassName = membershipActive
    ? "inline-flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-[1.05rem] border border-[rgba(6,54,116,0.18)] bg-[rgba(6,54,116,0.05)] text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
    : iconButtonClassName;

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
        <div className="pat-shell-frame flex items-center justify-between gap-3.5 py-1 sm:py-1.5">
          <Link href="/" className="min-w-0 shrink-0" aria-label={uiText.homeAriaLabel}>
            <BrandLockup mode="header" />
          </Link>

          <div className="flex items-center gap-2">
            {resolvedMembershipHref ? (
              <Link
                href={resolvedMembershipHref}
                className={membershipButtonClassName}
                aria-label={uiText.membership}
                title={uiText.membership}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5 stroke-current" fill="none" strokeWidth="1.8">
                  <rect x="4" y="6" width="16" height="12" rx="2.5" />
                  <path d="M8 10.5h4" strokeLinecap="round" />
                  <path d="M8 13.5h5" strokeLinecap="round" />
                  <path d="m17 9.25.58 1.18 1.3.19-.94.92.22 1.31-1.16-.61-1.16.61.22-1.31-.94-.92 1.3-.19z" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : null}

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
                  className="absolute right-0 top-[3.55rem] z-[65] min-w-[11rem] rounded-[1.25rem] border border-[var(--shell-border)] bg-white/98 p-2.5"
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

            <div className="relative">
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
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5.5 w-5.5 stroke-current" fill="none" strokeWidth="1.8">
                  <path d="M4 7.5h16" strokeLinecap="round" />
                  <path d="M4 12h16" strokeLinecap="round" />
                  <path d="M4 16.5h16" strokeLinecap="round" />
                </svg>
              </button>

              {open ? (
                <div
                  ref={cardRef}
                  id="global-nav-card"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="global-nav-title"
                  className="absolute right-0 top-[3.55rem] z-[60] w-[18rem] max-w-[calc(100vw-1.5rem)] rounded-[1.55rem] border border-[var(--shell-border)] bg-white/98 p-3"
                >
                  <div className="border-b border-[var(--shell-border)] px-3 pb-3">
                    <div id="global-nav-title" className="text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                      {uiText.navigation}
                    </div>
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
              ) : null}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
