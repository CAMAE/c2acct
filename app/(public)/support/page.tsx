import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";
import TrustSurfaceV7 from "@/app/components/trust/TrustSurfaceV7";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";

/** The one support address the product already configures (PatTopBar's help panel). */
const SUPPORT_EMAIL = "support@patalign.com";


export const metadata = {
  title: "PAT Support | Patalign",
  description: "Support and contact guidance for PAT launch review.",
};

export default function SupportPage() {
  const surface = getTrustSurface("support");

  // B3 (flag-on): the contact block FIRST, then what to include, what to report
  // when something fails, and billing support — the surface's own sections,
  // verbatim. No local-review wording reaches this customer path.
  if (isNewFrontDoorEnabled()) {
    return (
      <TrustSurfaceV7
        surface={surface}
        numbered
        lead={
          <section
            className="rounded-[var(--radius-card)] border border-[var(--shell-ink)] bg-white px-5 py-5"
            aria-label="Contact PAT support"
            data-testid="support-contact"
          >
            <div className="pat-label">Contact</div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="pat-h2 mt-2 block text-[var(--shell-ink)] underline decoration-[var(--shell-border)] underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
            <p className="pat-body mt-3 text-[var(--shell-muted)]">{surface.summary}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="pat-button-primary mt-5 inline-flex">
              Email support
            </a>
          </section>
        }
      />
    );
  }

  return <TrustSurfacePage surface={surface} />;
}
