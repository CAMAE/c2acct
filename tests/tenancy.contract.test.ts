import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertEcosystemPair,
  getFirmScopedVendors,
  getTenancyMode,
  getVendorScopedFirms,
  TENANCY_MODE_ENV,
} from "@/lib/tenancy";

const {
  ecosystemFindUniqueMock,
  ecosystemFirmFindUniqueMock,
  companyFindUniqueMock,
  companyFindManyMock,
} = vi.hoisted(() => ({
  ecosystemFindUniqueMock: vi.fn(),
  ecosystemFirmFindUniqueMock: vi.fn(),
  companyFindUniqueMock: vi.fn(),
  companyFindManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    ecosystem: { findUnique: ecosystemFindUniqueMock },
    ecosystemFirm: { findUnique: ecosystemFirmFindUniqueMock },
    company: {
      findUnique: companyFindUniqueMock,
      findMany: companyFindManyMock,
    },
  },
}));

describe("lib/tenancy", () => {
  beforeEach(() => {
    ecosystemFindUniqueMock.mockReset();
    ecosystemFirmFindUniqueMock.mockReset();
    companyFindUniqueMock.mockReset();
    companyFindManyMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getTenancyMode", () => {
    it("returns 'ecosystem-bounded' when env unset", () => {
      vi.stubEnv(TENANCY_MODE_ENV, "");
      expect(getTenancyMode()).toBe("ecosystem-bounded");
    });

    it("returns 'open' when env is exactly 'open'", () => {
      vi.stubEnv(TENANCY_MODE_ENV, "open");
      expect(getTenancyMode()).toBe("open");
    });

    it("falls back to 'ecosystem-bounded' for any unrecognized value (defensive default)", () => {
      vi.stubEnv(TENANCY_MODE_ENV, "wide-open");
      expect(getTenancyMode()).toBe("ecosystem-bounded");
    });
  });

  describe("getVendorScopedFirms", () => {
    it("bounded mode returns only same-ecosystem firms", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFindUniqueMock.mockResolvedValue({
        EcosystemFirm: [
          { firmCompanyId: "firm_1" },
          { firmCompanyId: "firm_2" },
        ],
      });

      const result = await getVendorScopedFirms("vendor_1");

      expect(ecosystemFindUniqueMock).toHaveBeenCalledWith({
        where: { vendorCompanyId: "vendor_1" },
        select: {
          EcosystemFirm: {
            select: { firmCompanyId: true },
          },
        },
      });
      expect(result).toEqual(["firm_1", "firm_2"]);
      expect(companyFindManyMock).not.toHaveBeenCalled();
    });

    it("bounded mode returns empty array when vendor has no ecosystem", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFindUniqueMock.mockResolvedValue(null);

      const result = await getVendorScopedFirms("vendor_unbound");

      expect(result).toEqual([]);
    });

    it("open mode returns all FIRM-type companies", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "open");
      companyFindManyMock.mockResolvedValue([
        { id: "firm_a" },
        { id: "firm_b" },
        { id: "firm_c" },
      ]);

      const result = await getVendorScopedFirms("vendor_irrelevant");

      expect(companyFindManyMock).toHaveBeenCalledWith({
        where: { type: "FIRM" },
        select: { id: true },
      });
      expect(result).toEqual(["firm_a", "firm_b", "firm_c"]);
      expect(ecosystemFindUniqueMock).not.toHaveBeenCalled();
    });
  });

  describe("getFirmScopedVendors", () => {
    it("bounded mode returns the singleton ecosystem vendor (or empty)", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFirmFindUniqueMock.mockResolvedValue({
        Ecosystem: { vendorCompanyId: "vendor_1" },
      });

      expect(await getFirmScopedVendors("firm_1")).toEqual(["vendor_1"]);

      ecosystemFirmFindUniqueMock.mockResolvedValueOnce({
        Ecosystem: { vendorCompanyId: null },
      });
      expect(await getFirmScopedVendors("firm_unpaired")).toEqual([]);

      ecosystemFirmFindUniqueMock.mockResolvedValueOnce(null);
      expect(await getFirmScopedVendors("firm_no_ecosystem")).toEqual([]);
    });

    it("open mode returns all VENDOR-type companies", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "open");
      companyFindManyMock.mockResolvedValue([{ id: "v_a" }, { id: "v_b" }]);

      const result = await getFirmScopedVendors("firm_irrelevant");

      expect(companyFindManyMock).toHaveBeenCalledWith({
        where: { type: "VENDOR" },
        select: { id: true },
      });
      expect(result).toEqual(["v_a", "v_b"]);
    });
  });

  describe("assertEcosystemPair", () => {
    it("bounded: true when firm belongs to vendor's ecosystem", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFirmFindUniqueMock.mockResolvedValue({
        Ecosystem: { vendorCompanyId: "vendor_1" },
      });

      expect(await assertEcosystemPair("vendor_1", "firm_1")).toBe(true);
    });

    it("bounded: false for cross-ecosystem pairs", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFirmFindUniqueMock.mockResolvedValue({
        Ecosystem: { vendorCompanyId: "vendor_OTHER" },
      });

      expect(await assertEcosystemPair("vendor_1", "firm_1")).toBe(false);
    });

    it("bounded: false when firm has no ecosystem", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "ecosystem-bounded");
      ecosystemFirmFindUniqueMock.mockResolvedValue(null);

      expect(await assertEcosystemPair("vendor_1", "firm_orphan")).toBe(false);
    });

    it("open mode: true when types check out (no ecosystem lookup)", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "open");
      companyFindUniqueMock.mockResolvedValueOnce({ type: "VENDOR" });
      companyFindUniqueMock.mockResolvedValueOnce({ type: "FIRM" });

      expect(await assertEcosystemPair("vendor_1", "firm_1")).toBe(true);
      expect(ecosystemFirmFindUniqueMock).not.toHaveBeenCalled();
    });

    it("open mode: false when type sanity check fails", async () => {
      vi.stubEnv(TENANCY_MODE_ENV, "open");
      companyFindUniqueMock.mockResolvedValueOnce({ type: "FIRM" }); // wrong type for vendor slot
      companyFindUniqueMock.mockResolvedValueOnce({ type: "FIRM" });

      expect(await assertEcosystemPair("not_a_vendor", "firm_1")).toBe(false);
    });
  });
});
