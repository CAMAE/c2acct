import type { VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

export type VendorProductInsightActivation = {
  title: string;
  body: string;
  missingEvidence: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
};

export function getVendorProductInsightActivation(snapshot: VendorProductInsightSnapshot): VendorProductInsightActivation {
  const assessmentHref = `/vendor/product-assessment/${snapshot.product.id}`;
  const insightHref = `/vendor/product-insight/${snapshot.product.id}`;

  if (snapshot.product.utilityKeys.length === 0) {
    return {
      title: "Declare utilities first",
      body: "PAT cannot generate a scoped product readout until this product declares the utilities it materially supports today.",
      missingEvidence: "No utility declaration is live, so the assessment plan and product insight scope are both missing.",
      primaryCta: {
        label: "Declare utilities",
        href: assessmentHref,
      },
      secondaryCta: {
        label: "Open assessment setup",
        href: assessmentHref,
      },
    };
  }

  if (snapshot.vendorSelfReported.latestScore === null) {
    return {
      title: "Complete the vendor assessment",
      body: "The product has scoped utilities, but no vendor product assessment is recorded yet.",
      missingEvidence: "Vendor-authored product evidence is still missing, so PAT cannot describe current product posture from a live submission.",
      primaryCta: {
        label: "Start product assessment",
        href: assessmentHref,
      },
      secondaryCta: {
        label: "Review product scope",
        href: insightHref,
      },
    };
  }

  if (snapshot.firmReviewed.assessmentCount === 0) {
    return {
      title: "Vendor evidence only",
      body: "PAT has a vendor-authored readout for this product, but no firm product reviews are live yet.",
      missingEvidence: "Buyer-side signal is absent, so current insight stays directional and should not be treated as externally confirmed.",
      primaryCta: {
        label: "Review current insight",
        href: insightHref,
      },
      secondaryCta: {
        label: "Refine vendor assessment",
        href: assessmentHref,
      },
    };
  }

  if (snapshot.firmReviewed.assessmentCount < 4) {
    return {
      title: "Thin firm-reviewed sample",
      body: `PAT has ${snapshot.firmReviewed.assessmentCount} firm product review${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"} live for this product.`,
      missingEvidence: "Firm-reviewed evidence is useful but still sample-thin, so the confidence caveats matter more than the headline readout.",
      primaryCta: {
        label: "Review confidence caveats",
        href: insightHref,
      },
      secondaryCta: {
        label: "Reopen assessment",
        href: assessmentHref,
      },
    };
  }

  return {
    title: "Open product insight",
    body: "This product has vendor-authored evidence and a usable firm-reviewed sample.",
    missingEvidence: "PAT still reflects current-state evidence only. It is not claiming a benchmark, forecast, or market-wide truth.",
    primaryCta: {
      label: "Open product insight",
      href: insightHref,
    },
    secondaryCta: {
      label: "Update assessment",
      href: assessmentHref,
    },
  };
}
