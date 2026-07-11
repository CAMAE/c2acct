import TrustSurfacePage from "@/app/components/trust/TrustSurfacePage";
import { getTrustSurface } from "@/lib/trustContent";

export const metadata = {
  title: "How Pat is governed | Patalign",
  description:
    "The system controls that keep Pat, Patalign's AI assistant, in bounds: human approval, audit logging, spend caps, a named stop-authority, AI disclosure, data minimization, pinned model versions, and an incident procedure.",
};

export default function PatGovernancePage() {
  return <TrustSurfacePage surface={getTrustSurface("patGovernance")} />;
}
