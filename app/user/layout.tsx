import { redirect } from "next/navigation";
import { getPilotDisabledSignInPath, isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";

export default function UserSurfaceLayout({ children }: { children: React.ReactNode }) {
  if (!isIndividualSurfacesEnabled()) {
    redirect(getPilotDisabledSignInPath("individual"));
  }

  return children;
}
