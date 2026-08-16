import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Security Posture | Patalign",
  description: "Security posture and launch boundaries for PAT.",
};

export default function SecurityPage() {
  return <TrustSurfacePage surface={getTrustSurface("security")} />;
}
