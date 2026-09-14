import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import PatConsentPanelMount from "@/app/components/pat/PatConsentPanelMount";
import HowItWorks from "@/app/components/frontdoor/HowItWorks";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

const metadata = {
  title: "Meet PAT | Patalign",
  description: "PAT explainer and product framing.",
};

export function generateMetadata() {
  return isNewFrontDoorEnabled() ? { title: "How PAT works | Patalign", description: "How PAT works, in four chapters." } : metadata;
}

export default async function PatExplainerPage() {
  const messages = await getRequestLocaleMessages();
  // Depth box 2 (flag-on): /pat is "How it works" — four chapters ending in the fork.
  // Box 2b (R-A, production is the floor): the chapters keep production's doors under them —
  // the Pat consent panel (signed-in, assistant flag; carries the governance / privacy /
  // terms links) and the two actions, composed exactly as MeetPatContent mounts them.
  if (isNewFrontDoorEnabled()) {
    return (
      <>
        <HowItWorks />
        <div className="pat-container space-y-6 px-6 pb-16">
          <PatConsentPanelMount />
          <div className="flex flex-wrap gap-3">
            <Link className="pat-button-primary" href="/sign-in">
              {messages.common.signInToPat}
            </Link>
            <Link className="pat-button-secondary" href="/">
              {messages.common.backToHome}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <MeetPatContent
      actions={
        <>
          <Link className="pat-button-primary" href="/sign-in">
            {messages.common.signInToPat}
          </Link>
          <Link className="pat-button-secondary" href="/">
            {messages.common.backToHome}
          </Link>
        </>
      }
    />
  );
}
