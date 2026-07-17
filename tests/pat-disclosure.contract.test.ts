import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PAT_DISCLOSURE_FOOTER,
  PAT_DISCLOSURE_SHORT,
  PAT_AI_GENERATED_HEADER_NAME,
  patAiGeneratedEmailHeaders,
} from "@/lib/patDisclosure";

/**
 * Block 9a: every Pat-drafted outbound communication carries the AI disclosure.
 * The disclosure is rendered from the Notification.aiGenerated flag, so this
 * guards two things: (1) every Pat-drafted create path sets aiGenerated: true,
 * and (2) every surface that renders a notification renders the disclosure for
 * AI-drafted items. If a new template ships without either, this fails.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("Pat AI-disclosure — labels", () => {
  it("carries the exact copy-pack disclosure copy", () => {
    expect(PAT_DISCLOSURE_FOOTER).toBe(
      "Drafted by Pat, Patalign's AI assistant, and reviewed by a person before sending. Questions? Reply — a human reads these."
    );
    expect(PAT_DISCLOSURE_SHORT).toBe("Pat (AI) · human-reviewed");
    expect(PAT_AI_GENERATED_HEADER_NAME).toBe("X-PAT-AI-Generated");
    expect(patAiGeneratedEmailHeaders()["X-PAT-AI-Generated"]).toBe("true; reviewed=human");
  });
});

describe("Pat AI-disclosure — every Pat-drafted create path is flagged", () => {
  // Notification create sites that carry a Pat-drafted body MUST pass
  // aiGenerated: true. (store.ts is the sink; the others are the drafters.)
  const patDraftedCreateSites = [
    "lib/notifications/executePlan.ts",
    // 16c: the consultant nudge send moved behind the approval queue; the create
    // site is now the approve branch of decideNudgeDraft.
    "lib/notifications/nudgeDraft.ts",
  ];
  for (const rel of patDraftedCreateSites) {
    it(`${rel} sets aiGenerated: true on its notification create`, () => {
      const src = read(rel);
      expect(src).toContain("createNotification(");
      expect(src, `${rel} must flag its Pat-drafted notification`).toContain("aiGenerated: true");
    });
  }

  it("the store persists the aiGenerated flag", () => {
    const src = read("lib/notifications/store.ts");
    expect(src).toContain("aiGenerated: input.aiGenerated");
  });
});

describe("Pat AI-disclosure — every render surface shows it", () => {
  it("the header bell renders the short disclosure for AI-drafted items", () => {
    const src = read("app/components/notifications/HeaderNotificationBell.tsx");
    expect(src).toContain("PAT_DISCLOSURE_SHORT");
    expect(src).toContain("n.aiGenerated");
  });

  it("the inbox list renders the full disclosure footer for AI-drafted items", () => {
    const src = read("app/components/notifications/NotificationInboxList.tsx");
    expect(src).toContain("PAT_DISCLOSURE_FOOTER");
    expect(src).toContain("n.aiGenerated");
  });

  it("the notifications API serializes aiGenerated to the client", () => {
    const src = read("app/api/notifications/route.ts");
    expect(src).toContain("aiGenerated: n.aiGenerated");
  });

  it("the consultant nudge queue shows the disclosure on every Pat-drafted card", () => {
    const src = read("app/consultants/_components/NudgeQueue.tsx");
    expect(src).toContain("PAT_DISCLOSURE_SHORT");
    expect(src).toContain("d.aiGenerated");
  });
});
