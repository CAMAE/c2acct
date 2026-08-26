import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDemoProducts } from "@/data/demoPatEcosystem";
import { buildFirmProductQuestions } from "@/lib/firmPat";
import { normalizeAnswerForStoredScale } from "@/lib/productAssessmentRuntime";
import {
  buildVendorProductEliteInsightCards,
  buildVendorProductInsightDetailSurfaceCards,
  buildVendorProductInsightDetailSurfaceContent,
  buildVendorProductProInsightCards,
  buildVendorProductInsightSnapshot,
  canOpenVendorProductInsight,
  filterVendorProductInsightCatalogToCompleted,
  getRequestedVendorProductInsightDetailMode,
  getRequestedVendorProductInsightDetailSurface,
  type VendorProductInsightSnapshotInput,
} from "@/lib/vendorProductInsightEngine";
import { buildVendorProductQuestions } from "@/lib/vendorPat";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

describe("vendor product insight runtime", () => {
  it("normalizes stored answers against the submission scale", () => {
    expect(normalizeAnswerForStoredScale(1, 1, 5)).toBe(0);
    expect(normalizeAnswerForStoredScale(3, 1, 5)).toBe(50);
    expect(normalizeAnswerForStoredScale(5, 1, 5)).toBe(100);
    expect(normalizeAnswerForStoredScale(4, 0, 5)).toBe(80);
    expect(normalizeAnswerForStoredScale(4, 4, 4)).toBeNull();
  });

  it("carries utility scope and stored-scale normalization into the insight snapshot", () => {
    const utilityKeys = ["ap_automation", "reporting_analytics"];
    const vendorQuestions = buildVendorProductQuestions(utilityKeys);
    const firmQuestions = buildFirmProductQuestions(utilityKeys);

    const vendorResponses = Object.fromEntries(
      vendorQuestions.map((question, index) => [question.id, index % 6])
    );

    const firmResponseSets = [
      Object.fromEntries(firmQuestions.map((question, index) => [question.id, (index + 1) % 6])),
      Object.fromEntries(firmQuestions.map((question, index) => [question.id, (index + 3) % 6])),
    ];

    const fixture: VendorProductInsightSnapshotInput = {
      product: {
        id: "product-fixture",
        name: "PAT Fixture Product",
        summary: "Deterministic vendor product signal fixture.",
        utilityKeys,
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-03-30T12:00:00.000Z"),
        statusLabel: "Assessment complete",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 84,
        submittedAt: new Date("2026-03-30T12:00:00.000Z"),
        responses: {
          answers: vendorResponses,
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 3,
        latestSubmittedAt: new Date("2026-03-30T13:00:00.000Z"),
        averageScore: 34,
        responseSets: firmResponseSets.map((answers) => ({
          answers,
          scaleMin: 0,
          scaleMax: 5,
        })),
      },
    };

    const snapshot = buildVendorProductInsightSnapshot(fixture);

    // WS11-D Block H.1: user-visible "utilities" → "features".
    expect(snapshot.product.utilityScopeLabel).toContain("2 declared features");
    expect(snapshot.vendorAssessmentStatus.completed).toBe(true);
    // assessmentCount 3 meets the divergence sample floor, so the "points apart"
    // calibration caveat fires (below the floor it would be suppressed).
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("3 assessments"))).toBe(true);
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("50 points apart"))).toBe(true);
    expect(snapshot.insightRecords.some((record) => record.exactAssessmentBasis.includes("Utility scope:"))).toBe(
      true
    );
    expect(snapshot.vendorSelfReported.sectionEvidence.every((section) => section.averageScore !== null)).toBe(true);
    expect(snapshot.firmReviewed.utilityEvidence).toHaveLength(utilityKeys.length);
  });

  it("filters the catalog to products with a completed final vendor assessment only", () => {
    const emptySnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "empty-product",
        name: "Empty Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: false,
        latestSubmittedAt: null,
        statusLabel: "Awaiting vendor assessment",
        reason: "Firm review opens only after the vendor completes the full product assessment for this product.",
      },
      vendorSelfReported: {
        latestScore: null,
        submittedAt: null,
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const completedSnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "completed-product",
        name: "Completed Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-10T12:00:00.000Z"),
        statusLabel: "Assessment complete",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 81,
        submittedAt: new Date("2026-04-10T12:00:00.000Z"),
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const incompleteSnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "incomplete-product",
        name: "Incomplete Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: false,
        latestSubmittedAt: new Date("2026-04-10T13:00:00.000Z"),
        statusLabel: "Vendor assessment incomplete",
        reason: "This product does not yet have a completed final vendor product assessment submission.",
      },
      vendorSelfReported: {
        latestScore: 67,
        submittedAt: new Date("2026-04-10T13:00:00.000Z"),
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const olderCompletedSnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "older-completed-product",
        name: "Older Completed Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-01T12:00:00.000Z"),
        statusLabel: "Assessment complete",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 76,
        submittedAt: new Date("2026-04-01T12:00:00.000Z"),
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 1,
        latestSubmittedAt: new Date("2026-04-02T12:00:00.000Z"),
        averageScore: 72,
        responseSets: [
          {
            answers: {},
            scaleMin: 0,
            scaleMax: 5,
          },
        ],
      },
    });

    expect(canOpenVendorProductInsight(emptySnapshot.vendorAssessmentStatus)).toBe(false);
    expect(canOpenVendorProductInsight(incompleteSnapshot.vendorAssessmentStatus)).toBe(false);
    expect(canOpenVendorProductInsight(completedSnapshot.vendorAssessmentStatus)).toBe(true);
    expect(
      filterVendorProductInsightCatalogToCompleted([
        emptySnapshot,
        completedSnapshot,
        incompleteSnapshot,
        olderCompletedSnapshot,
      ]).map(
        (snapshot) => snapshot.product.id
      )
    ).toEqual(["completed-product", "older-completed-product"]);
  });

  it("separates empty, partial, and fully seeded product insight evidence without overclaiming", () => {
    const demoProduct = getDemoProducts()[0]?.product;
    expect(demoProduct).toBeTruthy();
    const utilityKeys = demoProduct!.utilityKeys.slice(0, 3);
    const vendorQuestions = buildVendorProductQuestions(utilityKeys);
    const firmQuestions = buildFirmProductQuestions(utilityKeys);
    const vendorAnswers = Object.fromEntries(vendorQuestions.map((question) => [question.id, 4]));
    const firmAnswers = Object.fromEntries(firmQuestions.map((question) => [question.id, 4]));
    const firmResponseSet = {
      answers: firmAnswers,
      scaleMin: 0,
      scaleMax: 5,
    };

    const emptySnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "empty-product",
        name: "Empty Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: false,
        latestSubmittedAt: null,
        statusLabel: "Needs utility declaration",
        reason: "This product does not yet have a completed final vendor product assessment submission.",
      },
      vendorSelfReported: {
        latestScore: null,
        submittedAt: null,
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const partialSnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "partial-product",
        name: demoProduct!.name,
        summary: demoProduct!.summary,
        utilityKeys,
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-26T12:00:00.000Z"),
        statusLabel: "Firm review available",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 82,
        submittedAt: new Date("2026-04-26T12:00:00.000Z"),
        responses: {
          answers: vendorAnswers,
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });
    const fullSnapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "full-product",
        name: demoProduct!.name,
        summary: demoProduct!.summary,
        utilityKeys,
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-26T12:00:00.000Z"),
        statusLabel: "Firm review available",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 82,
        submittedAt: new Date("2026-04-26T12:00:00.000Z"),
        responses: {
          answers: vendorAnswers,
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 8,
        latestSubmittedAt: new Date("2026-04-26T13:00:00.000Z"),
        responseSets: Array.from({ length: 8 }, () => firmResponseSet),
      },
    });

    expect(emptySnapshot.confidenceBand).toBe("no_signal");
    expect(emptySnapshot.combinedCurrentPatReadout).toMatch(/not have enough current PAT evidence/i);
    expect(emptySnapshot.confidenceCaveats.join(" ")).toMatch(/No product utility declaration|No vendor self-assessment/i);
    expect(partialSnapshot.confidenceBand).toBe("sample_thin");
    expect(partialSnapshot.combinedCurrentPatReadout).toMatch(/vendor-authored current-state view/i);
    expect(partialSnapshot.confidenceCaveats.join(" ")).toMatch(/No firm product reviews are available yet/i);
    expect(fullSnapshot.confidenceBand).toBe("grounded");
    expect(fullSnapshot.confidenceSummary).toMatch(/not claiming benchmark or forecast support/i);

    const partialEvidenceSurface = buildVendorProductInsightDetailSurfaceContent({
      snapshot: partialSnapshot,
      insightKey: partialSnapshot.insightRecords[0]!.key,
      record: partialSnapshot.insightRecords[0]!,
      surface: "evidence",
      locked: false,
    });
    const partialEvidenceText = partialEvidenceSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    expect(partialEvidenceSurface.items.map((item) => item.title)).toContain("Evidence provenance");
    expect(partialEvidenceText).toMatch(/completed final vendor product assessment submitted/i);
    expect(partialEvidenceText).toMatch(/insufficient firm-reviewed evidence: no final firm product assessments/i);
    expect(partialEvidenceText).toMatch(/Firm-reviewed signal: -- across 0 assessments/i);
    expect(partialEvidenceText).toMatch(/Insufficient firm-reviewed evidence: no firm product assessments/i);
    expect(partialEvidenceText).toMatch(/No firm product reviews are available yet/i);
    expect(partialEvidenceText).not.toMatch(/grounded across \d+ utilities/i);
    expect(partialEvidenceText).not.toMatch(
      /benchmark proof is available|projection proof is available|market-comparison proof is available/i
    );

    const fullEvidenceSurface = buildVendorProductInsightDetailSurfaceContent({
      snapshot: fullSnapshot,
      insightKey: fullSnapshot.insightRecords[0]!.key,
      record: fullSnapshot.insightRecords[0]!,
      surface: "evidence",
      locked: false,
    });
    const fullEvidenceText = fullEvidenceSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    expect(fullEvidenceSurface.items.map((item) => item.title)).toContain("Evidence provenance");
    expect(fullEvidenceText).toMatch(/Firm-reviewed source: 8 final firm product assessments/i);
    expect(fullEvidenceText).toMatch(/Firm-reviewed signal is grounded across 3 utilities and 8 assessments/i);
    expect(fullEvidenceText).toMatch(/current-state PAT evidence only/i);
  });

  it("maps vendor product modes and keeps elite cards non-clickable", () => {
    const snapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "focus-product",
        name: "Focus Product",
        summary: null,
        utilityKeys: [],
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-10T12:00:00.000Z"),
        statusLabel: "Assessment complete",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 81,
        submittedAt: new Date("2026-04-10T12:00:00.000Z"),
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 0,
        latestSubmittedAt: null,
        averageScore: null,
        responseSets: [],
      },
    });

    expect(getRequestedVendorProductInsightDetailMode(undefined)).toBe("pro");
    expect(getRequestedVendorProductInsightDetailMode("pro")).toBe("pro");
    expect(getRequestedVendorProductInsightDetailMode("elite")).toBe("pro");
    expect(getRequestedVendorProductInsightDetailMode("help")).toBe("help");
    expect(getRequestedVendorProductInsightDetailMode("unknown")).toBe("pro");
    const proCards = buildVendorProductProInsightCards(snapshot);
    // B8-1: Pro cards are clickable and now carry their own band chip
    // (statusLabel) — distinct from the Elite "Coming soon" locked badge.
    expect(proCards.every((card) => card.interactive && card.href)).toBe(true);
    expect(proCards.every((card) => card.statusLabel !== "Coming soon")).toBe(true);
    expect(
      buildVendorProductEliteInsightCards().every(
        (card) =>
          !card.interactive &&
          card.href === null &&
          card.statusLabel === "Elite" &&
          card.supportingText === "Live with Elite membership"
      )
    ).toBe(true);
  });

  it("builds clickable Pro drill-down surfaces and explanation-first Elite surfaces", () => {
    const snapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "focus-product",
        name: "Focus Product",
        summary: null,
        utilityKeys: ["ap_automation"],
      },
      vendorAssessmentStatus: {
        completed: true,
        latestSubmittedAt: new Date("2026-04-10T12:00:00.000Z"),
        statusLabel: "Assessment complete",
        reason: "Firm review is available because the vendor completed the full product assessment.",
      },
      vendorSelfReported: {
        latestScore: 81,
        submittedAt: new Date("2026-04-10T12:00:00.000Z"),
        responses: {
          answers: {},
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 3,
        latestSubmittedAt: new Date("2026-04-10T13:00:00.000Z"),
        averageScore: 63,
        responseSets: [
          {
            answers: {},
            scaleMin: 0,
            scaleMax: 5,
          },
        ],
      },
    });
    const record = snapshot.insightRecords[0]!;

    // Block 11d: the click default is the data (Evidence) pane, not Help.
    expect(getRequestedVendorProductInsightDetailSurface(undefined)).toBe("evidence");
    expect(getRequestedVendorProductInsightDetailSurface("firm-evidence")).toBe("evidence");
    expect(getRequestedVendorProductInsightDetailSurface("confidence")).toBe("evidence");

    const proCards = buildVendorProductInsightDetailSurfaceCards({
      snapshot,
      insightKey: record.key,
      record,
      locked: false,
    });
    const eliteCards = buildVendorProductInsightDetailSurfaceCards({
      snapshot,
      insightKey: "market-comparison",
      record: null,
      locked: true,
    });

    expect(proCards.map((card) => card.key)).toEqual(["evidence", "help"]);
    expect(proCards.every((card) => card.interactive && card.href?.includes(`surface=${card.key}`))).toBe(true);
    expect(proCards.every((card) => card.href?.startsWith(`/vendor/product-insight/${snapshot.product.id}/${record.key}?surface=`))).toBe(true);
    expect(proCards.find((card) => card.key === "evidence")?.summary).toBe(
      "Review the vendor section evidence alongside the firm-reviewed feature evidence behind this readout."
    );
    expect(eliteCards.map((card) => card.key)).toEqual(["evidence", "help"]);
    expect(eliteCards.every((card) => card.interactive && card.href?.includes(`surface=${card.key}`))).toBe(
      true
    );
    expect(
      eliteCards.every((card) =>
        card.href?.startsWith(`/vendor/product-insight/${snapshot.product.id}/market-comparison?surface=`)
      )
    ).toBe(true);
    expect(proCards.some((card) => card.title === "Confidence and caveats")).toBe(false);

    const proSurface = buildVendorProductInsightDetailSurfaceContent({
      snapshot,
      insightKey: record.key,
      record,
      surface: "evidence",
      locked: false,
    });
    const eliteSurface = buildVendorProductInsightDetailSurfaceContent({
      snapshot,
      insightKey: "market-comparison",
      record: null,
      surface: "evidence",
      locked: true,
    });

    const proSurfaceText = `${proSurface.title} ${proSurface.intro} ${proSurface.items
      .map((item) => `${item.title} ${item.body}`)
      .join(" ")}`;
    const proHelpSurface = buildVendorProductInsightDetailSurfaceContent({
      snapshot,
      insightKey: record.key,
      record,
      surface: "help",
      locked: false,
    });
    const proHelpText = proHelpSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    const eliteSurfaceText = `${eliteSurface.title} ${eliteSurface.intro} ${eliteSurface.items
      .map((item) => `${item.title} ${item.body}`)
      .join(" ")}`;

    expect(proSurface.title).toBe("Evidence and provenance");
    expect(proSurface.items.map((item) => item.title)).toEqual([
      "Current PAT picture",
      "Evidence provenance",
      "Vendor-reported evidence",
      "Firm-reviewed evidence",
      "Current limits",
    ]);
    expect(proHelpSurface.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
      "Evidence provenance",
    ]);
    expect(proHelpText).toMatch(/Vendor source: completed final vendor product assessment/i);
    expect(proHelpText).toMatch(/PAT uses only these current assessment records/i);
    expect(proSurfaceText).toMatch(/sample-thin|early current-state/i);
    expect(proSurfaceText).toMatch(/Evidence provenance/i);
    expect(proSurfaceText).not.toContain("Confidence and caveats");
    expect(proSurfaceText).not.toContain("Freshness:");
    expect(proSurfaceText).not.toMatch(/Caveat \d+/);
    expect(eliteSurface.title).toBe("Evidence and provenance");
    expect(eliteSurfaceText).toMatch(/not a live Elite interpretation/i);
    expect(eliteSurfaceText).toMatch(/Why the deeper view is still locked/i);
    expect(eliteSurfaceText).toMatch(/Live with Elite membership/i);
    expect(eliteSurfaceText).not.toMatch(/Elite insight is live/i);
    expect(eliteSurface.items.some((item) => item.body.includes("Vendor self-reported signal"))).toBe(true);
    expect(
      buildVendorProductInsightDetailSurfaceContent({
        snapshot,
        insightKey: "market-comparison",
        record: null,
        surface: "help",
        locked: true,
      }).items.map((item) => item.title)
    ).toEqual(["What it is", "Why it matters", "How to use it", "Locked Elite boundary"]);
  });

  it("keeps the detail route on the cleaned shared shell without legacy panel clutter", () => {
    const text = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-insight/[productId]/[insightKey]/page.tsx"),
      "utf8"
    );

    expect(text).toContain('import InsightDetailShell from "@/app/components/insights/InsightDetailShell";');
    expect(text).toContain("<InsightDetailShell");
    expect(text).not.toContain("PatModeToggle");
    expect(text).not.toContain("Confidence and caveats");
    expect(text).not.toContain("Assessment basis");
    expect(text).not.toContain("Module evidence");
    expect(text).not.toContain("Capability and question evidence");
    expect(text).not.toContain("Freshness:");
    expect(text).not.toContain("Sample:");
    expect(text).not.toMatch(/Caveat \d+/);
  });

  it("blocks direct product intelligence routes before incomplete products can build snapshots", () => {
    const engineText = readFileSync(path.join(ROOT, "lib/vendorProductInsightEngine.ts"), "utf8");
    const detailPageText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-insight/[productId]/page.tsx"),
      "utf8"
    );
    const slicePageText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-insight/[productId]/[insightKey]/page.tsx"),
      "utf8"
    );

    const readinessCheckIndex = engineText.indexOf("if (!canOpenVendorProductInsight(vendorAssessmentStatus))");
    const snapshotBuildIndex = engineText.indexOf("return buildVendorProductInsightSnapshot({");

    expect(readinessCheckIndex).toBeGreaterThan(-1);
    expect(snapshotBuildIndex).toBeGreaterThan(readinessCheckIndex);
    expect(detailPageText).toContain("const snapshot = await getVendorProductInsightSnapshot");
    expect(detailPageText).toContain("if (!snapshot) {\n    notFound();\n  }");
    expect(slicePageText).toContain("const snapshot = await getVendorProductInsightSnapshot");
    expect(slicePageText).toContain("if (!snapshot) {\n    notFound();\n  }");
  });
});
