import { IndividualHelpInlineContent } from "@/app/components/individual/IndividualPortalContent";

export const metadata = {
  title: "Individual Help | Patalign",
  description: "Individual PAT help and page explainer.",
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
