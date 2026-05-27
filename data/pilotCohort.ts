import type {
  CompanyType,
  DataBoundary,
  PilotCohortMemberKind,
  PilotProvisioningState,
  UserRole,
} from "@prisma/client";

export const PILOT_COHORT_SEED_VERSION = "pat-june-1-pilot-cohort-v1";

export type PilotOrganizationInput = {
  key: string;
  name: string;
  type: CompanyType;
  memberKind: Extract<PilotCohortMemberKind, "VENDOR" | "FIRM">;
  inviteEmail: string;
  provisioningState: PilotProvisioningState;
  ownerContactName: string;
  ownerContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  notes: string;
};

export type PilotUserInput = {
  key: string;
  email: string;
  name: string;
  role: UserRole;
  companyKey: string | null;
  inviteEmail: string;
  provisioningState: PilotProvisioningState;
  ownerContactName: string;
  ownerContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  notes: string;
};

export type PilotCohortInput = {
  key: string;
  name: string;
  dataBoundary: DataBoundary;
  startsAt: string;
  ownerContactName: string;
  ownerContactEmail: string;
  supportContactName: string;
  supportContactEmail: string;
  notes: string;
  organizations: PilotOrganizationInput[];
  users: PilotUserInput[];
};

export const JUNE_1_PILOT_COHORT: PilotCohortInput = {
  key: "june-1-pilot-2026",
  name: "June 1 Pilot Cohort",
  dataBoundary: "PILOT",
  startsAt: "2026-06-01T00:00:00.000Z",
  ownerContactName: "Pilot Operations",
  ownerContactEmail: "pilot.ops@pat.local",
  supportContactName: "PAT Support",
  supportContactEmail: "support@pat.local",
  notes:
    "Deterministic pilot provisioning fixture. These records are excluded from demo-health metrics and are not public-live customer proof.",
  organizations: [
    {
      key: "northstar-tax-systems",
      name: "Northstar Tax Systems Pilot",
      type: "VENDOR",
      memberKind: "VENDOR",
      inviteEmail: "pilot.vendor.owner@northstar-tax.example",
      provisioningState: "PROVISIONING",
      ownerContactName: "Mara Chen",
      ownerContactEmail: "mara.chen@northstar-tax.example",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Vendor pilot candidate for product evidence workflow validation.",
    },
    {
      key: "ledgerwise-automation",
      name: "LedgerWise Automation Pilot",
      type: "VENDOR",
      memberKind: "VENDOR",
      inviteEmail: "pilot.vendor.owner@ledgerwise.example",
      provisioningState: "INVITED",
      ownerContactName: "Devin Shah",
      ownerContactEmail: "devin.shah@ledgerwise.example",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Vendor pilot candidate pending signed intake confirmation.",
    },
    {
      key: "horizon-advisory-group",
      name: "Horizon Advisory Group Pilot",
      type: "FIRM",
      memberKind: "FIRM",
      inviteEmail: "pilot.firm.owner@horizon-advisory.example",
      provisioningState: "ACTIVE",
      ownerContactName: "Priya Mendez",
      ownerContactEmail: "priya.mendez@horizon-advisory.example",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Firm pilot candidate for alignment and firm-product assessment review.",
    },
    {
      key: "summit-cpa-collective",
      name: "Summit CPA Collective Pilot",
      type: "FIRM",
      memberKind: "FIRM",
      inviteEmail: "pilot.firm.owner@summit-cpa.example",
      provisioningState: "PROVISIONING",
      ownerContactName: "Jon Bell",
      ownerContactEmail: "jon.bell@summit-cpa.example",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Firm pilot candidate waiting on user roster confirmation.",
    },
  ],
  users: [
    {
      key: "northstar-owner",
      email: "mara.chen@northstar-tax.example",
      name: "Mara Chen",
      role: "MEMBER",
      companyKey: "northstar-tax-systems",
      inviteEmail: "mara.chen@northstar-tax.example",
      provisioningState: "PROVISIONING",
      ownerContactName: "Pilot Operations",
      ownerContactEmail: "pilot.ops@pat.local",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Vendor owner account for June 1 pilot provisioning.",
    },
    {
      key: "horizon-owner",
      email: "priya.mendez@horizon-advisory.example",
      name: "Priya Mendez",
      role: "OWNER",
      companyKey: "horizon-advisory-group",
      inviteEmail: "priya.mendez@horizon-advisory.example",
      provisioningState: "ACTIVE",
      ownerContactName: "Pilot Operations",
      ownerContactEmail: "pilot.ops@pat.local",
      supportContactName: "PAT Pilot Support",
      supportContactEmail: "pilot.support@pat.local",
      notes: "Firm owner account for June 1 pilot readiness tracking.",
    },
    {
      key: "pilot-support-operator",
      email: "pilot.support.operator@pat.local",
      name: "Pilot Support Operator",
      role: "ADMIN",
      companyKey: null,
      inviteEmail: "pilot.support.operator@pat.local",
      provisioningState: "ACTIVE",
      ownerContactName: "Pilot Operations",
      ownerContactEmail: "pilot.ops@pat.local",
      supportContactName: "PAT Support",
      supportContactEmail: "support@pat.local",
      notes: "Internal support account for pilot cohort tracking. Not customer proof.",
    },
  ],
};

export function getPilotCohortMinimums() {
  return {
    cohortCount: 1,
    organizationMemberCount: JUNE_1_PILOT_COHORT.organizations.length,
    userMemberCount: JUNE_1_PILOT_COHORT.users.length,
    vendorMemberCount: JUNE_1_PILOT_COHORT.organizations.filter(
      (organization) => organization.memberKind === "VENDOR"
    ).length,
    firmMemberCount: JUNE_1_PILOT_COHORT.organizations.filter(
      (organization) => organization.memberKind === "FIRM"
    ).length,
    memberCount: JUNE_1_PILOT_COHORT.organizations.length + JUNE_1_PILOT_COHORT.users.length,
  };
}
