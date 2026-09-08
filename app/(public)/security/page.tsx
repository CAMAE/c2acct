import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "PAT Security Posture | Patalign",
  description: "Security posture and launch boundaries for PAT.",
};

export default function SecurityPage() {
  const surface = getTrustSurface("security");

  // B3 (flag-on): H2 sections kept, subprocessors in mono. No status page is
  // configured in this repo, so no status link is rendered.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        chips={[{ label: surface.statusLabel }, { label: `Last updated ${surface.lastUpdated}`, mono: true }]}
        monoBulletTitles={["Subprocessors"]}
      />
    );
  }

  return <TrustSurfacePage surface={surface} />;
}
