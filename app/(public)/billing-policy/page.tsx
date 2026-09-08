import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "PAT Billing Policy | Patalign",
  description: "Billing policy for PAT — provider-backed and scaffold billing modes.",
};

export default function BillingPolicyPage() {
  const surface = getTrustSurface("billingPolicy");

  // B3 (flag-on): right-rail TOC and a "Last updated" chip only; the legal text
  // is the surface's sections, verbatim.
  if (isNewFrontDoorEnabled()) {
    return <TrustSurfaceV7 surface={surface} chips={[{ label: `Last updated ${surface.lastUpdated}`, mono: true }]} toc />;
  }

  return <TrustSurfacePage surface={surface} />;
}
