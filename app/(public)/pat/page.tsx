import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
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
  // Depth box 2 (flag-on): /pat is "How it works" — four chapters ending in the fork.
  if (isNewFrontDoorEnabled()) {
    return <HowItWorks />;
  }
  const messages = await getRequestLocaleMessages();

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
