import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  bucketVendorProductsByAssessmentStatus,
  buildVendorProductQuestions,
  deriveVendorProductOverviewStatusFromHistory,
  formatDraftInProgressLabel,
} from "@/lib/vendorPat";
import { serializeVendorProductAssessmentPlan } from "@/lib/vendorProductAssessmentPlan";

vi.mock("@/lib/vendorProductInsightEngine", () => ({
  getVendorProductInsightSnapshotsByProductId: async () => ({}),
}));

/**
 * hotfix-demo-1 (R59, 2026-10-05) changes 4 and 5: a product with a FINAL vendor
 * submission is Completed even when a newer draft exists; the draft shows as
 * "Draft in progress since <date>" on the completed row; the tabs honour ?tab=;
 * the dead Elite sentence is gone.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const utilityKeys = ["erp_gl_core_ledger"];
const scoredQuestions = buildVendorProductQuestions(utilityKeys);
const plan = serializeVendorProductAssessmentPlan(utilityKeys);
const finalAnswers = {
  utilitySelection: utilityKeys,
  profile: {
    productName: "Ledger Core",
    productDescription: "Deterministic profile body.",
    logoReference: "https://example.com/logo.png",
    positioning: "Positioning",
    targetCustomer: "Target customer",
    targetUseContext: "Target use context",
    implementationStyle: "Implementation style",
    operatingModelFit: "Operating model fit",
    primaryBuyer: "Primary buyer",
    integrationPosture: "Integration posture",
  },
  responses: Object.fromEntries(scoredQuestions.map((question, index) => [question.id, index % 6])),
  openEndedResponses: Object.fromEntries(plan.openEndedQuestionIds.map((questionId) => [questionId, "Grounded narrative context."])),
};
const finalSubmission = { id: "sub-final", score: 84, createdAt: new Date("2026-09-20T12:00:00.000Z"), answeredCount: scoredQuestions.length, answers: finalAnswers };
const laterDraft = {
  id: "sub-draft",
  score: 0,
  createdAt: new Date("2026-10-03T09:00:00.000Z"),
  answeredCount: 3,
  answers: { utilitySelection: utilityKeys, responses: Object.fromEntries(scoredQuestions.slice(0, 3).map((question) => [question.id, 4])) },
};

describe("V1 — a completed product is never shadowed by a newer draft", () => {
  it("one final and one later draft: Completed, the final's id and date, the draft reported beside it", () => {
    const status = deriveVendorProductOverviewStatusFromHistory({ submissions: [laterDraft, finalSubmission], signalUtilityKeys: utilityKeys });
    expect(status.completed).toBe(true);
    expect(status.latestSubmissionId).toBe("sub-final");
    expect(status.latestSubmittedAt).toEqual(finalSubmission.createdAt);
    expect(status.latestScore).toBe(84);
    expect(status.draftInProgressSince).toEqual(laterDraft.createdAt);
    expect(status.statusLabel).not.toMatch(/not final|incomplete/i);
    const buckets = bucketVendorProductsByAssessmentStatus([{ product: { id: "p1" }, status }]);
    expect(buckets.completed.map((entry) => entry.product.id)).toEqual(["p1"]);
    expect(buckets.existing).toEqual([]);
  });

  it("order of the rows does not matter; a draft older than the final is not reported; a draft alone stays in progress", () => {
    expect(deriveVendorProductOverviewStatusFromHistory({ submissions: [finalSubmission, laterDraft], signalUtilityKeys: utilityKeys }).draftInProgressSince).toEqual(laterDraft.createdAt);
    const olderDraft = { ...laterDraft, id: "sub-old-draft", createdAt: new Date("2026-09-01T09:00:00.000Z") };
    const withOlder = deriveVendorProductOverviewStatusFromHistory({ submissions: [finalSubmission, olderDraft], signalUtilityKeys: utilityKeys });
    expect(withOlder.completed).toBe(true);
    expect(withOlder.draftInProgressSince).toBeNull();
    const draftOnly = deriveVendorProductOverviewStatusFromHistory({ submissions: [laterDraft], signalUtilityKeys: utilityKeys });
    expect(draftOnly.completed).toBe(false);
    expect(draftOnly.latestSubmissionId).toBe("sub-draft");
    expect(draftOnly.draftInProgressSince).toBeNull();
    expect(deriveVendorProductOverviewStatusFromHistory({ submissions: [], signalUtilityKeys: utilityKeys }).completed).toBe(false);
  });

  it("the status strip row stays Final with the draft as a note, not an attention reason", async () => {
    const { buildVendorProductStatusRows } = await import("@/lib/productStatusRows");
    const status = deriveVendorProductOverviewStatusFromHistory({ submissions: [laterDraft, finalSubmission], signalUtilityKeys: utilityKeys });
    const [row] = await buildVendorProductStatusRows("vendor-1", [{ product: { id: "p1", name: "Ledger Core", vendorName: "Acme" }, status }]);
    expect(row.statusLabel).toBe("Final");
    expect(row.statusTone).toBe("positive");
    expect(row.attentionReason).toContain("Draft in progress since Oct 3, 2026");
    expect(row.attentionReason).not.toContain("not final");
    expect(formatDraftInProgressLabel(laterDraft.createdAt)).toBe("Draft in progress since Oct 3, 2026");
  });

  it("the vendor list reads the whole history and the card carries the draft note", () => {
    const page = read("app/(app)/vendor/product-assessment/page.tsx");
    expect(page).toContain("prisma.surveySubmission.findMany({");
    expect(page).not.toContain("prisma.surveySubmission.findFirst({");
    expect(page).toContain("deriveVendorProductOverviewStatusFromHistory({");
    expect(page).toContain("formatDraftInProgressLabel(entry.status.draftInProgressSince)");
  });
});

describe("V2 — the Completed / Existing / Add New tabs switch the list", () => {
  it("the page honours ?tab= as well as ?mode=", () => {
    const page = read("app/(app)/vendor/product-assessment/page.tsx");
    expect(page).toContain("const requestedMode = params?.mode ?? params?.tab;");
    expect(page).toContain("getRequestedVendorProductAssessmentOverviewMode(requestedMode)");
    expect(page).toContain("tab?: string;");
  });
});

describe("V4 — the dead Elite sentence", () => {
  it("is gone from the vendor product assessment client", () => {
    expect(read("app/components/vendor/VendorProductAssessmentClient.tsx")).not.toContain("Elite membership remains staged behind locked blue cards");
  });
});
