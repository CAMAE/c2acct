import { randomUUID } from "crypto";
import {
  CompanyType,
  SubjectKind,
  SubjectMembershipRole,
  type PrismaClient,
  type UserRole,
} from "@prisma/client";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";

export const LOCAL_REVIEW_AUTH_FLAG_ENV = "PAT_ENABLE_LOCAL_REVIEW_AUTH";
export const LOCAL_REVIEW_PASSWORD_ENV = "PAT_LOCAL_REVIEW_PASSWORD";
export const LOCAL_REVIEW_FIRM_COMPANY_NAME = "Demo Company";
export const LOCAL_REVIEW_VENDOR_COMPANY_NAME = "PAT Demo Vendor";
export const LOCAL_REVIEW_ORIGIN_ENV_KEYS = [
  "AUTH_URL",
  "NEXTAUTH_URL",
  "PAT_LOCAL_ORIGIN",
  "MAC_MINI_PUBLIC_ORIGIN",
  "NEXT_PUBLIC_APP_URL",
  "PAT_PUBLIC_BASE_URL",
] as const;

export type LocalReviewKey = "vendor" | "firm" | "individual" | "admin" | "consultant";

export type LocalReviewUserDefinition = {
  key: LocalReviewKey;
  label: string;
  email: string;
  role: UserRole;
  companyType: CompanyType | null;
  companyName: string | null;
  redirectTo: string;
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
    // A platform operator is COMPANY-LESS (13a audience model: "company binding
    // wins over the ADMIN role"). A firm-bound ADMIN is a firm admin and is
    // correctly routed to /firm, so the operator fixture must carry no company or
    // the /admin control plane is unreachable (audienceHomeFor → /firm).
    key: "admin",
    label: "Admin/operator review",
    email: "review.admin@pat.local",
    role: "ADMIN",
    companyType: null,
    companyName: null,
    redirectTo: "/admin",
  },
  {
    key: "consultant",
    label: "Consultant review",
    email: "review.consultant@pat.local",
    role: "MEMBER",
    companyType: null,
    companyName: null,
    redirectTo: "/consultants",
  },
] as const;

type LocalReviewSeedSummary = {
  seeded: boolean;
  userEmails: string[];
};

type PrismaSeedClient = Pick<PrismaClient, "company" | "user" | "subject" | "subjectMembership">;

export type LocalReviewAuthPolicy = {
  flagEnabled: boolean;
  nodeEnv: string;
  productionLike: boolean;
  origins: Array<{
    envName: string;
    origin: string;
    loopback: boolean;
  }>;
  publicOrigins: string[];
  runtimeAllowed: boolean;
  credentialsProviderAvailable: boolean;
  seedAllowed: boolean;
  reason: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function slugifyLocalReviewName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getLocalReviewCompanyId(input: {
  name: string;
  type: CompanyType;
}) {
  return `demo-${input.type === CompanyType.VENDOR ? "vendor" : "firm"}-company-${slugifyLocalReviewName(input.name)}`;
}

function isLoopbackOrigin(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function normalizeOrigin(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/$/, "") : null;
}

export function getLocalReviewAuthPolicy(env: NodeJS.ProcessEnv = process.env): LocalReviewAuthPolicy {
  const nodeEnv = env.NODE_ENV || "development";
  const flagEnabled = env[LOCAL_REVIEW_AUTH_FLAG_ENV] === "1";
  const origins = LOCAL_REVIEW_ORIGIN_ENV_KEYS.flatMap((envName) => {
    const origin = normalizeOrigin(env[envName]);
    return origin
      ? [{
          envName,
          origin,
          loopback: isLoopbackOrigin(origin),
        }]
      : [];
  });
  const publicOrigins = origins.filter((origin) => !origin.loopback).map((origin) => `${origin.envName}=${origin.origin}`);
  const productionLike = nodeEnv === "production" || publicOrigins.length > 0;
  const hasLoopbackOrigin = origins.some((origin) => origin.loopback);
  const localNonProductionWithoutOrigin = nodeEnv !== "production" && origins.length === 0;
  const loopbackOnly = publicOrigins.length === 0 && (hasLoopbackOrigin || localNonProductionWithoutOrigin);
  const runtimeAllowed = loopbackOnly;
  const credentialsProviderAvailable = flagEnabled && runtimeAllowed;
  const seedAllowed = nodeEnv !== "production"
    ? runtimeAllowed
    : flagEnabled && runtimeAllowed && hasLoopbackOrigin;
  const reason = !flagEnabled
    ? "local-review-flag-disabled"
    : !runtimeAllowed
      ? publicOrigins.length > 0
        ? `non-loopback-origin:${publicOrigins.join(",")}`
        : "loopback-origin-required"
      : null;

  return {
    flagEnabled,
    nodeEnv,
    productionLike,
    origins,
    publicOrigins,
    runtimeAllowed,
    credentialsProviderAvailable,
    seedAllowed,
    reason,
  };
}

export function isLocalReviewRuntimeAllowed(env: NodeJS.ProcessEnv = process.env) {
  return getLocalReviewAuthPolicy(env).runtimeAllowed;
}

export function isLocalReviewAuthRequested(env: NodeJS.ProcessEnv = process.env) {
  return getLocalReviewAuthPolicy(env).credentialsProviderAvailable;
}

export function shouldSeedLocalReviewUsers(env: NodeJS.ProcessEnv = process.env) {
  return getLocalReviewAuthPolicy(env).seedAllowed;
}

export function isLocalReviewEmail(email: string | null | undefined) {
  return Boolean(findLocalReviewUserByEmail(email));
}

export function canUseLocalReviewEmail(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env) {
  if (!isLocalReviewEmail(email)) {
    return true;
  }

  return isLocalReviewAuthRequested(env);
}

/**
 * AUDIT-D19-001 (Day-20 Block 2A): pattern-match for per-run unique
 * consultant identities that `e2e/local-review-auth.spec.ts:386` creates
 * for the admin-create-and-assignment test. The pattern is narrowly
 * scoped to the `+admincreate-` suffix so canonical demo-bench consultants
 * (`review.consultant+sentinel@pat.local`, `review.consultant+bridgepath@pat.local`)
 * keep going through their existing pilot-password-hash path
 * (auth.config.ts pilotUser fallback) and aren't reclassified as
 * local-review users.
 *
 * The pattern accepts emails the e2e suite generates per-run, e.g.:
 *   review.consultant+admincreate-1778615432-abcdef@pat.local
 *
 * Suffix character class is `[a-z0-9.-]` to match the e2e test's
 * `Date.now()` + `Math.random().toString(36)` outputs without permitting
 * characters that would slip past `normalizeEmail`'s `.trim().toLowerCase()`.
 * Length cap of 64 keeps the match bounded so this doesn't accidentally
 * grow into a general escape hatch.
 *
 * Locked in by `tests/local-review-pattern.test.ts`.
 */
const LOCAL_REVIEW_CONSULTANT_ADMINCREATE_PATTERN =
  /^review\.consultant\+admincreate-[a-z0-9.-]{1,64}@pat\.local$/;

export function findLocalReviewUserByEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  const exact = LOCAL_REVIEW_USERS.find((entry) => entry.email === normalized);
  if (exact) {
    return exact;
  }

  if (LOCAL_REVIEW_CONSULTANT_ADMINCREATE_PATTERN.test(normalized)) {
    const canonical = LOCAL_REVIEW_USERS.find((entry) => entry.key === "consultant");
    if (canonical) {
      return { ...canonical, email: normalized };
    }
  }

  return null;
}

export function getLocalReviewUsersForUi(env: NodeJS.ProcessEnv = process.env) {
  return LOCAL_REVIEW_USERS.filter((entry) => entry.key !== "individual" || isIndividualSurfacesEnabled(env)).map((entry) => ({
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
      id: getLocalReviewCompanyId(input),
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

async function ensureLocalReviewCompanies(prisma: PrismaSeedClient) {
  const companyIdsByName = new Map<string, string>();

  for (const company of [
    { name: LOCAL_REVIEW_FIRM_COMPANY_NAME, type: CompanyType.FIRM },
    { name: LOCAL_REVIEW_VENDOR_COMPANY_NAME, type: CompanyType.VENDOR },
  ]) {
    const resolved = await ensureCompany(prisma, company);
    companyIdsByName.set(company.name, resolved.id);
  }

  return companyIdsByName;
}

async function ensureLocalReviewUserRecord(
  prisma: PrismaSeedClient,
  input: {
    entry: LocalReviewUserDefinition;
    companyIdsByName: Map<string, string>;
  }
) {
  const companyId = input.entry.companyName ? input.companyIdsByName.get(input.entry.companyName) ?? null : null;
  const user = await prisma.user.upsert({
    where: { email: input.entry.email },
    update: {
      name: input.entry.label,
      role: input.entry.role,
      companyId,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      email: input.entry.email,
      name: input.entry.label,
      role: input.entry.role,
      companyId,
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

  if (!entry || !shouldSeedLocalReviewUsers()) {
    return null;
  }

  const companyIdsByName = await ensureLocalReviewCompanies(prisma);
  return ensureLocalReviewUserRecord(prisma, { entry, companyIdsByName });
}

export async function ensureLocalReviewUsers(prisma: PrismaSeedClient): Promise<LocalReviewSeedSummary> {
  if (!shouldSeedLocalReviewUsers()) {
    return {
      seeded: false,
      userEmails: [],
    };
  }

  const companyIdsByName = await ensureLocalReviewCompanies(prisma);

  const userEmails: string[] = [];

  for (const entry of LOCAL_REVIEW_USERS) {
    const user = await ensureLocalReviewUserRecord(prisma, { entry, companyIdsByName });

    userEmails.push(user.email);
  }

  return {
    seeded: true,
    userEmails,
  };
}
