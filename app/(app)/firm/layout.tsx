import type { ReactNode } from "react";
import { enforceAudience } from "@/lib/audienceGuard";

export const dynamic = "force-dynamic";

export default async function FirmLayout({ children }: { children: ReactNode }) {
  await enforceAudience("firm"); // B5-4: wrong-audience accounts redirect to their portal home
  return <>{children}</>;
}
