import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deriveVendorProductAssessmentCompletionStatus } from "@/lib/vendorPat";
import { accountingCompanyContext } from "@/lib/verticals/companyBoundary";

/**
 * vendor-hub-reader box (2026-10-12). Production after deploy night 1 showed the
 * Meridian vendor hub with 0 finals and 0 firm reviews while the Review refresh
 * card counted 97 for the same vendor.
 *   1. Root cause: the completion derivation re-validated every stored final
 *      against the bank this build carries (2026-08-product-utility-v3) by
 *      question id; finals written under 2026-03-product-utility-v2 carry v2 ids,
 *      so every id read as unknown and every pre-bump final as incomplete. The
 *      derivation now judges a final against the bank it was submitted under.
 *   2. Two readers (R60): the hub summed the completed-product catalog, the refresh
 *      board counted raw submissions. Both now read lib/vendorFirmReviewVotes,
 *      the latest FINAL per (firm, product) through lib/assessmentCore.
 * The pure part always runs; the two-readers assertion runs against the database
 * when one is reachable (the local docker db or DATABASE_URL), otherwise skips.
 */
const ROOT = path.resolve(__dirname, "..");
const registry = accountingCompanyContext().registry!;
const CURRENT = registry.versionId;
const PRE_BUMP = "2026-03-product-utility-v2";

const profile = {
  productName: "Meridian Portal",
  productDescription: "Client portal for requests and documents.",
  logoReference: "meridian-portal",
  positioning: "Mid-market practice portal.",
  targetCustomer: "Multi-office CPA firms.",
  targetUseContext: "Client collaboration.",
  implementationStyle: "Guided rollout.",
  operatingModelFit: "Centralized intake.",
  primaryBuyer: "Managing partner.",
  integrationPosture: "Open API.",
};

function responsesFor(version: string, count: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let index = 0; index < count; index += 1) out[`${version}__client_collaboration_portal_requests__portal_data_and_document_alignment__facet_${index}`] = 3;
  return out;
}
function openEndedFor(version: string, count: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (let index = 0; index < count; index += 1) out[`${version}__open_${index}`] = "A written answer.";
  return out;
}
function submission(answers: Record<string, unknown>, answeredCount: number) {
  return { id: "final-1", score: 86, createdAt: new Date("2026-04-27T17:00:00.000Z"), answeredCount, answers };
}

describe("vendor final completion — judged against the bank it was submitted under", () => {
  it("a complete final under the pre-bump bank, which this build no longer carries, is completed", () => {
    const status = deriveVendorProductAssessmentCompletionStatus({
      registry,
      latestSubmission: submission(
        { registryVersion: PRE_BUMP, utilitySelection: ["client_collaboration_portal_requests", "document_capture_management_esignature"], responses: responsesFor(PRE_BUMP, 40), openEndedResponses: openEndedFor(PRE_BUMP, 10), profile },
        40
      ),
    });
    expect(status.completed).toBe(true);
    expect(status.scoredQuestionCount).toBe(40);
    expect(status.openEndedQuestionCount).toBe(10);
    expect(status.utilityKeys).toEqual(["client_collaboration_portal_requests", "document_capture_management_esignature"]);
    expect(status.reason).toContain(PRE_BUMP);
  });

  it("a pre-bump final whose answered count disagrees with its stored responses is still incomplete", () => {
    const status = deriveVendorProductAssessmentCompletionStatus({
      registry,
      latestSubmission: submission(
        { registryVersion: PRE_BUMP, utilitySelection: ["client_collaboration_portal_requests"], responses: responsesFor(PRE_BUMP, 20), openEndedResponses: openEndedFor(PRE_BUMP, 5), profile },
        19
      ),
    });
    expect(status.completed).toBe(false);
  });

  it("a pre-bump final with an empty open-ended answer is incomplete", () => {
    const status = deriveVendorProductAssessmentCompletionStatus({
      registry,
      latestSubmission: submission(
        { registryVersion: PRE_BUMP, utilitySelection: ["client_collaboration_portal_requests"], responses: responsesFor(PRE_BUMP, 20), openEndedResponses: { ...openEndedFor(PRE_BUMP, 4), [`${PRE_BUMP}__open_4`]: "  " }, profile },
        20
      ),
    });
    expect(status.completed).toBe(false);
  });

  it("a current-bank final is still validated against the current bank, id by id (unchanged behaviour)", () => {
    const status = deriveVendorProductAssessmentCompletionStatus({
      registry,
      latestSubmission: submission(
        { registryVersion: CURRENT, utilitySelection: ["client_collaboration_portal_requests"], responses: responsesFor(CURRENT, 20), openEndedResponses: openEndedFor(CURRENT, 5), profile },
        20
      ),
    });
    // the ids above are made up, so under the current bank they are unknown and the final is incomplete
    expect(status.completed).toBe(false);
  });

  it("the hub and the refresh board read the one shared reader (source pin)", () => {
    const dashboard = readFileSync(path.join(ROOT, "lib/vendorWorkspaceDashboard.ts"), "utf8");
    const refresh = readFileSync(path.join(ROOT, "lib/vendorRefresh.ts"), "utf8");
    const shared = readFileSync(path.join(ROOT, "lib/vendorFirmReviewVotes.ts"), "utf8");
    expect(dashboard).toContain('from "@/lib/vendorFirmReviewVotes"');
    expect(refresh).toContain('from "@/lib/vendorFirmReviewVotes"');
    expect(shared).toContain('latestFinalPerFirm');
    expect(dashboard).not.toMatch(/\.catch\(\(\) => \[\] as VendorProductInsightSnapshot\[\]\)/);
  });
});

function resolveDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    const line = env.split("\n").find((entry) => entry.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
  } catch {
    // no local env file
  }
  return null;
}
const databaseUrl = resolveDatabaseUrl();
if (databaseUrl && !process.env.DATABASE_URL) process.env.DATABASE_URL = databaseUrl;
const dbReady = await (async () => {
  if (!databaseUrl) return false;
  try {
    const { default: prisma } = await import("@/lib/prisma");
    await Promise.race([prisma.$queryRaw`SELECT 1`, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000))]);
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!dbReady)("two readers, one vendor — the hub count and the refresh count agree", () => {
  it(
    "for every DEMO vendor with reviews on file, dashboard.firmReviewsOnFile equals refresh summary.reviews equals the shared reader total",
    async () => {
      const { default: prisma } = await import("@/lib/prisma");
      const { getVendorWorkspaceDashboard } = await import("@/lib/vendorWorkspaceDashboard");
      const { getVendorRefreshBoard } = await import("@/lib/vendorRefresh");
      const { getVendorFirmReviewVotes } = await import("@/lib/vendorFirmReviewVotes");
      const vendors = await prisma.company.findMany({
        where: { type: "VENDOR", dataBoundary: "DEMO", deletedAt: null, id: { contains: "demo-expand-vendor" } },
        select: { id: true, name: true },
        orderBy: { id: "asc" },
        take: 4,
      });
      expect(vendors.length).toBeGreaterThan(0);
      let withReviews = 0;
      for (const vendor of vendors) {
        const [dashboard, board, votes] = await Promise.all([
          getVendorWorkspaceDashboard(vendor.id, null),
          getVendorRefreshBoard(vendor.id),
          getVendorFirmReviewVotes(vendor.id),
        ]);
        expect({ vendor: vendor.name, hub: dashboard.firmReviewsOnFile, refresh: board.summary.reviews }).toEqual({ vendor: vendor.name, hub: votes.total, refresh: votes.total });
        expect(dashboard.catalogError).toBeNull();
        if (votes.total > 0) withReviews += 1;
      }
      expect(withReviews).toBeGreaterThan(0);
    },
    60_000
  );
});
