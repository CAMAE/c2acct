import { describe, expect, it } from "vitest";
import { buildOperatorBriefings } from "@/lib/adminBriefings";
import { buildOperatorAuditSummary } from "@/lib/operatorAudit";

describe("admin control plane contracts", () => {
  it("builds live operator briefings from canonical module and audit state", () => {
    const briefings = buildOperatorBriefings({
      canonicalModules: [
        {
          key: "firm_alignment_operating_model_v1",
          title: "Operating Model",
          active: true,
          _count: {
            SurveyQuestion: 20,
            SurveySection: 4,
            SurveySubmission: 3,
          },
        },
      ],
      recentAuditCount: 2,
      latestSubmitStatus: "ok",
    });

    expect(briefings).toHaveLength(3);
    expect(briefings[0].summary).toMatch(/section-backed/);
    expect(briefings[1].summary).toMatch(/ok/);
    expect(briefings[2].summary).toMatch(/2 recent operator audit event/);
  });

  it("formats operator audit summaries deterministically", () => {
    expect(
      buildOperatorAuditSummary({
        action: "update",
        entityType: "module",
        entityLabel: "firm_alignment_operating_model_v1",
      })
    ).toBe("update module firm_alignment_operating_model_v1");
  });
});
