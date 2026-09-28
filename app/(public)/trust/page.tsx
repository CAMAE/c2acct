import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface, getTrustSurfaceCards } from "@/lib/trustContent";
import TrustSurfaceCards from "@/app/components/trust/TrustSurfaceCards";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "Trust | Patalign",
  description: "Launch-readiness, policy, support, billing, and release transparency for PAT.",
};

export default function TrustPage() {
  const surface = getTrustSurface("trust");
  const cards = getTrustSurfaceCards();

  // B3 (flag-on): H1 per the ruling. Box 3f item D (T2 to T5, T7): eyebrow "Trust",
  // one quiet "Updated April 2026" line, the link strip gone (it duplicated the
  // cards), the cards at the container width under the head (A10), then the
  // reading column with "Current stage" and "No unsupported claims" rendered the
  // same way, text unchanged. Copy is the surface's own.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7 surface={surface} eyebrow="Trust" title="How PAT earns trust" wide={<TrustSurfaceCards cards={cards} />} />
    );
  }

  return (
    <TrustSurfacePage surface={surface}>
      <TrustSurfaceCards cards={cards} />
    </TrustSurfacePage>
  );
}
