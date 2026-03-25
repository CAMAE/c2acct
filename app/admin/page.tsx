export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessPortalAdmin } from "@/lib/authz";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

const STATUS_MESSAGES: Record<string, string> = {
  company_created: "Organization created.",
  user_context_updated: "User access context updated.",
};

const ERROR_MESSAGES: Record<string, string> = {
  forbidden_action: "Action denied: operator privileges are required.",
  invalid_company_name: "Company name is required.",
  invalid_company_type: "Company type is invalid.",
  invalid_user_role: "User role is invalid.",
  invalid_user_selection: "Select a valid user before updating access context.",
  update_failed: "The requested operator change could not be completed.",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fadmin");
  }

  const isAdmin = canAccessPortalAdmin(sessionUser);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const actionError = getSingleParam(resolvedSearchParams?.error);
  const actionStatus = getSingleParam(resolvedSearchParams?.status);

  async function createOrganization(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/login?callbackUrl=%2Fadmin");
    }

    if (!canAccessPortalAdmin(actor)) {
      redirect("/admin?error=forbidden_action");
    }

    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();

    if (!name) {
      redirect("/admin?error=invalid_company_name");
    }

    if (type !== "FIRM" && type !== "VENDOR") {
      redirect("/admin?error=invalid_company_type");
    }

    await prisma.company.create({
      data: {
        id: crypto.randomUUID(),
        name,
        type,
        updatedAt: new Date(),
      },
    });

    redirect("/admin?status=company_created");
  }

  async function updateUserContext(formData: FormData) {
    "use server";

    const actor = await getSessionUser();
    if (!actor) {
      redirect("/login?callbackUrl=%2Fadmin");
    }

    if (!canAccessPortalAdmin(actor)) {
      redirect("/admin?error=forbidden_action");
    }

    const userId = String(formData.get("userId") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();
    const companyIdRaw = String(formData.get("companyId") ?? "").trim();
    const companyId = companyIdRaw === "__none__" ? null : companyIdRaw || null;

    if (!userId) {
      redirect("/admin?error=invalid_user_selection");
    }

    if (role !== "OWNER" && role !== "ADMIN" && role !== "MEMBER") {
      redirect("/admin?error=invalid_user_role");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        companyId,
        updatedAt: new Date(),
      },
    }).catch(() => {
      redirect("/admin?error=update_failed");
    });

    redirect("/admin?status=user_context_updated");
  }

  if (!isAdmin) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-[28px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
            Operator Console
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Operator access required
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--shell-muted)]">
            This surface is reserved for PAT operators managing organizations, access, and platform readiness. Your current account does not have operator privileges.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white" href="/platform">
              Return to workspace
            </Link>
            <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 text-sm font-semibold text-[var(--shell-ink)]" href="/">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const [
    organizations,
    users,
    modules,
    insights,
    badges,
    defaultPortal,
    demoCompany,
    usersWithoutCompany,
    companiesWithoutSubject,
    subjectsCount,
  ] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        Subject: { select: { id: true } },
        _count: {
          select: {
            User: true,
            SurveySubmission: true,
            CompanyBadge: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { email: "asc" }],
      include: {
        Company: { select: { id: true, name: true, type: true } },
        _count: { select: { SubjectMembership: true } },
      },
    }),
    prisma.surveyModule.findMany({
      orderBy: { key: "asc" },
      include: {
        _count: {
          select: {
            SurveyQuestion: true,
            BadgeRule: true,
            SurveySubmission: true,
          },
        },
      },
    }),
    prisma.insight.findMany({
      orderBy: { key: "asc" },
      include: {
        _count: {
          select: {
            InsightUnlockRule: true,
            InsightCapabilityRule: true,
          },
        },
      },
    }),
    prisma.badge.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            BadgeRule: true,
            CompanyBadge: true,
          },
        },
      },
    }),
    prisma.portal.findUnique({
      where: { key: "pat-assessment" },
      select: { id: true, key: true, active: true, title: true },
    }),
    prisma.company.findFirst({
      where: { name: "Demo Company" },
      select: { id: true, name: true },
    }),
    prisma.user.count({ where: { companyId: null } }),
    prisma.company.count({ where: { Subject: { is: null } } }),
    prisma.subject.count(),
  ]);

  const activeModules = modules.filter((module) => module.active).length;
  const modulesMissingQuestions = modules.filter((module) => module._count.SurveyQuestion === 0).length;
  const modulesMissingBadgeRules = modules.filter((module) => module._count.BadgeRule === 0).length;
  const insightsWithoutRules = insights.filter(
    (insight) => insight._count.InsightUnlockRule === 0 && insight._count.InsightCapabilityRule === 0
  ).length;

  const actionStatusMessage = actionStatus ? STATUS_MESSAGES[actionStatus] : null;
  const actionErrorMessage = actionError ? ERROR_MESSAGES[actionError] ?? actionError : null;

  return (
    <section className="space-y-8">
      <div className="rounded-[30px] border border-[var(--shell-border)] bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(25,65,79,0.95))] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">
          PAT Operator Console
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Internal controls for the live beta, without a sprawling back office.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/74">
          This console is operator-only. It exists to reduce operational confusion around organizations, user linkage, seeded readiness, and current platform health. It is not a general-purpose admin backend.
        </p>
      </div>

      {actionStatusMessage ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-sm text-emerald-900 shadow-sm">
          {actionStatusMessage}
        </div>
      ) : null}

      {actionErrorMessage ? (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 px-5 py-4 text-sm text-amber-900 shadow-sm">
          {actionErrorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Organizations"
          value={String(organizations.length)}
          detail="Companies currently registered in the PAT beta."
        />
        <MetricCard
          label="Users"
          value={String(users.length)}
          detail="Actors with role and company linkage visible to operators."
        />
        <MetricCard
          label="Active modules"
          value={String(activeModules)}
          detail="Assessment modules currently marked active."
        />
        <MetricCard
          label="Subjects"
          value={String(subjectsCount)}
          detail="PAT subjects currently available for company-backed access."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ConsolePanel
          title="Operator actions"
          description="Only the controls that reduce real confusion in the current beta are surfaced here."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <form action={createOrganization} className="grid gap-4 rounded-[22px] border border-[var(--shell-border)] bg-white/75 p-5">
              <div>
                <div className="text-sm font-semibold text-[var(--shell-ink)]">Create organization</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  Adds a new company record for firm or vendor onboarding.
                </div>
              </div>
              <input
                name="name"
                placeholder="Organization name"
                required
                className="rounded-xl border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)]"
              />
              <select
                name="type"
                defaultValue="FIRM"
                className="rounded-xl border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)]"
              >
                <option value="FIRM">Firm</option>
                <option value="VENDOR">Vendor</option>
              </select>
              <button
                type="submit"
                className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white"
              >
                Create organization
              </button>
            </form>

            <form action={updateUserContext} className="grid gap-4 rounded-[22px] border border-[var(--shell-border)] bg-white/75 p-5">
              <div>
                <div className="text-sm font-semibold text-[var(--shell-ink)]">Update user context</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  Set role and company linkage for an existing actor.
                </div>
              </div>
              <select
                name="userId"
                defaultValue=""
                className="rounded-xl border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)]"
              >
                <option value="" disabled>
                  Select user
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              <select
                name="role"
                defaultValue="MEMBER"
                className="rounded-xl border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)]"
              >
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
              <select
                name="companyId"
                defaultValue="__none__"
                className="rounded-xl border border-[var(--shell-border)] bg-white px-4 py-3 text-sm text-[var(--shell-ink)]"
              >
                <option value="__none__">No company linked</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white"
              >
                Update user context
              </button>
            </form>
          </div>
        </ConsolePanel>

        <ConsolePanel
          title="Platform readiness"
          description="Operational checks based on the current seeded runtime, not external services or hidden secrets."
        >
          <div className="grid gap-3">
            {[
              {
                label: "Default PAT portal",
                ok: Boolean(defaultPortal?.active),
                detail: defaultPortal?.title ?? "Missing pat-assessment portal seed",
              },
              {
                label: "Demo company",
                ok: Boolean(demoCompany),
                detail: demoCompany?.name ?? "Missing demo company seed",
              },
              {
                label: "Module readiness",
                ok: modulesMissingQuestions === 0 && modulesMissingBadgeRules === 0 && activeModules > 0,
                detail: `${activeModules} active module(s), ${modulesMissingQuestions} missing questions, ${modulesMissingBadgeRules} missing badge rules`,
              },
              {
                label: "Insight readiness",
                ok: insightsWithoutRules === 0,
                detail: `${insights.length} insight(s), ${insightsWithoutRules} without unlock or capability rules`,
              },
              {
                label: "Subject coverage",
                ok: companiesWithoutSubject === 0,
                detail: `${companiesWithoutSubject} compan${companiesWithoutSubject === 1 ? "y" : "ies"} without PAT subject linkage`,
              },
              {
                label: "User linkage",
                ok: usersWithoutCompany === 0,
                detail: `${usersWithoutCompany} user(s) without a linked company`,
              },
            ].map((check) => (
              <div
                key={check.label}
                className={`rounded-[18px] border px-4 py-4 ${
                  check.ok
                    ? "border-emerald-200 bg-emerald-50/80"
                    : "border-amber-200 bg-amber-50/80"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-[var(--shell-ink)]">{check.label}</div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    {check.ok ? "Ready" : "Needs attention"}
                  </div>
                </div>
                <div className="mt-2 text-sm text-[var(--shell-muted)]">{check.detail}</div>
              </div>
            ))}
          </div>
        </ConsolePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ConsolePanel
          title="Organizations"
          description="Current companies, subject linkage, and activity volume."
        >
          <div className="grid gap-4">
            {organizations.map((organization) => (
              <div
                key={organization.id}
                className="rounded-[20px] border border-[var(--shell-border)] bg-white/75 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{organization.name}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {organization.type} · Subject {organization.Subject ? "linked" : "missing"}
                    </div>
                  </div>
                  <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {organization._count.User} users
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--shell-muted)]">
                  <span>{organization._count.SurveySubmission} submissions</span>
                  <span>{organization._count.CompanyBadge} badges awarded</span>
                  <span>ID {organization.id}</span>
                </div>
              </div>
            ))}
          </div>
        </ConsolePanel>

        <ConsolePanel
          title="User linkage and role diagnostics"
          description="Operator view of current role, company, and subject-membership attachment."
        >
          <div className="grid gap-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--shell-ink)]">{user.email}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {user.role} · {user.Company ? `${user.Company.name} (${user.Company.type})` : "No company linked"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {user._count.SubjectMembership} subject memberships
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ConsolePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ConsolePanel
          title="Module and seed health"
          description="Assessment runtime readiness from the live database."
        >
          <div className="grid gap-3">
            {modules.map((module) => (
              <div key={module.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--shell-ink)]">{module.title}</div>
                    <div className="mt-1 text-sm text-[var(--shell-muted)]">
                      {module.key} · v{module.version} · {module.active ? "active" : "inactive"}
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                    {module._count.SurveySubmission} submissions
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--shell-muted)]">
                  <span>{module._count.SurveyQuestion} questions</span>
                  <span>{module._count.BadgeRule} badge rules</span>
                  <span>{module.scope}</span>
                </div>
              </div>
            ))}
          </div>
        </ConsolePanel>

        <ConsolePanel
          title="Badge and insight health"
          description="Unlock-layer readiness and current award footprint."
        >
          <div className="grid gap-3">
            {badges.map((badge) => (
              <div key={badge.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{badge.name}</div>
                <div className="mt-2 text-xs text-[var(--shell-muted)]">
                  {badge._count.BadgeRule} badge rules · {badge._count.CompanyBadge} awards
                </div>
              </div>
            ))}

            {insights.map((insight) => (
              <div key={insight.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                <div className="mt-2 text-xs text-[var(--shell-muted)]">
                  {insight._count.InsightUnlockRule} unlock rules · {insight._count.InsightCapabilityRule} capability rules
                </div>
              </div>
            ))}
          </div>
        </ConsolePanel>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">{label}</div>
      <div className="mt-3 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{value}</div>
      <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{detail}</div>
    </div>
  );
}

function ConsolePanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-[var(--shell-ink)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}
