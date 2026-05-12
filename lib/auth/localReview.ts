import { randomUUID } from "crypto";
import {
  CompanyType,
  SubjectKind,
  SubjectMembershipRole,
  type PrismaClient,
  type UserRole,
} from "@prisma/client";
import { hashPassword } from "@/lib/auth/passwords";

export const LOCAL_REVIEW_AUTH_FLAG_ENV = "PAT_ENABLE_LOCAL_REVIEW_AUTH";
export const LOCAL_REVIEW_PASSWORD_ENV = "PAT_LOCAL_REVIEW_PASSWORD";
export const BOOTSTRAP_DEFAULT_PASSWORD_ENV = "PAT_BOOTSTRAP_DEFAULT_PASSWORD";
export const PRODUCTION_BOOTSTRAP_USERS_FLAG_ENV = "PAT_ENABLE_BOOTSTRAP_USERS";
export const LOCAL_REVIEW_FIRM_COMPANY_NAME = "Demo Company";
export const LOCAL_REVIEW_VENDOR_COMPANY_NAME = "PAT Demo Vendor";
export const PRODUCTION_BOOTSTRAP_FIRM_COMPANY_NAME = "PAT Bootstrap Firm";
export const PRODUCTION_BOOTSTRAP_VENDOR_COMPANY_NAME = "PAT Bootstrap Vendor";

export type LocalReviewKey = "vendor" | "firm" | "individual" | "admin";

export type LocalReviewUserDefinition = {
  key: LocalReviewKey;
  label: string;
  email: string;
  role: UserRole;
  companyType: CompanyType | null;
  companyName: string | null;
  redirectTo: string;
};

type SeedUserDefinition = {
  key: LocalReviewKey;
  label: string;
  email: string;
  role: UserRole;
  companyName: string | null;
};

type ProductionBootstrapUserDefinition = {
  key: LocalReviewKey;
  label: string;
  emailEnvName: string;
  role: UserRole;
  companyType: CompanyType | null;
  companyName: string | null;
};

export type SeedUserSummary = {
  seedClass: "local_review" | "production_bootstrap";
  seeded: boolean;
  reason: string;
  userEmails: string[];
};

export type LocalReviewSeedGate = {
  enabled: boolean;
  mode: "disabled" | "local_review" | "test";
  reason: string;
  password: string | null;
};

export const LOCAL_REVIEW_USERS: LocalReviewUserDefinition[] = [
  {
    key: "vendor",
    label: "Vendor review",
    email: "review.vendor@pat.local",
    role: "MEMBER",
    companyType: CompanyType.VENDOR,
    companyName: LOCAL_REVIEW_VENDOR_COMPANY_NAME,
    redirectTo: "/vendor",
  },
  {
    key: "firm",
    label: "Firm review",
    email: "review.firm@pat.local",
    role: "OWNER",
    companyType: CompanyType.FIRM,
    companyName: LOCAL_REVIEW_FIRM_COMPANY_NAME,
    redirectTo: "/firm",
  },
  {
    key: "individual",
    label: "Individual review",
    email: "review.individual@pat.local",
    role: "MEMBER",
    companyType: null,
    companyName: null,
    redirectTo: "/user",
  },
  {
    key: "admin",
    label: "Admin/operator review",
    email: "review.admin@pat.local",
    role: "ADMIN",
    companyType: CompanyType.FIRM,
    companyName: LOCAL_REVIEW_FIRM_COMPANY_NAME,
    redirectTo: "/admin",
  },
] as const;

const PRODUCTION_BOOTSTRAP_USERS: ProductionBootstrapUserDefinition[] = [
  {
    key: "vendor",
    label: "Vendor bootstrap",
    emailEnvName: "PAT_BOOTSTRAP_VENDOR_EMAIL",
    role: "MEMBER",
    companyType: CompanyType.VENDOR,
    companyName: PRODUCTION_BOOTSTRAP_VENDOR_COMPANY_NAME,
  },
  {
    key: "firm",
    label: "Firm bootstrap",
    emailEnvName: "PAT_BOOTSTRAP_FIRM_EMAIL",
    role: "OWNER",
    companyType: CompanyType.FIRM,
    companyName: PRODUCTION_BOOTSTRAP_FIRM_COMPANY_NAME,
  },
  {
    key: "individual",
    label: "Individual bootstrap",
    emailEnvName: "PAT_BOOTSTRAP_INDIVIDUAL_EMAIL",
    role: "MEMBER",
    companyType: null,
    companyName: null,
  },
  {
    key: "admin",
    label: "Admin bootstrap",
    emailEnvName: "PAT_BOOTSTRAP_ADMIN_EMAIL",
    role: "ADMIN",
    companyType: CompanyType.FIRM,
    companyName: PRODUCTION_BOOTSTRAP_FIRM_COMPANY_NAME,
  },
] as const;

type PrismaSeedClient = Pick<PrismaClient, "company" | "user" | "subject" | "subjectMembership">;

function normalizeEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function cleanEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function isLocalReviewAuthRequested() {
  return process.env.NODE_ENV !== "production" && process.env[LOCAL_REVIEW_AUTH_FLAG_ENV] === "1";
}

export function getLocalReviewSeedGate(): LocalReviewSeedGate {
  if (process.env.NODE_ENV === "production") {
    return {
      enabled: false,
      mode: "disabled",
      reason: "local review seeding is disabled in production",
      password: null,
    };
  }

  const localReviewPassword = cleanEnv(process.env[LOCAL_REVIEW_PASSWORD_ENV]);

  if (process.env.NODE_ENV === "test") {
    return {
      enabled: true,
      mode: "test",
      reason: "test-only deterministic local review seeding is enabled",
      password: localReviewPassword ?? "pat-local-review",
    };
  }

  if (!isLocalReviewAuthRequested()) {
    return {
      enabled: false,
      mode: "disabled",
      reason: `set ${LOCAL_REVIEW_AUTH_FLAG_ENV}=1 outside production to seed deterministic local review users`,
      password: null,
    };
  }

  if (!localReviewPassword) {
    return {
      enabled: false,
      mode: "local_review",
      reason: `${LOCAL_REVIEW_PASSWORD_ENV} is required when ${LOCAL_REVIEW_AUTH_FLAG_ENV}=1`,
      password: null,
    };
  }

  return {
    enabled: true,
    mode: "local_review",
    reason: `explicit local review seeding enabled via ${LOCAL_REVIEW_AUTH_FLAG_ENV}=1`,
    password: localReviewPassword,
  };
}

function getBootstrapPasswordEnvName(key: LocalReviewKey) {
  if (key === "vendor") return "PAT_BOOTSTRAP_VENDOR_PASSWORD";
  if (key === "firm") return "PAT_BOOTSTRAP_FIRM_PASSWORD";
  if (key === "individual") return "PAT_BOOTSTRAP_INDIVIDUAL_PASSWORD";
  return "PAT_BOOTSTRAP_ADMIN_PASSWORD";
}

export function getBootstrapPasswordForUser(key: LocalReviewKey) {
  const roleSpecific = cleanEnv(process.env[getBootstrapPasswordEnvName(key)]);
  if (roleSpecific) {
    return roleSpecific;
  }

  const sharedBootstrap = cleanEnv(process.env[BOOTSTRAP_DEFAULT_PASSWORD_ENV]);
  if (sharedBootstrap) {
    return sharedBootstrap;
  }

  return null;
}

export function shouldSeedLocalReviewUsers() {
  return getLocalReviewSeedGate().enabled;
}

export function shouldSeedProductionBootstrapUsers() {
  return process.env[PRODUCTION_BOOTSTRAP_USERS_FLAG_ENV] === "1";
}

export function getConfiguredProductionBootstrapEmails() {
  return PRODUCTION_BOOTSTRAP_USERS.flatMap((entry) => {
    const email = cleanEnv(process.env[entry.emailEnvName]);
    return email ? [{ key: entry.key, email }] : [];
  });
}

export function getLegacyLocalReviewCleanupGuidance() {
  return [
    'Inspect legacy review users: SELECT "email" FROM "User" WHERE "email" LIKE \'review.%@pat.local\';',
    'Delete legacy review users only after inspection: DELETE FROM "User" WHERE "email" LIKE \'review.%@pat.local\';',
    `Review legacy demo companies before removal: ${LOCAL_REVIEW_FIRM_COMPANY_NAME}, ${LOCAL_REVIEW_VENDOR_COMPANY_NAME}.`,
  ];
}

export function findLocalReviewUserByEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  return LOCAL_REVIEW_USERS.find((entry) => entry.email === normalized) ?? null;
}

export function getLocalReviewUsersForUi() {
  return LOCAL_REVIEW_USERS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    email: entry.email,
    redirectTo: entry.redirectTo,
  }));
}

async function ensureCompany(
  prisma: PrismaSeedClient,
  input: {
    name: string;
    type: CompanyType;
  }
) {
  const existing = await prisma.company.findFirst({
    where: { name: input.name },
    select: { id: true },
  });

  if (existing) {
    await prisma.company.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        updatedAt: new Date(),
      },
    });

    return { id: existing.id };
  }

  return prisma.company.create({
    data: {
      id: randomUUID(),
      name: input.name,
      type: input.type,
      updatedAt: new Date(),
    },
    select: { id: true },
  });
}

async function ensurePersonSubjectMembership(
  prisma: PrismaSeedClient,
  input: {
    userId: string;
    email: string;
  }
) {
  const subject = await prisma.subject.upsert({
    where: { key: `person:${input.userId}` },
    update: {
      displayName: input.email,
      kind: SubjectKind.PERSON,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      key: `person:${input.userId}`,
      displayName: input.email,
      kind: SubjectKind.PERSON,
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.subjectMembership.upsert({
    where: {
      subjectId_userId: {
        subjectId: subject.id,
        userId: input.userId,
      },
    },
    update: {
      membershipRole: SubjectMembershipRole.MEMBER,
      active: true,
      isPrimary: true,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: subject.id,
      userId: input.userId,
      membershipRole: SubjectMembershipRole.MEMBER,
      active: true,
      isPrimary: true,
      updatedAt: new Date(),
    },
  });
}

async function ensureCompanies(
  prisma: PrismaSeedClient,
  companies: Array<{ name: string; type: CompanyType }>
) {
  const companyIdsByName = new Map<string, string>();

  for (const company of companies) {
    if (companyIdsByName.has(company.name)) {
      continue;
    }

    const resolved = await ensureCompany(prisma, company);
    companyIdsByName.set(company.name, resolved.id);
  }

  return companyIdsByName;
}

async function ensureSeedUserRecord(
  prisma: PrismaSeedClient,
  input: {
    entry: SeedUserDefinition;
    companyIdsByName: Map<string, string>;
    password: string | null;
  }
) {
  const companyId = input.entry.companyName ? input.companyIdsByName.get(input.entry.companyName) ?? null : null;
  const passwordHash = input.password ? await hashPassword(input.password) : null;
  const user = await prisma.user.upsert({
    where: { email: input.entry.email },
    update: {
      name: input.entry.label,
      role: input.entry.role,
      companyId,
      passwordHash,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      email: input.entry.email,
      name: input.entry.label,
      role: input.entry.role,
      companyId,
      passwordHash,
      updatedAt: new Date(),
    },
    select: { id: true, email: true },
  });

  if (input.entry.key === "individual") {
    await ensurePersonSubjectMembership(prisma, {
      userId: user.id,
      email: user.email,
    });
  }

  return user;
}

export async function ensureLocalReviewUserByEmail(
  prisma: PrismaSeedClient,
  email: string | null | undefined
) {
  const entry = findLocalReviewUserByEmail(email);
  const gate = getLocalReviewSeedGate();

  if (!entry || !gate.enabled) {
    return null;
  }

  const companyIdsByName = await ensureCompanies(prisma, [
    { name: LOCAL_REVIEW_FIRM_COMPANY_NAME, type: CompanyType.FIRM },
    { name: LOCAL_REVIEW_VENDOR_COMPANY_NAME, type: CompanyType.VENDOR },
  ]);

  return ensureSeedUserRecord(prisma, {
    entry,
    companyIdsByName,
    password: gate.password,
  });
}

export async function ensureLocalReviewUsers(prisma: PrismaSeedClient): Promise<SeedUserSummary> {
  const gate = getLocalReviewSeedGate();

  if (!gate.enabled) {
    return {
      seedClass: "local_review",
      seeded: false,
      reason: gate.reason,
      userEmails: [],
    };
  }

  const companyIdsByName = await ensureCompanies(prisma, [
    { name: LOCAL_REVIEW_FIRM_COMPANY_NAME, type: CompanyType.FIRM },
    { name: LOCAL_REVIEW_VENDOR_COMPANY_NAME, type: CompanyType.VENDOR },
  ]);

  const userEmails: string[] = [];

  for (const entry of LOCAL_REVIEW_USERS) {
    const user = await ensureSeedUserRecord(prisma, {
      entry,
      companyIdsByName,
      password: gate.password,
    });
    userEmails.push(user.email);
  }

  return {
    seedClass: "local_review",
    seeded: true,
    reason: gate.reason,
    userEmails,
  };
}

export async function ensureProductionBootstrapUsers(
  prisma: PrismaSeedClient
): Promise<SeedUserSummary> {
  if (!shouldSeedProductionBootstrapUsers()) {
    return {
      seedClass: "production_bootstrap",
      seeded: false,
      reason: `set ${PRODUCTION_BOOTSTRAP_USERS_FLAG_ENV}=1 to seed explicit production bootstrap users`,
      userEmails: [],
    };
  }

  const configuredEntries = PRODUCTION_BOOTSTRAP_USERS.flatMap((entry) => {
    const email = cleanEnv(process.env[entry.emailEnvName]);
    return email ? [{ ...entry, email }] : [];
  });

  if (configuredEntries.length === 0) {
    return {
      seedClass: "production_bootstrap",
      seeded: false,
      reason: "no PAT_BOOTSTRAP_*_EMAIL values are configured",
      userEmails: [],
    };
  }

  const companyIdsByName = await ensureCompanies(
    prisma,
    configuredEntries.flatMap((entry) =>
      entry.companyName && entry.companyType ? [{ name: entry.companyName, type: entry.companyType }] : []
    )
  );

  const userEmails: string[] = [];

  for (const entry of configuredEntries) {
    const bootstrapPassword = getBootstrapPasswordForUser(entry.key);
    if (!bootstrapPassword) {
      throw new Error(
        `Missing bootstrap password for ${entry.key}. Set ${BOOTSTRAP_DEFAULT_PASSWORD_ENV} or ${getBootstrapPasswordEnvName(entry.key)}.`
      );
    }

    const user = await ensureSeedUserRecord(prisma, {
      entry,
      companyIdsByName,
      password: bootstrapPassword,
    });
    userEmails.push(user.email);
  }

  return {
    seedClass: "production_bootstrap",
    seeded: true,
    reason: `explicit production bootstrap seeding enabled via ${PRODUCTION_BOOTSTRAP_USERS_FLAG_ENV}=1`,
    userEmails,
  };
}
