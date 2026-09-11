import type { HeaderNavItem } from "@/app/components/header/AppHeader";
import PatTopBar from "@/app/components/pat/PatTopBar";
import HeaderControlsMenu from "@/app/components/shell/HeaderControlsMenu";
import { signOutToHome } from "@/app/components/shell/signOutAction";
import { getSessionUser } from "@/lib/auth/session";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import { getMembershipPathPrefix } from "@/lib/membershipContent";
import { isPatAssistantEnabled, isPingsEnabled } from "@/lib/patAssistant/flags";
import { hasPatConsent } from "@/lib/patAssistant/consent";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import type { HeaderNavLabelKey } from "@/lib/locale";

/**
 * R3 (box 2, 2026-09-11): the signed-in header controls as ONE server
 * component either shell can mount. Signed out it renders nothing, so the V7
 * public shell is unchanged for visitors (and still makes no DB call: the
 * session read is a JWT decode). Signed in it resolves exactly what AppShell
 * resolves — Ask Pat behind the assistant flag AND the user's consent, the
 * bell behind PAT_ENABLE_PINGS, Membership for the viewer's audience, the
 * navigation menu with production's menu contents (Home, Meet PAT, Sign in,
 * Vendor, Firm, [Individual], [C2Core], [Consultant], Trust, Return to
 * C2Acct), and Sign out — and renders them through the same leaf components
 * AppHeader uses (PatTopBar, HeaderNotificationBell) plus HeaderControlsMenu.
 * AppShell/AppHeader keep their own copy verbatim (LAW 13; pinned by the 21a
 * flag-off contract tests), so this file is the V7 mount, not a rewrite.
 */
const V7_ICON_BUTTON_CLASS_NAME =
  "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--shell-border)] bg-white text-[var(--shell-muted)] hover:text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]";

export default async function SignedInHeaderControls({
  buttonClassName = V7_ICON_BUTTON_CLASS_NAME,
}: {
  buttonClassName?: string;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }
  const messages = await getRequestLocaleMessages();
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const consultantAccessEnabled = isConsultantAccessEnabled();
  const experience = await resolvePortalExperience(sessionUser);
  const enabledHrefs = new Set(
    experience.surfaces
      .filter((surface) => surface.availability === "enabled" && surface.href)
      .map((surface) => surface.href!)
  );
  // Same list, same order, same gates as AppShell's navItems/translatedNavItems.
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
    ...navItems.map((item) => ({ href: item.href, label: messages.nav[item.key] })),
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
  const showPatTopBar = isPatAssistantEnabled() && (await hasPatConsent(sessionUser.id));
  const showNotificationBell = isPingsEnabled();

  return (
    <>
      {showPatTopBar ? (
        <div className="min-w-0 flex-1 sm:max-w-[26rem]">
          <PatTopBar />
        </div>
      ) : null}
      <HeaderControlsMenu
        buttonClassName={buttonClassName}
        membershipHref={membershipHref}
        navItems={translatedNavItems}
        showNotificationBell={showNotificationBell}
        signedInEmail={sessionUser.email ?? null}
        signOutAction={signOutToHome}
        uiText={{
          membership: messages.chrome.membership,
          navigation: messages.chrome.navigation,
          openNavigationMenu: messages.chrome.open_navigation_menu,
        }}
      />
    </>
  );
}
