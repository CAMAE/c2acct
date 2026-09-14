import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface, getTrustSurfaceCards, TRUST_FOOTER_LINKS } from "@/lib/trustContent";
import TrustSurfaceCards from "@/app/components/trust/TrustSurfaceCards";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";


export const metadata = {
  title: "PAT Trust Center | Patalign",
  description: "Launch-readiness, policy, support, billing, and release transparency for PAT.",
};

export default function TrustPage() {
  const surface = getTrustSurface("trust");
  const cards = getTrustSurfaceCards();

  // B3 (flag-on): one column, H1 per the ruling, the trust set as a compact link
  // list instead of eight cards, "No unsupported claims" as a designed disclosure,
  // the remaining statements as an FAQ accordion. Copy is the surface's own.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        title="How PAT earns trust"
        chips={[{ label: `Last updated ${surface.lastUpdated}`, mono: true }]}
        links={TRUST_FOOTER_LINKS.filter((link) => link.href !== "/trust")}
        disclosureTitle="No unsupported claims"
      >
        {/* A10 (box 2b, Cam 9/14): production's trust cards composed back under the V7 surface. */}
        <div className="mt-10">
          <TrustSurfaceCards cards={cards} />
        </div>
      </TrustSurfaceV7>
    );
  }

  return (
    <TrustSurfacePage surface={surface}>
      <TrustSurfaceCards cards={cards} />
    </TrustSurfacePage>
  );
}
