import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Privacy Policy Draft | C2Acct",
  description: "Draft privacy policy for PAT launch review.",
};

export default function PrivacyPage() {
  return <TrustSurfacePage surface={getTrustSurface("privacy")} />;
}
