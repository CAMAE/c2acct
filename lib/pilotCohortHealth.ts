import type {
  DataBoundary,
  PilotCohortMemberKind,
  PilotProvisioningState,
} from "@prisma/client";
import {
  JUNE_1_PILOT_COHORT,
  PILOT_COHORT_SEED_VERSION,
  getPilotCohortMinimums,
} from "@/data/pilotCohort";
import prisma from "@/lib/prisma";

export type PilotCohortHealthRow = {
  key: string;
  name: string;
  dataBoundary: DataBoundary;
  startsAt: string | null;
  ownerContact: string;
  supportContact: string;
  memberCount: number;
  vendorMemberCount: number;
  firmMemberCount: number;
  userMemberCount: number;
  invitedCount: number;
  provisioningCount: number;
  activeCount: number;
  blockedCount: number;
  archivedCount: number;
};

export type PilotCohortHealth = {
  ok: boolean;
  error: string | null;
  seedVersion: string;
  expectedJune1CohortKey: string;
  cohortCount: number;
  memberCount: number;
  vendorMemberCount: number;
  firmMemberCount: number;
  userMemberCount: number;
  pilotBoundaryMemberCount: number;
  demoBoundaryMemberCount: number;
  productionBoundaryMemberCount: number;
  invitedCount: number;
  provisioningCount: number;
  activeCount: number;
  blockedCount: number;
  archivedCount: number;
  june1PilotReady: boolean;
  rows: PilotCohortHealthRow[];
};

const MEMBER_KINDS: PilotCohortMemberKind[] = ["VENDOR", "FIRM", "USER"];
const DATA_BOUNDARIES: DataBoundary[] = ["DEMO", "PILOT", "PRODUCTION"];
const PROVISIONING_STATES: PilotProvisioningState[] = [
  "INVITED",
  "PROVISIONING",
  "ACTIVE",
  "BLOCKED",
  "ARCHIVED",
];

export function emptyPilotCohortHealth(error: string): PilotCohortHealth {
  return {
    ok: false,
    error,
    seedVersion: PILOT_COHORT_SEED_VERSION,
    expectedJune1CohortKey: JUNE_1_PILOT_COHORT.key,
    cohortCount: 0,
    memberCount: 0,
    vendorMemberCount: 0,
    firmMemberCount: 0,
    userMemberCount: 0,
    pilotBoundaryMemberCount: 0,
    demoBoundaryMemberCount: 0,
    productionBoundaryMemberCount: 0,
    invitedCount: 0,
    provisioningCount: 0,
    activeCount: 0,
    blockedCount: 0,
    archivedCount: 0,
    june1PilotReady: false,
    rows: [],
  };
}

function countByValue<T extends string>(values: T[], value: T) {
  return values.filter((candidate) => candidate === value).length;
}

function contactLabel(name: string | null, email: string | null) {
  if (name && email) {
    return `${name} <${email}>`;
  }

  return name ?? email ?? "Unassigned";
}

export async function getPilotCohortHealth(): Promise<PilotCohortHealth> {
  try {
    const cohorts = await prisma.pilotCohort.findMany({
      orderBy: [{ startsAt: "asc" }, { name: "asc" }],
      include: {
        PilotCohortMember: {
          select: {
            memberKind: true,
            dataBoundary: true,
            provisioningState: true,
          },
        },
      },
    });

    const allMembers = cohorts.flatMap((cohort) => cohort.PilotCohortMember);
    const memberKinds = allMembers.map((member) => member.memberKind);
    const dataBoundaries = allMembers.map((member) => member.dataBoundary);
    const provisioningStates = allMembers.map((member) => member.provisioningState);
    const minimums = getPilotCohortMinimums();

    const rows = cohorts.map((cohort) => {
      const members = cohort.PilotCohortMember;
      const rowMemberKinds = members.map((member) => member.memberKind);
      const rowProvisioningStates = members.map((member) => member.provisioningState);

      return {
        key: cohort.key,
        name: cohort.name,
        dataBoundary: cohort.dataBoundary,
        startsAt: cohort.startsAt?.toISOString() ?? null,
        ownerContact: contactLabel(cohort.ownerContactName, cohort.ownerContactEmail),
        supportContact: contactLabel(cohort.supportContactName, cohort.supportContactEmail),
        memberCount: members.length,
        vendorMemberCount: countByValue(rowMemberKinds, "VENDOR"),
        firmMemberCount: countByValue(rowMemberKinds, "FIRM"),
        userMemberCount: countByValue(rowMemberKinds, "USER"),
        invitedCount: countByValue(rowProvisioningStates, "INVITED"),
        provisioningCount: countByValue(rowProvisioningStates, "PROVISIONING"),
        activeCount: countByValue(rowProvisioningStates, "ACTIVE"),
        blockedCount: countByValue(rowProvisioningStates, "BLOCKED"),
        archivedCount: countByValue(rowProvisioningStates, "ARCHIVED"),
      } satisfies PilotCohortHealthRow;
    });

    const cohortCount = cohorts.length;
    const memberCount = allMembers.length;
    const vendorMemberCount = countByValue(memberKinds, MEMBER_KINDS[0]);
    const firmMemberCount = countByValue(memberKinds, MEMBER_KINDS[1]);
    const userMemberCount = countByValue(memberKinds, MEMBER_KINDS[2]);
    const pilotBoundaryMemberCount = countByValue(dataBoundaries, DATA_BOUNDARIES[1]);
    const demoBoundaryMemberCount = countByValue(dataBoundaries, DATA_BOUNDARIES[0]);
    const productionBoundaryMemberCount = countByValue(dataBoundaries, DATA_BOUNDARIES[2]);
    const invitedCount = countByValue(provisioningStates, PROVISIONING_STATES[0]);
    const provisioningCount = countByValue(provisioningStates, PROVISIONING_STATES[1]);
    const activeCount = countByValue(provisioningStates, PROVISIONING_STATES[2]);
    const blockedCount = countByValue(provisioningStates, PROVISIONING_STATES[3]);
    const archivedCount = countByValue(provisioningStates, PROVISIONING_STATES[4]);

    const june1PilotReady =
      rows.some((row) => row.key === JUNE_1_PILOT_COHORT.key) &&
      cohortCount >= minimums.cohortCount &&
      memberCount >= minimums.memberCount &&
      vendorMemberCount >= minimums.vendorMemberCount &&
      firmMemberCount >= minimums.firmMemberCount &&
      userMemberCount >= minimums.userMemberCount &&
      pilotBoundaryMemberCount === memberCount &&
      demoBoundaryMemberCount === 0 &&
      productionBoundaryMemberCount === 0;

    return {
      ok: june1PilotReady,
      error: null,
      seedVersion: PILOT_COHORT_SEED_VERSION,
      expectedJune1CohortKey: JUNE_1_PILOT_COHORT.key,
      cohortCount,
      memberCount,
      vendorMemberCount,
      firmMemberCount,
      userMemberCount,
      pilotBoundaryMemberCount,
      demoBoundaryMemberCount,
      productionBoundaryMemberCount,
      invitedCount,
      provisioningCount,
      activeCount,
      blockedCount,
      archivedCount,
      june1PilotReady,
      rows,
    };
  } catch (error) {
    return emptyPilotCohortHealth(error instanceof Error ? error.message : String(error));
  }
}
