import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFirmProductQuestions,
  deriveFirmProductReviewStatus,
} from "@/lib/firmPat";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

describe("firm product assessment catalog", () => {
  it("derives blocked, available, in-progress, and completed firm review states", () => {
    expect(
      deriveFirmProductReviewStatus({
        reviewAvailable: false,
        questionCount: 0,
        latestFirmReviewSubmittedAt: null,
        draftAnsweredCount: 0,
      })
    ).toMatchObject({
      status: "blocked",
      label: "Vendor dependency",
    });
    expect(
      deriveFirmProductReviewStatus({
        reviewAvailable: true,
        questionCount: 40,
        latestFirmReviewSubmittedAt: null,
        draftAnsweredCount: 0,
      })
    ).toMatchObject({
      status: "available",
      label: "Available",
    });
    expect(
      deriveFirmProductReviewStatus({
        reviewAvailable: true,
        questionCount: 40,
        latestFirmReviewSubmittedAt: null,
        draftAnsweredCount: 12,
      })
    ).toMatchObject({
      status: "in-progress",
      label: "In Progress",
      reason: "Your firm has 12 of 40 product questions saved in draft.",
    });
    expect(
      deriveFirmProductReviewStatus({
        reviewAvailable: true,
        questionCount: 40,
        latestFirmReviewSubmittedAt: new Date("2026-05-05T12:00:00.000Z"),
        draftAnsweredCount: 12,
      })
    ).toMatchObject({
      status: "completed",
      label: "Completed",
    });
  });

  it("keeps firm product questions feature-scoped and complete before submission", () => {
    const questions = buildFirmProductQuestions(["ap_payables_spend", "reporting_analytics_fpa"]);
    const fullAnswers = Object.fromEntries(questions.map((question, index) => [question.id, index % 6]));
    const partialAnswers = Object.fromEntries(questions.slice(0, -1).map((question, index) => [question.id, index % 6]));

    expect(questions).toHaveLength(40);
    expect(Object.keys(fullAnswers)).toHaveLength(questions.length);
    expect(Object.keys(partialAnswers)).toHaveLength(questions.length - 1);
  });

  it("keeps blocked, empty, available, in-progress, and completed catalog copy visible", () => {
    const pageText = readFileSync(
      path.join(ROOT, "app/(app)/firm/product-assessments/page.tsx"),
      "utf8"
    );
    const detailText = readFileSync(
      path.join(ROOT, "app/(app)/firm/product-assessments/[productId]/page.tsx"),
      "utf8"
    );
    const submitRouteText = readFileSync(
      path.join(ROOT, "app/api/firm/product-assessment/submit/route.ts"),
      "utf8"
    );

    expect(pageText).toContain("reviewableProducts");
    // WS11-D Block I.3: the verbose "Only products with a completed vendor
    // product assessment appear here..." copy was stripped per Cam's review
    // ("Just have the title and the couple sentences underneath... we don't
    // need that text under there"). Replaced with the shorter
    // "Review the products that are available for firm-side input."
    expect(pageText).toContain("Review the products that are available for firm-side input");
    expect(pageText).toContain("No products are reviewable yet");
    expect(pageText).toContain("blockedProductId");
    expect(pageText).toContain("firmReviewStatusLabel");
    expect(pageText).toContain("firmReviewStatusReason");
    expect(detailText).toContain("if (!product.reviewAvailable)");
    expect(detailText).toContain("blockedProductId");
    expect(detailText).toContain("firmReviewStatusLabel");
    expect(submitRouteText).toContain("if (!product.reviewAvailable)");
    expect(submitRouteText).toContain("Complete every active product question before submitting.");
  });
});
