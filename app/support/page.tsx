import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Support | C2Acct",
  description: "Support and contact guidance for PAT launch review.",
};

export default function SupportPage() {
  return <TrustSurfacePage surface={getTrustSurface("support")} />;
}
