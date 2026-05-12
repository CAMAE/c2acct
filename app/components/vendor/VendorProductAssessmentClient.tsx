"use client";

import ProductAssessmentRuntimeClient from "@/app/components/assessment/ProductAssessmentRuntimeClient";
import type { VendorProductProfileInput } from "@/lib/vendorProductAssessmentPlan";
import type { UtilityDefinition } from "@/lib/vendorPat";

type Props = {
  productId: string;
  productName: string;
  utilityCatalog: UtilityDefinition[];
  initialUtilityKeys: string[];
  initialAnswers: Record<string, number>;
  initialOpenEndedAnswers: Record<string, string>;
  initialProfile: VendorProductProfileInput;
  initialCurrentPage: number;
  initialStaleDraft: boolean;
  initialDroppedResponseIds: string[];
};

export default function VendorProductAssessmentClient(props: Props) {
  return (
    <ProductAssessmentRuntimeClient
      perspective="vendor"
      productId={props.productId}
      productName={props.productName}
      submitPath="/api/vendor/product-assessment/submit"
      draftPath="/api/vendor/product-assessment/draft"
      signInPath="/sign-in/vendor"
      successHref={`/vendor/product-insight/${props.productId}?submitted=1`}
      utilityCatalog={props.utilityCatalog}
      initialUtilityKeys={props.initialUtilityKeys}
      initialResponses={props.initialAnswers}
      initialOpenEndedResponses={props.initialOpenEndedAnswers}
      initialProfile={props.initialProfile}
      initialCurrentPage={props.initialCurrentPage}
      initialStaleDraft={props.initialStaleDraft}
      initialDroppedResponseIds={props.initialDroppedResponseIds}
    />
  );
}
