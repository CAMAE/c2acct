import type { ReactNode } from "react";
import { requireEnterpriseAccess } from "@/lib/enterpriseAccess";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

export const dynamic = "force-dynamic";

export default async function EnterpriseLayout({
  children,
}: {
  children: ReactNode;
}) {
  // 3e (R51): flag off, signed out or no EnterpriseMembership → the portal does not exist.
  await requireEnterpriseAccess();

  // Facelift Part 2: flag-on scope for the portal token pass (globals.css
  // [data-v7-portal]); flag-off the spread is empty and the markup unchanged.
  const v7Portal = isNewFrontDoorEnabled() ? { "data-v7-portal": "enterprise" } : {};

  return (
    <div className="space-y-8" {...v7Portal}>
      {children}
    </div>
  );
}
