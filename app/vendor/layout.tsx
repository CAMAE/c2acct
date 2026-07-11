import type { ReactNode } from "react";
import { enforceAudience } from "@/lib/audienceGuard";

export const dynamic = "force-dynamic";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  await enforceAudience("vendor"); // B5-4: wrong-audience accounts redirect to their portal home
  return <>{children}</>;
}
