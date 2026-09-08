import type { ReactNode } from "react";
import { enforceAudience } from "@/lib/audienceGuard";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

export const dynamic = "force-dynamic";

export default async function FirmLayout({ children }: { children: ReactNode }) {
  await enforceAudience("firm"); // B5-4: wrong-audience accounts redirect to their portal home
  // Facelift Part 2: flag-on, the firm portal is scoped for the token pass (see
  // globals.css [data-v7-portal]); display:contents so layout is unaffected.
  // Flag-off returns exactly what it returned before.
  if (isNewFrontDoorEnabled()) {
    return (
      <div data-v7-portal="firm" className="contents">
        {children}
      </div>
    );
  }
  return <>{children}</>;
}
