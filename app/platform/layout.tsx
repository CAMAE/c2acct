import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PortalShell from "@/app/components/PortalShell";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePortalExperience } from "@/lib/portalVisibility";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fplatform");
  }

  const experience = await resolvePortalExperience(sessionUser);

  return <PortalShell experience={experience}>{children}</PortalShell>;
}
