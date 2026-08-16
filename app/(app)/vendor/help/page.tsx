import { VendorHelpInlineContent } from "@/app/components/vendor/VendorPortalContent";

type SearchParams = {
  topic?: string;
  productId?: string;
  productName?: string;
};

export default async function VendorHelpPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <VendorHelpInlineContent
      topic={params?.topic}
      productId={params?.productId}
      productName={params?.productName}
    />
  );
}
