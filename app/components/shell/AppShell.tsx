import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import AppHeader, { type HeaderNavItem } from "@/app/components/header/AppHeader";
import { getSessionUser } from "@/lib/auth/session";
import { getMembershipPathPrefix } from "@/lib/membershipContent";
import { getHeaderWordmarkVariant } from "@/lib/brand/wordmark";
import { getPublicReleaseFingerprint } from "@/lib/release/fingerprint";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import { isPatAssistantEnabled, isPingsEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { TRUST_FOOTER_LINKS } from "@/lib/trustContent";
import { APP_LOCALE_COOKIE, getLocaleMessages, resolveLocale, type HeaderNavLabelKey } from "@/lib/locale";
import { resolvePortalExperience } from "@/lib/portalVisibility";

/**
 * Block 21a — the standard app shell (AppHeader + main + product footer), factored
 * VERBATIM out of the root layout so the route groups can choose it. The (app) group
 * always renders it; the (public) group renders it when PAT_ENABLE_NEW_FRONT_DOOR is
 * off (the flag-off byte-identical path, contract-tested) and V7PublicShell when on.
 * Output is identical to the prior root-layout body-inner.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);
  const messages = getLocaleMessages(locale);
  const sessionUser = await getSessionUser();
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const consultantAccessEnabled = isConsultantAccessEnabled();
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
    ...(individualSurfacesEnabled ? [{ href: "/user", key: "individual" as const }] : []),
    ...(enabledHrefs.has("/admin") ? [{ href: "/admin", key: "c2core" as const }] : []),
  ];
  const translatedNavItems: HeaderNavItem[] = [
    ...navItems.map((item) => ({
      href: item.href,
      label: messages.nav[item.key],
    })),
    ...(consultantAccessEnabled ? [{ href: "/consultants", label: "Consultant" }] : []),
    { href: "/trust", label: "Trust" },
    { href: "https://www.c2acct.com", label: "Return to C2Acct" },
  ];
  const membershipHref =
    experience.audience === "vendor" ||
    experience.audience === "firm" ||
    (individualSurfacesEnabled && experience.audience === "individual")
      ? `${getMembershipPathPrefix(experience.audience)}/membership`
      : null;
  const showPatTopBar =
    isPatAssistantEnabled() && !!sessionUser && (await hasPatConsent(sessionUser.id));
  const showNotificationBell = isPingsEnabled() && !!sessionUser;
  const headerUiText = {
    homeAriaLabel: messages.chrome.home_aria,
    language: messages.chrome.language,
    membership: messages.chrome.membership,
    navigation: messages.chrome.navigation,
    openLanguageMenu: messages.chrome.open_language_menu,
    openNavigationMenu: messages.chrome.open_navigation_menu,
  };

  async function signOutFromFooter() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <AppHeader
        currentLocale={locale}
        membershipHref={membershipHref}
        individualSurfacesEnabled={individualSurfacesEnabled}
        navItems={translatedNavItems}
        wordmarkVariant={getHeaderWordmarkVariant()}
        showPatTopBar={showPatTopBar}
        showNotificationBell={showNotificationBell}
        signedInEmail={sessionUser?.email ?? null}
        signOutAction={signOutFromFooter}
        uiText={headerUiText}
      />

      <main className="pat-shell-main flex flex-1">{children}</main>

      <footer className="mt-auto border-t border-[var(--shell-border)] py-5">
        <div className="pat-shell-frame flex flex-col items-center gap-3 text-[11px] text-[var(--shell-muted)]">
          <nav aria-label="PAT trust and launch links">
            <ul className="pat-sans flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
              {TRUST_FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-semibold text-[var(--shell-muted)] hover:text-[var(--shell-ink)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {sessionUser?.email ? (
            <form
              action={signOutFromFooter}
              className="pat-sans inline-flex flex-wrap items-center justify-center gap-2"
            >
              <span>
                Signed in as{" "}
                <span className="font-semibold text-[var(--shell-ink)]">{sessionUser.email}</span>
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="submit"
                className="font-semibold text-[var(--shell-muted)] underline-offset-4 hover:text-[var(--shell-ink)] hover:underline"
              >
                Sign out
              </button>
            </form>
          ) : null}
          <div className="pat-sans inline-flex flex-wrap items-center justify-center gap-3">
            <span>{messages.chrome.copyright}</span>
            <span aria-hidden="true" className="h-3.5 w-px rounded-full bg-[var(--shell-border-strong)]" />
            <span>{messages.chrome.pat}</span>
            <span aria-hidden="true" className="h-3.5 w-px rounded-full bg-[var(--shell-border-strong)]" />
            <span data-release-fingerprint={releaseFingerprint.releaseId}>
              Release {releaseFingerprint.releaseId}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
