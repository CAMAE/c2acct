import { IndividualHelpInlineContent } from "@/app/components/individual/IndividualPortalContent";

export const metadata = {
  title: "Individual Help | C2Acct",
  description: "Individual PAT help and route explainer.",
};

type SearchParams = {
  topic?: string;
};

export default async function UserHelpPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;

  return <IndividualHelpInlineContent topic={params?.topic} />;
}
