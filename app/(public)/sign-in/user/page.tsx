import { redirect } from "next/navigation";
import RoleSignInPage from "@/app/components/pat/RoleSignInPage";
import { getPilotDisabledSignInPath, isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";

export const metadata = {
  title: "User Sign In | Patalign",
  description: "User entry page for PAT.",
};

export default function UserSignInPage() {
  if (!isIndividualSurfacesEnabled()) {
    redirect(getPilotDisabledSignInPath("individual"));
  }

  return <RoleSignInPage role="user" />;
}
