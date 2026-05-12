import "./globals.css";
import { cookies } from "next/headers";
import ClientTelemetryBootstrap from "@/app/components/telemetry/ClientTelemetryBootstrap";
import AppHeader, { type HeaderNavItem } from "@/app/components/header/AppHeader";
import { barlowFontClassName } from "@/app/fonts/barlow";
import { getSessionUser } from "@/lib/auth/session";
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
  const headerUiText = {
    closeNavigationMenu: messages.chrome.close_navigation_menu,
    homeAriaLabel: messages.chrome.home_aria,
    language: messages.chrome.language,
    navigation: messages.chrome.navigation,
    openLanguageMenu: messages.chrome.open_language_menu,
    openNavigationMenu: messages.chrome.open_navigation_menu,
  };

  return (
    <html lang={locale}>
      <body
        className={`${barlowFontClassName} pat-shell flex min-h-screen flex-col bg-[var(--shell-bg)] text-[var(--shell-ink)] antialiased`}
      >
        <ClientTelemetryBootstrap />
        <AppHeader currentLocale={locale} navItems={translatedNavItems} uiText={headerUiText} />

        <main className="mx-auto flex w-full max-w-6xl flex-1 px-6 py-12">{children}</main>

        <footer className="mt-auto border-t border-[var(--shell-border)] py-5">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-6 text-[11px] text-[var(--shell-muted)]">
            <div className="pat-sans inline-flex items-center gap-3">
              <span>{messages.chrome.copyright}</span>
              <span
                aria-hidden="true"
                className="h-3.5 w-px rounded-full bg-[var(--shell-border-strong)]"
              />
              <span>{messages.chrome.pat}</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
