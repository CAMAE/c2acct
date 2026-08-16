import type { ReactNode } from "react";
import AppShell from "@/app/components/shell/AppShell";
import V7PublicShell from "@/app/components/frontdoor/V7PublicShell";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/**
 * Block 21a STEP 2b — the (public) route group (home, trust, methodology, sign-in,
 * privacy, terms, billing-policy). Behind PAT_ENABLE_NEW_FRONT_DOOR it renders the
 * V7 public shell (V7 nav + EN/FR/ES selector + product footer); flag-OFF it renders
 * the standard AppShell — byte-identical to today (contract-tested). Route groups
 * don't change URLs, so these route moves ship LIVE while the V7 shell stays dark.
 */
export default async function PublicGroupLayout({ children }: { children: ReactNode }) {
  if (isNewFrontDoorEnabled()) {
    return <V7PublicShell>{children}</V7PublicShell>;
  }
  return <AppShell>{children}</AppShell>;
}
