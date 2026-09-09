import { redirect } from "next/navigation";
import RoleSignInPage from "@/app/components/pat/RoleSignInPage";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

export const metadata = {
  title: "Firm Sign In | Patalign",
  description: "Firm entry route for PAT.",
};

export default function FirmSignInPage() {
  // Finish box 2 (item 2): flag-on this route lands on the V7 sign-in frame
  // (the hub with the firm view preselected — the same frame /sign-in,
  // /sign-in/consultant and /sign-in/invitee use). Flag-off: unchanged.
  if (isNewFrontDoorEnabled()) {
    redirect(buildCanonicalSignInPath({ view: "firm" }));
  }
  return <RoleSignInPage role="firm" />;
}
