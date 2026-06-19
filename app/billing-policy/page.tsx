import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "PAT Billing Policy Draft | Patalign",
  description: "Draft billing policy for PAT provider-backed and scaffold billing modes.",
};

export default function BillingPolicyPage() {
  return <TrustSurfacePage surface={getTrustSurface("billingPolicy")} />;
}
