import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { getCanonicalPatHref, type PatNavigationAudience } from "@/lib/patNavigation";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const sessionUser = await getSessionUser();
  const experience = await resolvePortalExperience(sessionUser);
  const audience: PatNavigationAudience =
    experience.audience === "firm" || experience.audience === "vendor"
      ? experience.audience
      : "individual";

  redirect(getCanonicalPatHref(audience, "workspace"));
}
