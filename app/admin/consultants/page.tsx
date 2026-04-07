import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import {
  createConsultantAction,
  deactivateConsultantAction,
  removeConsultantAssignmentAction,
  upsertConsultantAssignmentAction,
} from "@/app/admin/actions";
import {
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
import {
  CONSULTANT_ACCESS_FLAG_ENV,
  isConsultantAccessEnabled,
} from "@/lib/consultantAccess";

export const dynamic = "force-dynamic";

export default async function AdminConsultantsPage() {
  if (!isConsultantAccessEnabled()) {
    return (
      <div className="space-y-8">
        <AdminPageIntro
          title="Consultants"
          description="Consultant access is currently disabled by default because the active PAT implementation is still company-scoped and remains behind an explicit proof gate until end-to-end validation is complete."
        />

        <AdminPanel
          title="Consultant access gate"
          description="This admin surface stays hidden in routine local and release runtime until consultant proof is intentionally enabled."
        >
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900">
            Set <code>{CONSULTANT_ACCESS_FLAG_ENV}=1</code> only in a proof environment where consultant create, assignment, allowed access, and denied access are being validated end to end.
          </div>
        </AdminPanel>
      </div>
    );
  }

  const firmCompanies = await prisma.company.findMany({
    where: { type: "FIRM" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  let consultantProfiles: Array<{
    id: string;
    active: boolean;
    createdAt: Date;
    User: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      Company: { id: string; name: string; type: string } | null;
    };
    ConsultantAssignment: Array<{
      id: string;
      companyId: string;
      active: boolean;
      Company: { id: string; name: string };
    }>;
  }> = [];
  let compatibilityMode = false;

  try {
    consultantProfiles = await prisma.consultantProfile.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        active: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            Company: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        ConsultantAssignment: {
          where: { active: true },
          orderBy: { Company: { name: "asc" } },
          select: {
            id: true,
            companyId: true,
            active: true,
            Company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (matchesPrismaMissingSchemaTarget(error, ["consultantprofile", "consultantassignment"])) {
      compatibilityMode = true;
      warnPrismaCompatibilityOnce(
        "consultant-admin-missing",
        "Consultant admin tables are missing locally. Apply the latest Prisma migrations before using consultant management."
      );
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Consultants"
        description="Add consultant profiles and assign firm-company briefing scope. Consultant access is intentionally company-scoped today because PAT derives ecosystem context inside each firm briefing rather than from a separate persisted ecosystem model."
      />

      {compatibilityMode ? (
        <AdminPanel
          title="Consultant schema required"
          description="This admin surface is additive, but it depends on the latest Prisma migration."
        >
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900">
            The current database is missing the consultant access tables. Run the latest Prisma migrations and regenerate the client before adding consultants or company assignments.
          </div>
        </AdminPanel>
      ) : (
        <>
          <AdminPanel
            title="Add consultant"
            description="Creating a consultant profile does not create a separate credentials plane or change PAT audience roles. It adds company-scoped consultant briefing access on top of the existing user account."
          >
            <form action={createConsultantAction} className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto]">
              <input type="hidden" name="returnTo" value="/admin/consultants" />
              <input
                name="email"
                type="email"
                required
                placeholder="consultant@company.com"
                className="pat-input"
              />
              <input
                name="name"
                type="text"
                placeholder="Consultant name"
                className="pat-input"
              />
              <button type="submit" className="pat-button-primary">
                Add consultant
              </button>
            </form>
          </AdminPanel>

          <AdminPanel
            title="Consultant roster"
            description="Assignments control which firm-company briefings a consultant can open. Unassigned firm briefings remain inaccessible because the consultant routes check company scope directly."
          >
            <div className="grid gap-4">
              {consultantProfiles.length === 0 ? (
                <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
                  No consultant profiles have been added yet.
                </div>
              ) : (
                consultantProfiles.map((consultant) => (
                  <div
                    key={consultant.id}
                    className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold text-[var(--shell-ink)]">
                          {consultant.User.name?.trim() || consultant.User.email}
                        </div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          {consultant.User.email} · {consultant.active ? "Active consultant" : "Inactive consultant"} · {consultant.ConsultantAssignment.length} assigned firm{consultant.ConsultantAssignment.length === 1 ? "" : "s"}
                        </div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          PAT account role {consultant.User.role}
                          {consultant.User.Company
                            ? ` · linked company ${consultant.User.Company.name} (${consultant.User.Company.type})`
                            : " · no PAT company linked"}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
                        Added {consultant.createdAt.toLocaleDateString()}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                      <div className="grid gap-3 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                        <div className="text-sm font-semibold text-[var(--shell-ink)]">
                          Assign firm scope
                        </div>
                        <form
                          action={upsertConsultantAssignmentAction}
                          className="grid gap-3 md:grid-cols-[1fr_auto]"
                        >
                          <input type="hidden" name="consultantProfileId" value={consultant.id} />
                          <input type="hidden" name="returnTo" value="/admin/consultants" />
                          <select name="companyId" defaultValue="" className="pat-select" required>
                            <option value="" disabled>
                              Select a firm company
                            </option>
                            {firmCompanies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="pat-button-secondary">
                            Assign firm
                          </button>
                        </form>
                        <div className="text-xs leading-5 text-[var(--shell-muted)]">
                          Current consultant scope is company-based. Ecosystem context still comes from the assigned firm briefing itself.
                        </div>
                      </div>

                      <div className="grid gap-3 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                        <div className="text-sm font-semibold text-[var(--shell-ink)]">
                          Active firm assignments
                        </div>
                        {consultant.ConsultantAssignment.length === 0 ? (
                          <div className="text-sm leading-6 text-[var(--shell-muted)]">
                            No firm scope assigned yet.
                          </div>
                        ) : (
                          consultant.ConsultantAssignment.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="rounded-[16px] border border-[var(--shell-border)] bg-white/80 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-[var(--shell-ink)]">
                                    {assignment.Company.name}
                                  </div>
                                  <div className="mt-1 text-xs text-[var(--shell-muted)]">
                                    Consultant route: {`/consultants/briefings/${assignment.companyId}`}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Link
                                    href={`/admin/briefings/${assignment.companyId}`}
                                    className="pat-button-secondary"
                                  >
                                    Open admin briefing
                                  </Link>
                                  <form action={removeConsultantAssignmentAction}>
                                    <input type="hidden" name="assignmentId" value={assignment.id} />
                                    <input type="hidden" name="returnTo" value="/admin/consultants" />
                                    <button type="submit" className="pat-button-secondary">
                                      Remove
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <form action={deactivateConsultantAction}>
                        <input type="hidden" name="consultantProfileId" value={consultant.id} />
                        <input type="hidden" name="returnTo" value="/admin/consultants" />
                        <button type="submit" className="pat-button-secondary">
                          Remove consultant access
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminPanel>
        </>
      )}
    </div>
  );
}
