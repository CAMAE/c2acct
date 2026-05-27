import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PortalShell from "@/app/components/PortalShell";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(buildCanonicalSignInPath({ callbackUrl: "/platform", view: "admin" }));
  }

  const experience = await resolvePortalExperience(sessionUser);

  return <PortalShell experience={experience}>{children}</PortalShell>;
}
