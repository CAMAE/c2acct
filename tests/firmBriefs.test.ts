import { describe, expect, it } from "vitest";

import type { AdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import {
  buildFiveModuleRadar,
  buildSixQuarterRoadmap,
  buildStackFitAnalysis,
  radarBandForDelta,
  stackFitStatusForRow,
  type FirmBriefRadarAxis,
  type FirmBriefStackFitRow,
} from "@/lib/firmBriefs";
import {
  FIRM_MODULE_DEFINITIONS,
  type FirmModuleProgress,
  type FirmProductCatalogItem,
} from "@/lib/firmPat";
import type { VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

function moduleProgress(input: {
  key: string;
  latestScore: number | null;
  status?: FirmModuleProgress["status"];
  completedCount?: number;
  questionCount?: number;
}): FirmModuleProgress {
  return {
    key: input.key,
    badgeId: `${input.key}-badge`,
    title: `Module ${input.key}`,
    description: "",
    summary: "",
    href: `/firm/modules/${input.key}`,
    questionCount: input.questionCount ?? 25,
    completedCount: input.completedCount ?? 25,
    draftAnsweredCount: 0,
    status: input.status ?? "completed",
    statusLabel: "",
    statusDescription: "",
    latestScore: input.latestScore,
    latestSubmittedAt: input.latestScore !== null ? new Date() : null,
    draftUpdatedAt: null,
  };
}

function fiveModulesFor(scores: Record<string, number | null>): FirmModuleProgress[] {
  return FIRM_MODULE_DEFINITIONS.map((def) => {
    const score = scores[def.key] ?? null;
    return moduleProgress({ key: def.key, latestScore: score });
  });
}

function vendorSnapshot(input: {
  id: string;
  name?: string;
  selfScore?: number | null;
}): VendorProductInsightSnapshot {
  return {
    product: {
      id: input.id,
      name: input.name ?? `Product ${input.id}`,
      summary: null,
      utilityKeys: [],
      utilityLabels: ["Workflow"],
      utilityScopeLabel: "",
    },
    vendorSelfReported: {
      latestScore: input.selfScore ?? null,
      submittedAt: null,
      sectionEvidence: [],
    },
    firmReviewed: {
      assessmentCount: 0,
      averageScore: null,
      latestSubmittedAt: null,
      utilityEvidence: [],
    },
  } as unknown as VendorProductInsightSnapshot;
}

function firmCatalogProduct(input: {
  id: string;
  name?: string;
  vendor?: string;
  latestFirmReviewSubmittedAt?: Date | null;
}): FirmProductCatalogItem {
  return {
    id: input.id,
    name: input.name ?? `Product ${input.id}`,
    vendorName: input.vendor ?? "Vendor",
    summary: null,
    utilityKeys: [],
    questionCount: 20,
    reviewAvailable: true,
    reviewStatusLabel: "",
    reviewStatusReason: "",
    vendorAssessmentCompletedAt: new Date(),
    firmReviewStatus: "completed",
    firmReviewStatusLabel: "",
    firmReviewStatusReason: "",
    firmReviewDraftAnsweredCount: 0,
    firmReviewDraftUpdatedAt: null,
    latestFirmReviewSubmittedAt: input.latestFirmReviewSubmittedAt ?? new Date(),
  };
}

function briefingWithFirmReviews(
  productScores: Array<{ productId: string; firmScore: number | null }>
): AdminCompanyBriefing {
  return {
    company: { id: "focal-firm", name: "Focal Firm" },
    productLayer: {
      products: productScores.map((entry) => ({
        productId: entry.productId,
        productName: `Product ${entry.productId}`,
        vendorName: "Vendor",
        canonicalFirmReviewScore: entry.firmScore,
        firmReviewCount: 1,
        vendorSelfReportedScore: null,
        combinedCurrentReadout: "",
        divergenceLabel: "",
        confidenceLabel: "",
        confidenceSummary: "",
        latestUpdatedAt: null,
        utilityLabels: [],
        taxonomyTitles: [],
        capabilityKeys: [],
        latestVendorAssessmentSubmittedAt: null,
        openEndedResponseCount: 0,
      })),
      openEndedResponses: [],
    },
    nextActions: [],
  } as unknown as AdminCompanyBriefing;
}

describe("lib/firmBriefs helpers", () => {
  describe("radarBandForDelta", () => {
    it("maps deltas to the 5-stop gradient per mock spec page 2", () => {
      expect(radarBandForDelta(null)).toBe("no-signal");
      expect(radarBandForDelta(16)).toBe("deep-green");
      expect(radarBandForDelta(15)).toBe("green");
      expect(radarBandForDelta(6)).toBe("green");
      expect(radarBandForDelta(5)).toBe("amber");
      expect(radarBandForDelta(0)).toBe("amber");
      expect(radarBandForDelta(-5)).toBe("amber");
      expect(radarBandForDelta(-6)).toBe("red");
      expect(radarBandForDelta(-15)).toBe("red");
      expect(radarBandForDelta(-16)).toBe("deep-red");
    });
  });

  describe("stackFitStatusForRow", () => {
    it("returns 'not-reviewed' when firm score is null", () => {
      expect(stackFitStatusForRow({ firmReviewedScore: null, isHotDivergence: false })).toBe(
        "not-reviewed"
      );
    });

    it("returns 'gap' when hot divergence regardless of firm score", () => {
      expect(stackFitStatusForRow({ firmReviewedScore: 90, isHotDivergence: true })).toBe("gap");
      expect(stackFitStatusForRow({ firmReviewedScore: 40, isHotDivergence: true })).toBe("gap");
    });

    it("returns 'gap' for low firm score even without divergence", () => {
      expect(stackFitStatusForRow({ firmReviewedScore: 59, isHotDivergence: false })).toBe("gap");
    });

    it("returns 'strong' for firm score >= 75 without divergence", () => {
      expect(stackFitStatusForRow({ firmReviewedScore: 75, isHotDivergence: false })).toBe(
        "strong"
      );
      expect(stackFitStatusForRow({ firmReviewedScore: 90, isHotDivergence: false })).toBe(
        "strong"
      );
    });

    it("returns 'aligned' for mid-range firm scores", () => {
      expect(stackFitStatusForRow({ firmReviewedScore: 60, isHotDivergence: false })).toBe(
        "aligned"
      );
      expect(stackFitStatusForRow({ firmReviewedScore: 74, isHotDivergence: false })).toBe(
        "aligned"
      );
    });
  });

  describe("buildFiveModuleRadar", () => {
    it("returns one axis per FIRM_MODULE_DEFINITIONS entry with peer-average deltas", () => {
      const focalScores: Record<string, number | null> = {};
      for (const def of FIRM_MODULE_DEFINITIONS) focalScores[def.key] = 75;
      const focalModules = fiveModulesFor(focalScores);

      const peerModules = new Map<string, FirmModuleProgress[]>();
      // Two peers, each scoring 60 on every module. Ecosystem avg = 60.
      // Focal delta = +15 → "green" band.
      for (const peerId of ["peer-1", "peer-2"]) {
        const scores: Record<string, number | null> = {};
        for (const def of FIRM_MODULE_DEFINITIONS) scores[def.key] = 60;
        peerModules.set(peerId, fiveModulesFor(scores));
      }

      const axes = buildFiveModuleRadar({
        focalFirmModules: focalModules,
        peerFirmModulesByFirmId: peerModules,
      });
      expect(axes).toHaveLength(FIRM_MODULE_DEFINITIONS.length);
      expect(axes[0].firmScore).toBe(75);
      expect(axes[0].ecosystemAverage).toBe(60);
      expect(axes[0].delta).toBe(15);
      expect(axes[0].band).toBe("green");
    });

    it("emits null delta + no-signal band when focal score is null", () => {
      const focalModules = fiveModulesFor(
        Object.fromEntries(FIRM_MODULE_DEFINITIONS.map((d) => [d.key, null]))
      );
      const peerModules = new Map<string, FirmModuleProgress[]>([
        ["peer-1", fiveModulesFor(Object.fromEntries(FIRM_MODULE_DEFINITIONS.map((d) => [d.key, 70])))],
      ]);
      const axes = buildFiveModuleRadar({
        focalFirmModules: focalModules,
        peerFirmModulesByFirmId: peerModules,
      });
      expect(axes[0].firmScore).toBeNull();
      expect(axes[0].delta).toBeNull();
      expect(axes[0].band).toBe("no-signal");
    });

    it("emits null ecosystemAverage when no peers have data", () => {
      const focalModules = fiveModulesFor(
        Object.fromEntries(FIRM_MODULE_DEFINITIONS.map((d) => [d.key, 70]))
      );
      const axes = buildFiveModuleRadar({
        focalFirmModules: focalModules,
        peerFirmModulesByFirmId: new Map(),
      });
      expect(axes[0].firmScore).toBe(70);
      expect(axes[0].ecosystemAverage).toBeNull();
      expect(axes[0].delta).toBeNull();
      expect(axes[0].band).toBe("no-signal");
    });
  });

  describe("buildStackFitAnalysis", () => {
    it("joins firm-reviewed score with vendor self-report and flags hot divergence at 10pt boundary", () => {
      const firmCatalog = [
        firmCatalogProduct({ id: "p1" }),
        firmCatalogProduct({ id: "p2" }),
      ];
      const vendorCatalog = [
        vendorSnapshot({ id: "p1", selfScore: 80 }),
        vendorSnapshot({ id: "p2", selfScore: 75 }),
      ];
      const briefing = briefingWithFirmReviews([
        { productId: "p1", firmScore: 71 }, // delta 9 → not hot
        { productId: "p2", firmScore: 65 }, // delta 10 → hot (boundary)
      ]);
      const rows = buildStackFitAnalysis({
        firmProductCatalog: firmCatalog,
        vendorCatalog,
        briefingForFirm: briefing,
      });
      expect(rows[0].isHotDivergence).toBe(false);
      expect(rows[0].delta).toBe(9);
      expect(rows[1].isHotDivergence).toBe(true);
      expect(rows[1].delta).toBe(10);
    });

    it("returns 'not-reviewed' status when briefing has no productLayer entry for the product", () => {
      const firmCatalog = [firmCatalogProduct({ id: "p1" })];
      const vendorCatalog = [vendorSnapshot({ id: "p1", selfScore: 70 })];
      const briefing = briefingWithFirmReviews([]);
      const rows = buildStackFitAnalysis({
        firmProductCatalog: firmCatalog,
        vendorCatalog,
        briefingForFirm: briefing,
      });
      expect(rows[0].status).toBe("not-reviewed");
      expect(rows[0].firmReviewedScore).toBeNull();
      expect(rows[0].delta).toBeNull();
    });

    it("handles a firm product the vendor catalog doesn't expose (vendor data null)", () => {
      const firmCatalog = [firmCatalogProduct({ id: "p1" })];
      const briefing = briefingWithFirmReviews([{ productId: "p1", firmScore: 80 }]);
      const rows = buildStackFitAnalysis({
        firmProductCatalog: firmCatalog,
        vendorCatalog: [],
        briefingForFirm: briefing,
      });
      expect(rows[0].vendorSelfReportedScore).toBeNull();
      expect(rows[0].delta).toBeNull();
      expect(rows[0].status).toBe("strong"); // firm score 80, no divergence
    });
  });

  describe("buildSixQuarterRoadmap", () => {
    const radar: FirmBriefRadarAxis[] = FIRM_MODULE_DEFINITIONS.map((def, idx) => ({
      moduleKey: def.key,
      moduleTitle: def.title,
      firmScore: 70,
      ecosystemAverage: 75,
      // First 2 axes are -10 delta (peer-gap), rest are +5 (amber).
      delta: idx < 2 ? -10 : 5,
      band: idx < 2 ? "red" : "amber",
    }));

    const stackFit: FirmBriefStackFitRow[] = [
      {
        productId: "p1",
        productName: "Product 1",
        vendorName: "V",
        firmReviewedScore: 45,
        vendorSelfReportedScore: 80,
        delta: 35,
        isHotDivergence: true,
        status: "gap",
        utilityLabels: [],
      },
    ];

    const modules: FirmModuleProgress[] = FIRM_MODULE_DEFINITIONS.map((def, idx) =>
      moduleProgress({
        key: def.key,
        latestScore: 70,
        status: idx < 3 ? "completed" : "in-progress",
      })
    );

    const briefing: AdminCompanyBriefing = {
      company: { id: "focal-firm", name: "Focal Firm" },
      productLayer: { products: [], openEndedResponses: [] },
      nextActions: [
        { window: "30 days", title: "Action A", detail: "", evidence: "" },
        { window: "60 days", title: "Action B", detail: "", evidence: "" },
        { window: "90 days", title: "Action C", detail: "", evidence: "" },
      ],
    } as unknown as AdminCompanyBriefing;

    it("returns 6 quarters with current Q first and sequential keys", () => {
      const roadmap = buildSixQuarterRoadmap({
        briefingForFirm: briefing,
        stackFit,
        modules,
        radar,
        canonicalFirmScore: 70,
        now: new Date("2026-05-11T00:00:00Z"),
      });
      expect(roadmap).toHaveLength(6);
      expect(roadmap[0].isCurrent).toBe(true);
      expect(roadmap[0].quarterLabel).toBe("Q2'26");
      expect(roadmap[1].quarterLabel).toBe("Q3'26");
      expect(roadmap[5].quarterLabel).toBe("Q3'27");
    });

    it("populates Q1-Q3 from next-action windows, Q4 from stack gaps, Q5 from incomplete modules, Q6 from peer-gap modules", () => {
      const roadmap = buildSixQuarterRoadmap({
        briefingForFirm: briefing,
        stackFit,
        modules,
        radar,
        canonicalFirmScore: 70,
        now: new Date("2026-05-11T00:00:00Z"),
      });
      expect(roadmap[0].actions[0].source).toBe("next-action");
      expect(roadmap[0].actions[0].text).toBe("Action A");
      expect(roadmap[1].actions[0].source).toBe("next-action");
      expect(roadmap[1].actions[0].text).toBe("Action B");
      expect(roadmap[2].actions[0].text).toBe("Action C");
      expect(roadmap[3].actions[0].source).toBe("stack-gap");
      expect(roadmap[3].actions[0].text).toMatch(/Reassess Product 1/);
      expect(roadmap[4].actions[0].source).toBe("module-completion");
      expect(roadmap[5].actions[0].source).toBe("peer-gap");
    });

    it("accumulates deterministic gap-closure projection across quarters, capped at 100", () => {
      const roadmap = buildSixQuarterRoadmap({
        briefingForFirm: briefing,
        stackFit,
        modules,
        radar,
        canonicalFirmScore: 70,
        now: new Date("2026-05-11T00:00:00Z"),
      });
      // Q1: +1 action, projected 71. Q2: +1, 72. Q3: +1, 73.
      // Q4: +1 stack gap → 74. Q5: 2 incomplete modules (last 2 of 5) → 76.
      // Q6: 2 peer-gap modules → 78.
      expect(roadmap[0].projectedAlignment).toBe(71);
      expect(roadmap[1].projectedAlignment).toBe(72);
      expect(roadmap[2].projectedAlignment).toBe(73);
      expect(roadmap[3].projectedAlignment).toBe(74);
      expect(roadmap[4].projectedAlignment).toBe(76);
      expect(roadmap[5].projectedAlignment).toBe(78);
    });

    it("returns null projectedAlignment when canonicalFirmScore is null", () => {
      const roadmap = buildSixQuarterRoadmap({
        briefingForFirm: briefing,
        stackFit,
        modules,
        radar,
        canonicalFirmScore: null,
        now: new Date("2026-05-11T00:00:00Z"),
      });
      for (const quarter of roadmap) {
        expect(quarter.projectedAlignment).toBeNull();
      }
    });
  });
});

import {
  buildFirmEditVariants,
  composeFirmEditChoices,
  type FirmBriefEditChoices,
} from "@/lib/firmBriefs";
import type { FirmBriefVariantSlots } from "@/lib/firmBriefs/template-bank";

describe("Firm Brief edit-choice composition (Day 17 Block 4)", () => {
  const sampleSlots: FirmBriefVariantSlots = {
    firmCompanyName: "Northstar CPA",
    canonicalFirmScore: 72,
    ecosystemAverageScore: 68,
    peerFirmCount: 9,
    reviewedProductCount: 4,
    totalProductCount: 6,
    currentQuarterLabel: "Q2'26",
    trajectoryEnd: 80,
  };

  it("buildFirmEditVariants returns 2 variants per eligible section, all rendered", () => {
    const editVariants = buildFirmEditVariants(sampleSlots);
    expect(Object.keys(editVariants)).toEqual([
      "firm.alignment-header",
      "firm.stack-fit-analysis",
      "firm.six-quarter-roadmap",
    ]);
    for (const sectionKey of Object.keys(editVariants)) {
      expect(editVariants[sectionKey]).toHaveLength(2);
      for (const option of editVariants[sectionKey]) {
        expect(option.id).toMatch(/^v\d+-/);
        expect(option.rendered.length).toBeGreaterThan(0);
      }
    }
  });

  it("composeFirmEditChoices on an empty Map returns the empty-default editChoices shape", () => {
    const editChoices = composeFirmEditChoices(new Map());
    expect(editChoices).toEqual({ variants: {}, emphasis: {}, ordering: {} });
  });

  it("PHRASING_VARIANT choice composes into editChoices.variants[sectionKey] = variantId", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "firm.alignment-header::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "v1-pointed" },
      ],
    ]);
    const editChoices = composeFirmEditChoices(map);
    expect(editChoices.variants["firm.alignment-header"]).toBe("v1-pointed");
  });

  it("EMPHASIS choice composes the comma-joined target ids into editChoices.emphasis[sectionKey]", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "firm.alignment-header::EMPHASIS",
        { choiceType: "EMPHASIS", choiceValue: "score,headline" },
      ],
    ]);
    const editChoices = composeFirmEditChoices(map);
    expect(editChoices.emphasis["firm.alignment-header"]).toEqual(["score", "headline"]);
  });

  it("ORDERING choice carries through; stale id resolution happens in the render layer", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "firm.six-quarter-roadmap::ORDERING",
        {
          choiceType: "ORDERING",
          choiceValue: "2026-Q2__1,2026-Q2__0,stale-action-id",
        },
      ],
    ]);
    const editChoices = composeFirmEditChoices(map);
    expect(editChoices.ordering["firm.six-quarter-roadmap"]).toEqual([
      "2026-Q2__1",
      "2026-Q2__0",
      "stale-action-id",
    ]);
  });

  it("empty-string choiceValue (clear-choice sentinel) is dropped — render falls back to default variant", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "firm.alignment-header::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "" },
      ],
    ]);
    const editChoices = composeFirmEditChoices(map);
    expect(editChoices.variants["firm.alignment-header"]).toBeUndefined();
  });

  it("fully-populated choice map produces a fully-populated editChoices shape", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "firm.alignment-header::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "v1-pointed" },
      ],
      [
        "firm.stack-fit-analysis::EMPHASIS",
        { choiceType: "EMPHASIS", choiceValue: "top-row" },
      ],
      [
        "firm.six-quarter-roadmap::ORDERING",
        { choiceType: "ORDERING", choiceValue: "a,b,c" },
      ],
    ]);
    const editChoices: FirmBriefEditChoices = composeFirmEditChoices(map);
    expect(editChoices.variants["firm.alignment-header"]).toBe("v1-pointed");
    expect(editChoices.emphasis["firm.stack-fit-analysis"]).toEqual(["top-row"]);
    expect(editChoices.ordering["firm.six-quarter-roadmap"]).toEqual(["a", "b", "c"]);
  });
});
