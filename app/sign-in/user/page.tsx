import { redirect } from "next/navigation";
import RoleSignInPage from "@/app/components/pat/RoleSignInPage";
import { getPilotDisabledSignInPath, isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";

export const metadata = {
  title: "User Sign In | C2Acct",
  description: "User entry route for PAT.",
};

export default function UserSignInPage() {
  if (!isIndividualSurfacesEnabled()) {
    redirect(getPilotDisabledSignInPath("individual"));
  }

  return <RoleSignInPage role="user" />;
}
