"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HeaderNotificationBell from "@/app/components/notifications/HeaderNotificationBell";
import type { HeaderNavItem } from "@/app/components/header/AppHeader";

/**
 * R3 (box 2, 2026-09-11): the signed-in header cluster — notification bell,
 * Membership, the navigation menu with production's menu contents, and Sign
 * out — as one client component the V7 public shell can mount. The markup,
 * aria labels and menu structure mirror AppHeader (app/components/header/
 * AppHeader.tsx) control for control so the crawl sees the same names:
 * button "Notifications", link "Membership", button "Open navigation menu",
 * the nav links, button "Sign out". AppHeader itself is untouched (LAW 13 —
 * wrap, never rewrite; its source is pinned by the 21a flag-off contract).
 */
export type HeaderControlsMenuProps = {
  buttonClassName: string;
  membershipHref: string | null;
  navItems: HeaderNavItem[];
  showNotificationBell: boolean;
  signedInEmail: string | null;
  signOutAction: () => Promise<void>;
  uiText: {
    membership: string;
    navigation: string;
    openNavigationMenu: string;
  };
};

function resolveMembershipHrefByPath(pathname: string | null, fallbackHref: string | null) {
  if (pathname === "/sign-in" || pathname?.startsWith("/admin") || pathname?.startsWith("/consultants")) return null;
  if (!pathname) return fallbackHref;
  if (pathname.startsWith("/vendor") || pathname.startsWith("/sign-in/vendor")) return "/vendor/membership";
  if (pathname.startsWith("/firm") || pathname.startsWith("/sign-in/firm")) return "/firm/membership";
  return fallbackHref;
}

export default function HeaderControlsMenu({
  buttonClassName,
  membershipHref,
  navItems,
  showNotificationBell,
  signedInEmail,
  signOutAction,
  uiText,
}: HeaderControlsMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Same path rule as AppHeader.resolveMembershipHref (production): the path decides the
  // membership target on the portal and sign-in sub-pages; the audience fallback elsewhere.
  const resolvedMembershipHref = resolveMembershipHrefByPath(pathname, membershipHref);
  const membershipActive = resolvedMembershipHref
    ? pathname === resolvedMembershipHref || pathname?.startsWith(`${resolvedMembershipHref}/`)
    : false;

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target || cardRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="flex shrink-0 items-center gap-2" data-testid="signed-in-header-controls">
      {showNotificationBell ? <HeaderNotificationBell buttonClassName={buttonClassName} /> : null}

      {resolvedMembershipHref ? (
        <Link
          href={resolvedMembershipHref}
          className={buttonClassName}
          aria-label={uiText.membership}
          title={uiText.membership}
          aria-current={membershipActive ? "page" : undefined}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="1.8">
            <rect x="4" y="6" width="16" height="12" rx="2.5" />
            <path d="M8 10.5h4" strokeLinecap="round" />
            <path d="M8 13.5h5" strokeLinecap="round" />
            <path d="m17 9.25.58 1.18 1.3.19-.94.92.22 1.31-1.16-.61-1.16.61.22-1.31-.94-.92 1.3-.19z" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : null}

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={buttonClassName}
          aria-expanded={open}
          aria-controls="v7-global-nav-card"
          aria-label={uiText.openNavigationMenu}
        >
          <span className="sr-only">{uiText.openNavigationMenu}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 stroke-current" fill="none" strokeWidth="1.8">
            <path d="M4 7.5h16" strokeLinecap="round" />
            <path d="M4 12h16" strokeLinecap="round" />
            <path d="M4 16.5h16" strokeLinecap="round" />
          </svg>
        </button>

        {open ? (
          <div
            ref={cardRef}
            id="v7-global-nav-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="v7-global-nav-title"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[18rem] max-w-[calc(100vw-1.5rem)] rounded-[1.55rem] border border-[var(--shell-border)] bg-white/98 p-3 text-left"
          >
            <div className="border-b border-[var(--shell-border)] px-3 pb-3">
              <div id="v7-global-nav-title" className="text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
                {uiText.navigation}
              </div>
            </div>

            <nav className="px-1 pt-3">
              <ul className="space-y-1.5">
                {navItems.map((item) => {
                  const isExternal = /^https?:\/\//i.test(item.href);
                  const active =
                    !isExternal &&
                    (item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname?.startsWith(`${item.href}/`));
                  const linkClassName = `flex items-center rounded-[1.15rem] border px-4 py-3 text-[0.95rem] font-medium leading-none ${
                    active
                      ? "border-[rgba(6,54,116,0.14)] bg-[rgba(6,54,116,0.05)] text-[var(--shell-ink)]"
                      : "border-transparent text-[var(--shell-ink)] hover:border-[var(--shell-border)] hover:bg-[rgba(6,54,116,0.025)]"
                  }`;
                  return (
                    <li key={item.href}>
                      {isExternal ? (
                        <a href={item.href} rel="noreferrer" onClick={() => setOpen(false)} className={linkClassName}>
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <Link href={item.href} onClick={() => setOpen(false)} className={linkClassName}>
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {signedInEmail ? (
              <form action={signOutAction} className="mt-2 border-t border-[var(--shell-border)] px-1 pt-3">
                <div className="px-4 pb-2 text-[0.72rem] leading-4 text-[var(--shell-muted)]">
                  Signed in as <span className="font-semibold text-[var(--shell-ink)]">{signedInEmail}</span>
                </div>
                <button
                  type="submit"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center rounded-[1.15rem] border border-transparent px-4 py-3 text-left text-[0.95rem] font-medium leading-none text-[var(--shell-ink)] hover:border-[var(--shell-border)] hover:bg-[rgba(6,54,116,0.025)]"
                >
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
