import { redirect } from "next/navigation";
import { getPilotDisabledSignInPath, isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { enforceAudience } from "@/lib/audienceGuard";

export const dynamic = "force-dynamic";

export default async function UserSurfaceLayout({ children }: { children: React.ReactNode }) {
  // B5-4: a firm/vendor account on /user is redirected to its own portal home
  // before the pilot-surfaces gate runs.
  await enforceAudience("user");
  if (!isIndividualSurfacesEnabled()) {
    redirect(getPilotDisabledSignInPath("individual"));
  }

  return children;
}
