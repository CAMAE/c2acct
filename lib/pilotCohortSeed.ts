import {
  SubjectKind,
  type Company,
  type PrismaClient,
} from "@prisma/client";
import {
  JUNE_1_PILOT_COHORT,
  PILOT_COHORT_SEED_VERSION,
  type PilotOrganizationInput,
  type PilotUserInput,
} from "@/data/pilotCohort";
import { hashPilotPassword } from "@/lib/auth/passwords";

export const PILOT_SEED_TEMPORARY_PASSWORD = "PatPilotTemp123";

type PilotSeedClient = Pick<
  PrismaClient,
  "company" | "pilotCohort" | "pilotCohortMember" | "subject" | "user"
>;

type PilotCompanyRecord = Pick<Company, "id" | "name" | "type">;

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableId(prefix: string, key: string) {
  return `${prefix}-${slugify(key)}`;
}

async function ensurePilotCompany(
  client: PilotSeedClient,
  organization: PilotOrganizationInput
): Promise<PilotCompanyRecord> {
  return client.company.upsert({
    where: { id: stableId("pilot-company", organization.key) },
    update: {
      name: organization.name,
      type: organization.type,
      // Data-integrity wall (CLASS 1): pilot cohort companies are PILOT.
      dataBoundary: "PILOT",
      updatedAt: new Date(),
    },
    create: {
      id: stableId("pilot-company", organization.key),
      name: organization.name,
      type: organization.type,
      dataBoundary: "PILOT",
      updatedAt: new Date(),
    },
    select: { id: true, name: true, type: true },
  });
}

async function ensurePilotCompanySubject(client: PilotSeedClient, company: PilotCompanyRecord) {
  return client.subject.upsert({
    where: { companyId: company.id },
    update: {
      key: `company:${company.id}`,
      displayName: company.name,
      kind: SubjectKind.ORGANIZATION,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("pilot-subject-company", company.id),
      key: `company:${company.id}`,
      displayName: company.name,
      kind: SubjectKind.ORGANIZATION,
      companyId: company.id,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function ensurePilotUser(
  client: PilotSeedClient,
  user: PilotUserInput,
  companyIdsByKey: Map<string, string>
) {
  const companyId = user.companyKey ? companyIdsByKey.get(user.companyKey) ?? null : null;
  const existing = await client.user.findUnique({
    where: { email: user.email },
    select: { passwordHash: true, mustChangePassword: true },
  });
  const seedPasswordFields = existing?.passwordHash
    ? {}
    : {
        passwordHash: await hashPilotPassword(PILOT_SEED_TEMPORARY_PASSWORD),
        mustChangePassword: true,
        passwordUpdatedAt: new Date(),
      };

  return client.user.upsert({
    where: { email: user.email },
    update: {
      name: user.name,
      role: user.role,
      companyId,
      ...seedPasswordFields,
      updatedAt: new Date(),
    },
    create: {
      id: stableId("pilot-user", user.key),
      email: user.email,
      name: user.name,
      role: user.role,
      companyId,
      passwordHash: await hashPilotPassword(PILOT_SEED_TEMPORARY_PASSWORD),
      mustChangePassword: true,
      passwordUpdatedAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, email: true },
  });
}

export async function ensurePilotCohortSeed(client: PilotSeedClient) {
  const cohortInput = JUNE_1_PILOT_COHORT;
  const now = new Date();
  const cohort = await client.pilotCohort.upsert({
    where: { key: cohortInput.key },
    update: {
      name: cohortInput.name,
      dataBoundary: cohortInput.dataBoundary,
      startsAt: new Date(cohortInput.startsAt),
      ownerContactName: cohortInput.ownerContactName,
      ownerContactEmail: cohortInput.ownerContactEmail,
      supportContactName: cohortInput.supportContactName,
      supportContactEmail: cohortInput.supportContactEmail,
      notes: `${cohortInput.notes} Seed version: ${PILOT_COHORT_SEED_VERSION}.`,
      updatedAt: now,
    },
    create: {
      id: stableId("pilot-cohort", cohortInput.key),
      key: cohortInput.key,
      name: cohortInput.name,
      dataBoundary: cohortInput.dataBoundary,
      startsAt: new Date(cohortInput.startsAt),
      ownerContactName: cohortInput.ownerContactName,
      ownerContactEmail: cohortInput.ownerContactEmail,
      supportContactName: cohortInput.supportContactName,
      supportContactEmail: cohortInput.supportContactEmail,
      notes: `${cohortInput.notes} Seed version: ${PILOT_COHORT_SEED_VERSION}.`,
      updatedAt: now,
    },
    select: { id: true, key: true, name: true },
  });

  const companyIdsByKey = new Map<string, string>();
  const subjectIdsByCompanyKey = new Map<string, string>();

  for (const organization of cohortInput.organizations) {
    const company = await ensurePilotCompany(client, organization);
    const subject = await ensurePilotCompanySubject(client, company);
    companyIdsByKey.set(organization.key, company.id);
    subjectIdsByCompanyKey.set(organization.key, subject.id);

    await client.pilotCohortMember.upsert({
      where: { id: stableId("pilot-cohort-member", `${cohortInput.key}-${organization.memberKind}-${organization.key}`) },
      update: {
        dataBoundary: cohortInput.dataBoundary,
        provisioningState: organization.provisioningState,
        companyId: company.id,
        subjectId: subject.id,
        userId: null,
        inviteEmail: organization.inviteEmail,
        ownerContactName: organization.ownerContactName,
        ownerContactEmail: organization.ownerContactEmail,
        supportContactName: organization.supportContactName,
        supportContactEmail: organization.supportContactEmail,
        notes: organization.notes,
        updatedAt: now,
      },
      create: {
        id: stableId("pilot-cohort-member", `${cohortInput.key}-${organization.memberKind}-${organization.key}`),
        cohortId: cohort.id,
        memberKind: organization.memberKind,
        dataBoundary: cohortInput.dataBoundary,
        provisioningState: organization.provisioningState,
        companyId: company.id,
        subjectId: subject.id,
        inviteEmail: organization.inviteEmail,
        ownerContactName: organization.ownerContactName,
        ownerContactEmail: organization.ownerContactEmail,
        supportContactName: organization.supportContactName,
        supportContactEmail: organization.supportContactEmail,
        notes: organization.notes,
        updatedAt: now,
      },
    });
  }

  for (const userInput of cohortInput.users) {
    const user = await ensurePilotUser(client, userInput, companyIdsByKey);
    const companyId = userInput.companyKey ? companyIdsByKey.get(userInput.companyKey) ?? null : null;
    const subjectId = userInput.companyKey ? subjectIdsByCompanyKey.get(userInput.companyKey) ?? null : null;

    await client.pilotCohortMember.upsert({
      where: { id: stableId("pilot-cohort-member", `${cohortInput.key}-USER-${userInput.key}`) },
      update: {
        dataBoundary: cohortInput.dataBoundary,
        provisioningState: userInput.provisioningState,
        companyId,
        subjectId,
        userId: user.id,
        inviteEmail: userInput.inviteEmail,
        ownerContactName: userInput.ownerContactName,
        ownerContactEmail: userInput.ownerContactEmail,
        supportContactName: userInput.supportContactName,
        supportContactEmail: userInput.supportContactEmail,
        notes: userInput.notes,
        updatedAt: now,
      },
      create: {
        id: stableId("pilot-cohort-member", `${cohortInput.key}-USER-${userInput.key}`),
        cohortId: cohort.id,
        memberKind: "USER",
        dataBoundary: cohortInput.dataBoundary,
        provisioningState: userInput.provisioningState,
        companyId,
        subjectId,
        userId: user.id,
        inviteEmail: userInput.inviteEmail,
        ownerContactName: userInput.ownerContactName,
        ownerContactEmail: userInput.ownerContactEmail,
        supportContactName: userInput.supportContactName,
        supportContactEmail: userInput.supportContactEmail,
        notes: userInput.notes,
        updatedAt: now,
      },
    });
  }

  return {
    seedVersion: PILOT_COHORT_SEED_VERSION,
    cohortKey: cohort.key,
    cohortName: cohort.name,
    organizationMemberCount: cohortInput.organizations.length,
    userMemberCount: cohortInput.users.length,
    memberCount: cohortInput.organizations.length + cohortInput.users.length,
  };
}
