import type { ReactNode } from "react";
import AppShell from "@/app/components/shell/AppShell";

/**
 * Block 21a STEP 2b — the (app) route group. Every in-product + non-public route
 * lives here and ALWAYS renders the standard app shell (AppHeader + main + product
 * footer). Route groups don't change URLs; this is purely a layout boundary. The
 * (public) sibling group swaps in V7PublicShell behind PAT_ENABLE_NEW_FRONT_DOOR —
 * this group never does.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
