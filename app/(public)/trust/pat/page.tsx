import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "How Pat is governed | Patalign",
  description:
    "The system controls that keep Pat, Patalign's AI assistant, in bounds: human approval, audit logging, spend caps, a named stop-authority, AI disclosure, data minimization, pinned model versions, and an incident procedure.",
};

export default function PatGovernancePage() {
  const surface = getTrustSurface("patGovernance");

  // B3 (flag-on): right-rail TOC, numbered sections, last-updated chip in mono.
  // Compliance copy verbatim from the surface.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        chips={[{ label: surface.statusLabel }, { label: `Last updated ${surface.lastUpdated}`, mono: true }]}
        toc
        numbered
      />
    );
  }

  return <TrustSurfacePage surface={surface} />;
}
