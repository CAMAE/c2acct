import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAdminLaunchControlView,
  buildEmptyAdminLaunchControlSource,
  type AdminLaunchControlSource,
} from "@/lib/adminLaunchControl";
import { DEMO_PAT_ECOSYSTEM_VERSION } from "@/data/demoPatEcosystem";

const release = {
  releaseId: "abc1234:build_1",
  branch: "release/test",
  commitSha: "abc1234567890abc1234567890abc1234567890",
  buildId: "build_1",
  buildTimestamp: "2026-04-28T13:00:00Z",
  authMode: "github",
  buildSourceType: "standalone-build",
  canonicalRootName: "c2acct-live",
  releaseFingerprintSeed: "seed",
  startCommand: "node .next/standalone/server.js",
  gitDirty: "clean",
};

function seededSource(): AdminLaunchControlSource {
  return {
    counts: {
      vendors: 11,
      vendorProfiles: 11,
      firms: 10,
      users: 25,
      products: 37,
    },
    assessments: {
      vendorProductExpected: 37,
      vendorProductCompleted: 37,
      firmAlignmentExpected: 50,
      firmAlignmentCompleted: 50,
      firmProductExpected: 100,
      firmProductCompleted: 110,
    },
    insights: {
      total: 8,
      active: 8,
      ruleBackedActive: 8,
      productProfiles: 37,
      productSignals: 148,
      insightReadyProducts: 37,
    },
    memberships: {
      total: 21,
      distribution: [
        { plan: "PRO", status: "ACTIVE", count: 14 },
        { plan: "ELITE", status: "ACTIVE", count: 5 },
        { plan: "PRO", status: "PAST_DUE", count: 2 },
      ],
    },
    billing: {
      customers: 9,
      providerSubscriptions: 7,
      unreconciledProviderSubscriptions: 1,
      webhookEvents: 12,
      failedWebhookEvents: 1,
      recentFailedWebhookEvents: [
        {
          id: "evt_row_1",
          provider: "stripe",
          providerEventId: "evt_sensitive_ref",
          eventType: "invoice.payment_failed",
          processingStatus: "failed",
          processingError: "fixture failure",
          createdAt: new Date("2026-04-28T13:00:00Z"),
          processedAt: null,
        },
      ],
    },
    localReview: {
      flagEnabled: true,
      credentialsProviderAvailable: true,
      runtimeAllowed: true,
      reason: null,
      seededUserCount: 5,
      expectedUserCount: 5,
    },
    release,
    demoHealth: {
      ok: true,
      error: null,
      vendorCount: 11,
      productCount: 37,
      firmCount: 10,
      productProfileCount: 37,
      vendorProductPlanCount: 37,
      firmProductPlanCount: 37,
      productSignalCount: 148,
      vendorProductAssessmentCount: 37,
      firmAlignmentSubmissionCount: 50,
      firmProductAssessmentCount: 110,
      firmVendorRelationshipCount: 110,
      routeReady: true,
    },
  };
}

describe("admin launch control plane contracts", () => {
  it("builds operator cards from seeded launch data", () => {
    const view = buildAdminLaunchControlView(seededSource());

    expect(view.demoSeedVersion).toBe(DEMO_PAT_ECOSYSTEM_VERSION);
    expect(view.summaryCards.map((card) => [card.label, card.value])).toEqual([
      ["Vendors", "11"],
      ["Firms", "10"],
      ["Users", "25"],
      ["Products", "37"],
    ]);
    expect(view.assessmentCards.map((card) => card.value)).toEqual([
      "37/37 (100%)",
      "50/50 (100%)",
      "110/100 (110%)",
    ]);
    expect(view.insightCards.find((card) => card.key === "demo-seed")?.detail).toContain(
      DEMO_PAT_ECOSYSTEM_VERSION
    );
    expect(view.localReviewCards.find((card) => card.key === "local-review-users")?.value).toBe("5/5");
  });

  it("renders membership and billing reconciliation without exposing payment payloads", () => {
    const view = buildAdminLaunchControlView(seededSource());
    const activeRow = view.membershipDistributionRows.find((row) => row.key === "ACTIVE");
    const pastDueRow = view.membershipDistributionRows.find((row) => row.key === "PAST_DUE");

    expect(activeRow?.cells).toEqual(["ACTIVE", "0", "14", "5", "19"]);
    expect(pastDueRow?.tone).toBe("warn");
    expect(view.billingCards.find((card) => card.key === "webhook-events")?.tone).toBe("warn");

    const failedWebhookText = view.failedWebhookRows.flatMap((row) => row.cells).join(" ");
    expect(failedWebhookText).toContain("invoice.payment_failed");
    expect(failedWebhookText).toContain("fixture failure");
    expect(failedWebhookText).not.toContain("evt_sensitive_ref");
    expect(failedWebhookText).not.toMatch(/card|payment_method|payload/i);
  });

  it("handles empty and error states without throwing", () => {
    const view = buildAdminLaunchControlView(buildEmptyAdminLaunchControlSource("database unavailable"));

    expect(view.queryError).toBe("database unavailable");
    expect(view.summaryCards.every((card) => card.value === "0")).toBe(true);
    expect(view.failedWebhookRows).toEqual([
      {
        key: "no-failed-webhooks",
        cells: ["No failed webhook events", "No remediation needed", "", "", ""],
        tone: "ok",
      },
    ]);
    expect(view.releaseRows.find((row) => row.key === "release-id")?.cells[1]).toBe("unavailable");
    expect(view.demoHealth.routeReady).toBe(false);
  });

  it("adds launch control to admin navigation and only links to real remediation routes", () => {
    const adminControlPlaneSource = fs.readFileSync(
      path.join(process.cwd(), "lib/adminControlPlane.ts"),
      "utf8"
    );
    expect(adminControlPlaneSource).toContain('{ href: "/admin/launch", label: "Launch" }');

    const view = buildAdminLaunchControlView(seededSource());
    for (const link of view.remediationLinks) {
      const pagePath = path.join(process.cwd(), "app", link.href, "page.tsx");
      expect(fs.existsSync(pagePath), `${link.href} exists`).toBe(true);
    }
  });
});
