import { SubjectKind, type CompanyType } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { SessionUser as AuthSessionUser } from "@/lib/auth/session";
import { ensureUserPatScaffold, getUserPatContext } from "@/lib/userPat";

export type MembershipAudience = "vendor" | "firm" | "individual";

export type MembershipResolvedContext = {
  audience: MembershipAudience;
  subjectId: string | null;
  subjectKind: SubjectKind | null;
  companyId: string | null;
  companyType: CompanyType | null;
  displayName: string;
  compatibilityMode: "native" | "virtual-free";
};

async function ensureCompanySubject(input: {
  companyId: string;
  companyName: string;
}) {
  return prisma.subject.upsert({
    where: { companyId: input.companyId },
    update: {
      displayName: input.companyName,
      kind: SubjectKind.ORGANIZATION,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `company:${input.companyId}`,
      displayName: input.companyName,
      kind: SubjectKind.ORGANIZATION,
      companyId: input.companyId,
      updatedAt: new Date(),
    },
    select: { id: true, kind: true, displayName: true, companyId: true },
  });
}

export async function resolveMembershipContext(
  sessionUser: AuthSessionUser,
  audience: MembershipAudience
): Promise<MembershipResolvedContext> {
  if (audience === "individual") {
    await ensureUserPatScaffold();
    const userPatContext = await getUserPatContext(sessionUser);

    if (userPatContext.personSubjectId) {
      return {
        audience,
        subjectId: userPatContext.personSubjectId,
        subjectKind: SubjectKind.PERSON,
        companyId: sessionUser.companyId,
        companyType: null,
        displayName: sessionUser.email,
        compatibilityMode: "native",
      };
    }

    return {
      audience,
      subjectId: null,
      subjectKind: null,
      companyId: sessionUser.companyId,
      companyType: null,
      displayName: sessionUser.email,
      compatibilityMode: "virtual-free",
    };
  }

  if (!sessionUser.companyId) {
    return {
      audience,
      subjectId: null,
      subjectKind: null,
      companyId: null,
      companyType: null,
      displayName: audience === "vendor" ? "Vendor" : "Firm",
      compatibilityMode: "virtual-free",
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, name: true, type: true },
  });

  if (!company) {
    return {
      audience,
      subjectId: null,
      subjectKind: null,
      companyId: sessionUser.companyId,
      companyType: null,
      displayName: audience === "vendor" ? "Vendor" : "Firm",
      compatibilityMode: "virtual-free",
    };
  }

  const subject = await ensureCompanySubject({
    companyId: company.id,
    companyName: company.name,
  });

  return {
    audience,
    subjectId: subject.id,
    subjectKind: subject.kind,
    companyId: company.id,
    companyType: company.type,
    displayName: company.name,
    compatibilityMode: "native",
  };
}
