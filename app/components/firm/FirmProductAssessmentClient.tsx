"use client";

import ProductAssessmentRuntimeClient from "@/app/components/assessment/ProductAssessmentRuntimeClient";
import type { FirmProductCatalogItem } from "@/lib/firmPat";

type Props = {
  product: FirmProductCatalogItem;
  initialAnswers: Record<string, number>;
  initialCurrentPage: number;
  initialStaleDraft: boolean;
  initialDroppedResponseIds: string[];
};

export default function FirmProductAssessmentClient({
  product,
  initialAnswers,
  initialCurrentPage,
  initialStaleDraft,
  initialDroppedResponseIds,
}: Props) {
  return (
    <ProductAssessmentRuntimeClient
      perspective="firm"
      productId={product.id}
      productName={product.name}
      submitPath="/api/firm/product-assessment/submit"
      draftPath="/api/firm/product-assessment/draft"
      signInPath="/sign-in/firm"
      successHref={`/firm/product-assessments?submitted=1&productId=${product.id}`}
      initialUtilityKeys={product.utilityKeys}
      initialResponses={initialAnswers}
      initialOpenEndedResponses={{}}
      initialProfile={null}
      initialCurrentPage={initialCurrentPage}
      initialStaleDraft={initialStaleDraft}
      initialDroppedResponseIds={initialDroppedResponseIds}
    />
  );
}
