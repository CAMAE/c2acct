import type { HeaderNavItem } from "@/app/components/header/AppHeader";
import HeaderControlsMenu from "@/app/components/shell/HeaderControlsMenu";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import type { HeaderNavLabelKey } from "@/lib/locale";

/**
 * A1 (box 2b, 2026-09-14, Cam 9/14 "all as recommended"): the signed-out
 * navigation menu on the V7 public shell — exactly the list AppShell builds
 * for a visitor (app/components/shell/AppShell.tsx navItems with no session:
 * Home, Meet PAT, Sign in, Vendor, Firm, [Individual], [Consultant], Trust,
 * Return to C2Acct). Rendered through HeaderControlsMenu with no bell, no
 * Membership and no Sign out, so the control names match production's
 * ("Open navigation menu", the links) without touching AppShell.
 */
const V7_ICON_BUTTON_CLASS_NAME =
  "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] bg-white text-[var(--shell-muted)] hover:text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]";

async function noop() {
  "use server";
}

export default async function SignedOutHeaderMenu() {
  const messages = await getRequestLocaleMessages();
  const navItems: Array<{ href: string; key: HeaderNavLabelKey }> = [
    { href: "/", key: "home" },
    { href: "/pat", key: "meet_pat" },
    { href: "/sign-in", key: "sign_in" },
    { href: "/vendor", key: "vendor" },
    { href: "/firm", key: "firm" },
    ...(isIndividualSurfacesEnabled() ? [{ href: "/user", key: "individual" as const }] : []),
  ];
  const translatedNavItems: HeaderNavItem[] = [
    ...navItems.map((item) => ({ href: item.href, label: messages.nav[item.key] })),
    ...(isConsultantAccessEnabled() ? [{ href: "/consultants", label: "Consultant" }] : []),
    { href: "/trust", label: "Trust" },
    { href: "https://www.c2acct.com", label: "Return to C2Acct" },
  ];
  return (
    <HeaderControlsMenu
      buttonClassName={V7_ICON_BUTTON_CLASS_NAME}
      membershipHref={null}
      navItems={translatedNavItems}
      showNotificationBell={false}
      signedInEmail={null}
      signOutAction={noop}
      uiText={{
        membership: messages.chrome.membership,
        navigation: messages.chrome.navigation,
        openNavigationMenu: messages.chrome.open_navigation_menu,
      }}
    />
  );
}
