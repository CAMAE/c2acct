import { FirmHelpInlineContent } from "@/app/components/firm/FirmPortalContent";

export const metadata = {
  title: "Firm Help | C2Acct",
  description: "Firm PAT help and explainer surface.",
};

type SearchParams = {
  topic?: string;
  productId?: string;
  productName?: string;
};

export default async function FirmHelpPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <FirmHelpInlineContent
      topic={params?.topic}
      productId={params?.productId}
      productName={params?.productName}
    />
  );
}
