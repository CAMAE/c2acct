import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export const metadata = {
  title: "Meet PAT | C2Acct",
  description: "PAT explainer and product framing.",
};

export default async function PatExplainerPage() {
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
