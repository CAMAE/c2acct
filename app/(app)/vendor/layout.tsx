import type { ReactNode } from "react";
import { enforceAudience } from "@/lib/audienceGuard";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  await enforceAudience("vendor"); // B5-4: wrong-audience accounts redirect to their portal home
  // Facelift Part 2: flag-on scope for the portal token pass (globals.css
  // [data-v7-portal]); flag-off returns exactly what it returned before.
  if (isNewFrontDoorEnabled()) {
    return (
      <div data-v7-portal="vendor" className="contents">
        {children}
      </div>
    );
  }
  return <>{children}</>;
}
