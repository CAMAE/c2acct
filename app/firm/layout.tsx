import type { ReactNode } from "react";
import NotificationCenterMount from "@/app/components/notifications/NotificationCenterMount";

export const dynamic = "force-dynamic";

export default function FirmLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <NotificationCenterMount />
    </>
  );
}
