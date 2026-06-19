import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";

export const metadata = {
  title: "Consultant Sign In | Patalign",
  description: "Consultant entry route for PAT.",
};

export default function ConsultantSignInPage() {
  if (!isConsultantAccessEnabled()) {
    redirect(buildCanonicalSignInPath({ view: "vendor" }));
  }

  redirect(buildCanonicalSignInPath({ view: "consultant" }));
}
