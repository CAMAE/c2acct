import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for lib/patAssistant/consent.ts (Elite Sprint Block A). Prisma and
 * the audit log are mocked at the module boundary — no DB. Proves Pat is
 * opt-out by default, that revoke flips it off, and that every change writes an
 * operator audit row.
 */

vi.mock("@/lib/prisma", () => ({
  default: { aiAssistantConsent: { findUnique: vi.fn(), upsert: vi.fn() } },
}));
vi.mock("@/lib/operatorAudit", () => ({ recordOperatorAuditEvent: vi.fn() }));

import prisma from "@/lib/prisma";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";
import {
  getConsent,
  hasPatConsent,
  setConsent,
  PAT_CONSENT_VERSION,
} from "@/lib/patAssistant/consent";

const findUnique = vi.mocked(prisma.aiAssistantConsent.findUnique);
const upsert = vi.mocked(prisma.aiAssistantConsent.upsert);
const audit = vi.mocked(recordOperatorAuditEvent);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Pat consent — opt-out by default", () => {
  it("returns opted-out when no row exists", async () => {
    findUnique.mockResolvedValue(null);
    const state = await getConsent("u1");
    expect(state.optedIn).toBe(false);
    expect(state.consentVersion).toBeNull();
    expect(await hasPatConsent("u1")).toBe(false);
  });

  it("an empty userId is opted-out without touching the database", async () => {
    const state = await getConsent("");
    expect(state.optedIn).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("reflects an existing opted-in row", async () => {
    findUnique.mockResolvedValue({
      id: "c1",
      userId: "u1",
      optedIn: true,
      consentVersion: PAT_CONSENT_VERSION,
      grantedAt: new Date("2026-07-07T00:00:00Z"),
      revokedAt: null,
      createdAt: new Date("2026-07-07T00:00:00Z"),
      updatedAt: new Date("2026-07-07T00:00:00Z"),
    });
    expect(await hasPatConsent("u1")).toBe(true);
  });
});

describe("Pat consent — grant / revoke write an audit row", () => {
  it("grant sets optedIn + version and audits pat-consent-grant", async () => {
    upsert.mockResolvedValue({
      id: "c1",
      userId: "u1",
      optedIn: true,
      consentVersion: PAT_CONSENT_VERSION,
      grantedAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const state = await setConsent("u1", true);
    expect(state.optedIn).toBe(true);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1" } }));
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pat-consent-grant", actorUserId: "u1", entityId: "u1" })
    );
  });

  it("revoke hides Pat (optedIn false) and audits pat-consent-revoke", async () => {
    upsert.mockResolvedValue({
      id: "c1",
      userId: "u1",
      optedIn: false,
      consentVersion: PAT_CONSENT_VERSION,
      grantedAt: new Date(),
      revokedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const state = await setConsent("u1", false);
    expect(state.optedIn).toBe(false);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pat-consent-revoke", actorUserId: "u1" })
    );
  });
});
