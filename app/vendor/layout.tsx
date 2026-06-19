import type { ReactNode } from "react";
import PatAssistantMount from "@/app/components/pat/PatAssistantMount";

export const dynamic = "force-dynamic";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PatAssistantMount />
    </>
  );
}
