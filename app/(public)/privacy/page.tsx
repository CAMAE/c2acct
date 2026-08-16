import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Privacy Policy | Patalign",
  description: "Privacy policy for PAT.",
};

export default function PrivacyPage() {
  return <TrustSurfacePage surface={getTrustSurface("privacy")} />;
}
