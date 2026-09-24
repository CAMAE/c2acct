import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import { guideWord } from "@/lib/roleWords";

export function generateMetadata() {
  return {
    title: `${guideWord()} Sign In | Patalign`,
    description: `${guideWord()} entry route for PAT.`,
  };
}

export default function ConsultantSignInPage() {
  if (!isConsultantAccessEnabled()) {
    redirect(buildCanonicalSignInPath({ view: "vendor" }));
  }

  redirect(buildCanonicalSignInPath({ view: "consultant" }));
}
