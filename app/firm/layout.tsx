import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default function FirmLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
