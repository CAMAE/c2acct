import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import HowItWorks from "@/app/components/frontdoor/HowItWorks";
import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export const metadata = {
  title: "How PAT works | Patalign",
  description: "PAT explainer and product framing.",
};

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
