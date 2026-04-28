import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Terms Draft | C2Acct",
  description: "Draft terms of service for PAT launch review.",
};

export default function TermsPage() {
  return <TrustSurfacePage surface={getTrustSurface("terms")} />;
}
