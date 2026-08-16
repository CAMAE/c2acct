import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Terms of Service | Patalign",
  description: "Terms of service for PAT.",
};

export default function TermsPage() {
  return <TrustSurfacePage surface={getTrustSurface("terms")} />;
}
