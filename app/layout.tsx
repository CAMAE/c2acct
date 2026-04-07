import "./globals.css";
import { cookies } from "next/headers";
import AppHeader, { type HeaderNavItem } from "@/app/components/header/AppHeader";
import { barlowFontClassName } from "@/app/fonts/barlow";
import { getSessionUser } from "@/lib/auth/session";
import { getMembershipPathPrefix } from "@/lib/membershipContent";
import { getPublicReleaseFingerprint } from "@/lib/release/fingerprint";
import {
  APP_LOCALE_COOKIE,
  getLocaleMessages,
  resolveLocale,
  type HeaderNavLabelKey,
} from "@/lib/locale";
import { resolvePortalExperience } from "@/lib/portalVisibility";

export const metadata = {
  title: "C2Acct | PAT",
  description: "C2Acct corporate surface for the PAT platform workspace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  const messages = getLocaleMessages(locale);
  const sessionUser = await getSessionUser();
  const releaseFingerprint = getPublicReleaseFingerprint();
  const experience = await resolvePortalExperience(sessionUser);
  const enabledHrefs = new Set(
    experience.surfaces
      .filter((surface) => surface.availability === "enabled" && surface.href)
      .map((surface) => surface.href!)
  );
  const navItems: Array<{ href: string; key: HeaderNavLabelKey }> = [
    { href: "/", key: "home" },
    { href: "/pat", key: "meet_pat" },
    { href: "/sign-in", key: "sign_in" },
    { href: "/vendor", key: "vendor" },
    { href: "/firm", key: "firm" },
    { href: "/user", key: "individual" },
    ...(enabledHrefs.has("/admin") ? [{ href: "/admin", key: "c2core" as const }] : []),
  ];
  const translatedNavItems: HeaderNavItem[] = navItems.map((item) => ({
    href: item.href,
    label: messages.nav[item.key],
  }));
  const membershipHref =
    experience.audience === "vendor" || experience.audience === "firm" || experience.audience === "individual"
      ? `${getMembershipPathPrefix(experience.audience)}/membership`
      : null;
  const headerUiText = {
    closeNavigationMenu: messages.chrome.close_navigation_menu,
    homeAriaLabel: messages.chrome.home_aria,
    language: messages.chrome.language,
    membership: messages.chrome.membership,
    navigation: messages.chrome.navigation,
    openLanguageMenu: messages.chrome.open_language_menu,
    openNavigationMenu: messages.chrome.open_navigation_menu,
  };

  return (
    <html lang={locale}>
      <body
        className={`${barlowFontClassName} pat-shell flex min-h-screen flex-col bg-[var(--shell-bg)] text-[var(--shell-ink)] antialiased`}
      >
        <AppHeader
          currentLocale={locale}
          membershipHref={membershipHref}
          navItems={translatedNavItems}
          uiText={headerUiText}
        />

        <main className="pat-shell-main flex flex-1">{children}</main>

        <footer className="mt-auto border-t border-[var(--shell-border)] py-5">
          <div className="pat-shell-frame flex items-center justify-center text-[11px] text-[var(--shell-muted)]">
            <div className="pat-sans inline-flex items-center gap-3">
              <span>{messages.chrome.copyright}</span>
              <span
                aria-hidden="true"
                className="h-3.5 w-px rounded-full bg-[var(--shell-border-strong)]"
              />
              <span>{messages.chrome.pat}</span>
              <span
                aria-hidden="true"
                className="h-3.5 w-px rounded-full bg-[var(--shell-border-strong)]"
              />
              <span data-release-fingerprint={releaseFingerprint.releaseId}>
                Release {releaseFingerprint.releaseId}
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
