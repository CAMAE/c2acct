import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureCompanySubjectMembership } from "@/lib/auth/localReview";

/**
 * MC follow-on box (Part A item 4): company-bound local-review identities get an
 * ORGANIZATION subject membership, or the assessment routes refuse them with
 * "requires a company-backed subject" and the reviewer cannot submit a module.
 */
const ROOT = path.resolve(__dirname, "..");
const localReview = readFileSync(path.join(ROOT, "lib/auth/localReview.ts"), "utf8");

type Call = { model: string; op: string; args: unknown };

function fakePrisma(calls: Call[]) {
  const record = (model: string, op: string, result: unknown) => async (args: unknown) => {
    calls.push({ model, op, args });
    return result;
  };
  return {
    subject: { upsert: record("subject", "upsert", { id: "subject-org-1" }) },
    subjectMembership: {
      updateMany: record("subjectMembership", "updateMany", { count: 1 }),
      upsert: record("subjectMembership", "upsert", { id: "membership-1" }),
    },
  } as unknown as Parameters<typeof ensureCompanySubjectMembership>[0];
}

describe("ensureCompanySubjectMembership", () => {
  it("upserts the company's ORGANIZATION subject by companyId with the preview-setup key shape", async () => {
    const calls: Call[] = [];
    const subject = await ensureCompanySubjectMembership(fakePrisma(calls), {
      userId: "user-firm",
      companyId: "company-firm",
      companyName: "Local Review Firm",
    });
    expect(subject).toEqual({ id: "subject-org-1" });
    const upsert = calls.find((c) => c.model === "subject") as Call & { args: { where: unknown; create: Record<string, unknown> } };
    expect(upsert.args.where).toEqual({ companyId: "company-firm" });
    expect(upsert.args.create).toMatchObject({ key: "company:company-firm", kind: "ORGANIZATION", companyId: "company-firm", displayName: "Local Review Firm" });
  });

  it("makes the organization membership PRIMARY and demotes the user's other primary memberships", async () => {
    const calls: Call[] = [];
    await ensureCompanySubjectMembership(fakePrisma(calls), { userId: "user-firm", companyId: "company-firm", companyName: "Local Review Firm" });
    const ops = calls.map((c) => `${c.model}.${c.op}`);
    expect(ops).toEqual(["subject.upsert", "subjectMembership.updateMany", "subjectMembership.upsert"]);
    const demote = calls[1].args as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(demote.where).toMatchObject({ userId: "user-firm", subjectId: { not: "subject-org-1" }, isPrimary: true });
    expect(demote.data).toMatchObject({ isPrimary: false });
    const membership = calls[2].args as { where: unknown; create: Record<string, unknown>; update: Record<string, unknown> };
    expect(membership.where).toEqual({ subjectId_userId: { subjectId: "subject-org-1", userId: "user-firm" } });
    expect(membership.create).toMatchObject({ subjectId: "subject-org-1", userId: "user-firm", active: true, isPrimary: true, membershipRole: "MEMBER" });
    expect(membership.update).toMatchObject({ active: true, isPrimary: true });
  });

  it("the seed calls it for every company-bound review identity (firm and vendor), not for company-less ones", () => {
    expect(localReview).toMatch(/if \(companyId && input\.entry\.companyName\) \{\s*await ensureCompanySubjectMembership\(prisma, \{/);
    // The person-subject path for the individual identity is untouched.
    expect(localReview).toMatch(/if \(input\.entry\.key === "individual"\) \{\s*await ensurePersonSubjectMembership\(/);
  });
});
