import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/authz";

const ADMIN_NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export type AdminSearchFilter =
  | "all"
  | "company"
  | "firm"
  | "vendor"
  | "product"
  | "user"
  | "audit";

export type AdminSearchResult = {
  type: "company" | "product" | "user" | "audit";
  id: string;
  label: string;
  subLabel: string;
  href: string;
  evidence: string;
  score: number;
};

export type AdminExceptionItem = {
  id: string;
  category: "db-health" | "audit-event" | "rate-limit" | "invite-code";
  title: string;
  severity: "INFO" | "WARN" | "ERROR";
  status: "OPEN" | "PARTIAL";
  summary: string;
  createdAt: string;
  href: string;
  supportedActions: string[];
};

function normalizeSeverity(value: string): "INFO" | "WARN" | "ERROR" {
  if (value === "ERROR" || value === "WARN") {
    return value;
  }

  return "INFO";
}

function normalizeQuery(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function scoreMatch(haystack: string, query: string) {
  const source = haystack.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 0;
  if (source === needle) return 100;
  if (source.startsWith(needle)) return 80;
  if (source.includes(needle)) return 50;
  return 0;
}

export function getAdminNoStoreHeaders() {
  return ADMIN_NO_STORE_HEADERS;
}

export async function requirePlatformAdminPage(callbackUrl: string): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (!isPlatformAdmin(sessionUser)) {
    redirect("/");
  }
  return sessionUser;
}

export async function requirePlatformAdminApi() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  if (!isPlatformAdmin(sessionUser)) {
    return { ok: false as const, status: 403 as const, error: "Platform admin required" };
  }
  return { ok: true as const, sessionUser };
}

export async function getAdminOverview() {
  const [firmCount, vendorCount, productCount, userCount, activeInviteCodeCount, openExceptionCount, recentEvents] =
    await Promise.all([
      prisma.company.count({ where: { type: "FIRM" } }),
      prisma.company.count({ where: { type: "VENDOR" } }),
      prisma.product.count(),
      prisma.user.count(),
      prisma.inviteCode.count({ where: { status: "ACTIVE" } }),
      prisma.auditEvent.count({
        where: {
          OR: [{ severity: { in: ["WARN", "ERROR"] } }, { outcome: "BLOCKED" }],
        },
      }),
      prisma.auditEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          eventKey: true,
          eventCategory: true,
          severity: true,
          outcome: true,
          requestPath: true,
          createdAt: true,
        },
      }),
    ]);

  let dbHealth: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
  } catch {
    dbHealth = "error";
  }

  return {
    firmCount,
    vendorCount,
    productCount,
    userCount,
    activeInviteCodeCount,
    openExceptionCount,
    dbHealth,
    recentEvents,
  };
}

export async function searchAdminEntities(input?: {
  query?: string | null;
  filter?: AdminSearchFilter;
  limit?: number;
}) {
  const query = normalizeQuery(input?.query);
  const filter = input?.filter ?? "all";
  const limit = Math.max(1, Math.min(input?.limit ?? 20, 50));

  if (!query) {
    return [] as AdminSearchResult[];
  }

  const wantsCompanies = filter === "all" || filter === "company" || filter === "firm" || filter === "vendor";
  const wantsProducts = filter === "all" || filter === "product";
  const wantsUsers = filter === "all" || filter === "user";
  const wantsAudit = filter === "all" || filter === "audit";

  const [companies, products, users, auditEvents] = await Promise.all([
    wantsCompanies
      ? prisma.company.findMany({
          where: {
            AND: [
              filter === "firm" ? { type: "FIRM" } : {},
              filter === "vendor" ? { type: "VENDOR" } : {},
              { name: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: { id: true, name: true, type: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    wantsProducts
      ? prisma.product.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          take: limit,
          select: { id: true, name: true, companyId: true, Company: { select: { name: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    wantsUsers
      ? prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: { id: true, email: true, name: true, platformRole: true },
          orderBy: { email: "asc" },
        })
      : Promise.resolve([]),
    wantsAudit
      ? prisma.auditEvent.findMany({
          where: {
            OR: [
              { eventKey: { contains: query, mode: "insensitive" } },
              { requestPath: { contains: query, mode: "insensitive" } },
              { outcome: { contains: query, mode: "insensitive" } },
            ],
          },
          take: limit,
          select: { id: true, eventKey: true, eventCategory: true, severity: true, outcome: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const results: AdminSearchResult[] = [
    ...companies.map((company) => ({
      type: "company" as const,
      id: company.id,
      label: company.name,
      subLabel: `${company.type} company`,
      href: company.type === "FIRM" ? `/admin/firms?q=${encodeURIComponent(company.name)}` : `/admin/vendors?q=${encodeURIComponent(company.name)}`,
      evidence: `Company record ${company.id}`,
      score: scoreMatch(`${company.name} ${company.type}`, query),
    })),
    ...products.map((product) => ({
      type: "product" as const,
      id: product.id,
      label: product.name,
      subLabel: `Product | ${product.Company.name}`,
      href: `/products/${encodeURIComponent(product.id)}/intelligence`,
      evidence: `Product owned by ${product.Company.name}`,
      score: scoreMatch(`${product.name} ${product.Company.name}`, query),
    })),
    ...users.map((user) => ({
      type: "user" as const,
      id: user.id,
      label: user.name?.trim() || user.email,
      subLabel: `User | ${user.email}`,
      href: `/admin/users?q=${encodeURIComponent(user.email)}`,
      evidence: `Platform role ${user.platformRole}`,
      score: Math.max(scoreMatch(user.email, query), scoreMatch(user.name ?? "", query)),
    })),
    ...auditEvents.map((event) => ({
      type: "audit" as const,
      id: event.id,
      label: event.eventKey,
      subLabel: `Audit | ${event.severity} | ${event.outcome}`,
      href: `/admin/exceptions?q=${encodeURIComponent(event.eventKey)}`,
      evidence: `Audit event ${event.eventCategory} at ${event.createdAt.toISOString()}`,
      score: Math.max(scoreMatch(event.eventKey, query), scoreMatch(event.outcome, query)),
    })),
  ]
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, limit);

  return results;
}

export async function getAdminExceptions(input?: { limit?: number; query?: string | null }) {
  const limit = Math.max(1, Math.min(input?.limit ?? 25, 100));
  const query = normalizeQuery(input?.query).toLowerCase();

  let dbIssue: AdminExceptionItem[] = [];
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
  } catch {
    dbIssue = [
      {
        id: "db-health",
        category: "db-health",
        title: "Database health check failing",
        severity: "ERROR",
        status: "OPEN",
        summary: "The platform health query failed. Operator action should start with the DB health route and deployment environment review.",
        createdAt: new Date().toISOString(),
        href: "/api/health/db",
        supportedActions: ["inspect", "retry health check"],
      },
    ];
  }

  const [auditEvents, hotBuckets, stressedInviteCodes] = await Promise.all([
    prisma.auditEvent.findMany({
      where: {
        OR: [{ severity: { in: ["WARN", "ERROR"] } }, { outcome: "BLOCKED" }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        eventKey: true,
        severity: true,
        outcome: true,
        eventCategory: true,
        requestPath: true,
        createdAt: true,
      },
    }),
    prisma.apiRateLimitBucket.findMany({
      where: {
        requestCount: { gte: 3 },
      },
      orderBy: [{ updatedAt: "desc" }, { requestCount: "desc" }],
      take: Math.min(limit, 10),
      select: {
        id: true,
        bucketKey: true,
        requestCount: true,
        updatedAt: true,
      },
    }),
    prisma.inviteCode.findMany({
      where: {
        OR: [
          { status: { in: ["EXPIRED", "EXHAUSTED", "REVOKED"] } },
          { claimCount: { gte: 1 } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 10),
      select: {
        id: true,
        status: true,
        claimCount: true,
        maxClaims: true,
        updatedAt: true,
        vendorCompany: { select: { name: true } },
      },
    }),
  ]);

  const exceptionItems: AdminExceptionItem[] = [
    ...dbIssue,
    ...auditEvents.map((event) => ({
      id: event.id,
      category: "audit-event" as const,
      title: event.eventKey,
      severity: normalizeSeverity(event.severity),
      status: "OPEN" as const,
      summary: `${event.eventCategory} | ${event.outcome} | ${event.requestPath ?? "no route captured"}`,
      createdAt: event.createdAt.toISOString(),
      href: `/admin/search?q=${encodeURIComponent(event.eventKey)}&type=audit`,
      supportedActions: ["inspect", "open related search"],
    })),
    ...hotBuckets.map((bucket) => ({
      id: bucket.id,
      category: "rate-limit" as const,
      title: "Hot rate-limit bucket",
      severity: bucket.requestCount >= 10 ? ("ERROR" as const) : ("WARN" as const),
      status: "PARTIAL" as const,
      summary: `${bucket.bucketKey} reached ${bucket.requestCount} requests in the current window.`,
      createdAt: bucket.updatedAt.toISOString(),
      href: `/admin/exceptions?q=${encodeURIComponent(bucket.bucketKey)}`,
      supportedActions: ["inspect", "review source route"],
    })),
    ...stressedInviteCodes.map((inviteCode) => ({
      id: inviteCode.id,
      category: "invite-code" as const,
      title: `Invite code ${inviteCode.status.toLowerCase()}`,
      severity:
        inviteCode.status === "REVOKED"
          ? ("WARN" as const)
          : inviteCode.status === "EXHAUSTED"
            ? ("INFO" as const)
            : ("WARN" as const),
      status: "PARTIAL" as const,
      summary: `${inviteCode.vendorCompany.name} | ${inviteCode.claimCount}/${inviteCode.maxClaims} claims`,
      createdAt: inviteCode.updatedAt.toISOString(),
      href: `/admin/vendors?q=${encodeURIComponent(inviteCode.vendorCompany.name)}`,
      supportedActions: ["inspect vendor", "review invite policy"],
    })),
  ];

  return exceptionItems
    .filter((item) =>
      !query
        ? true
        : `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(query)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

export async function listAdminCompanies(input: { type: "FIRM" | "VENDOR"; query?: string | null }) {
  const query = normalizeQuery(input.query);
  const pattern = query ? `%${query}%` : null;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      membershipCount: number;
      productCount: number;
    }>
  >(Prisma.sql`
    SELECT
      c."id",
      c."name",
      COALESCE(cm.membership_count, 0)::int AS "membershipCount",
      COALESCE(p.product_count, 0)::int AS "productCount"
    FROM "Company" c
    LEFT JOIN (
      SELECT "companyId", COUNT(*)::int AS membership_count
      FROM "CompanyMembership"
      GROUP BY "companyId"
    ) cm ON cm."companyId" = c."id"
    LEFT JOIN (
      SELECT "companyId", COUNT(*)::int AS product_count
      FROM "Product"
      GROUP BY "companyId"
    ) p ON p."companyId" = c."id"
    WHERE c."type" = ${input.type}
      ${pattern ? Prisma.sql`AND c."name" ILIKE ${pattern}` : Prisma.empty}
    ORDER BY c."name" ASC
    LIMIT 100
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    _count: {
      CompanyMembership: row.membershipCount,
      Product: row.productCount,
    },
  }));
}

export async function listAdminProducts(query?: string | null) {
  const normalized = normalizeQuery(query);
  return prisma.product.findMany({
    where: normalized ? { name: { contains: normalized, mode: "insensitive" } } : {},
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      companyId: true,
      Company: { select: { name: true, type: true } },
    },
  });
}

export async function listAdminUsers(query?: string | null) {
  const normalized = normalizeQuery(query);
  return prisma.user.findMany({
    where: normalized
      ? {
          OR: [
            { email: { contains: normalized, mode: "insensitive" } },
            { name: { contains: normalized, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { email: "asc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      platformRole: true,
      companyId: true,
    },
  });
}
