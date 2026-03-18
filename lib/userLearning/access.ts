import type { CompanyType, PlatformRole, UserRole } from "@prisma/client";
import { isAdminRole, isPlatformOperator } from "@/lib/authz";

type AccessInput = {
  viewerUserId: string;
  viewerRole: UserRole;
  viewerPlatformRole: PlatformRole;
  currentCompanyId: string | null;
  currentCompanyType: CompanyType | null;
  targetUserId: string;
  targetCompanyId: string;
  targetUserCompanyIds: string[];
};

export function canAccessOwnLearning(input: Pick<AccessInput, "viewerUserId" | "targetUserId">) {
  return input.viewerUserId === input.targetUserId;
}

export function canInspectCompanyLearning(input: AccessInput) {
  if (isPlatformOperator(input.viewerPlatformRole)) {
    return true;
  }

  if (canAccessOwnLearning(input)) {
    return input.currentCompanyId === input.targetCompanyId;
  }

  if (!input.currentCompanyId || input.currentCompanyType !== "FIRM") {
    return false;
  }

  if (!isAdminRole(input.viewerRole)) {
    return false;
  }

  return (
    input.currentCompanyId === input.targetCompanyId &&
    input.targetUserCompanyIds.includes(input.currentCompanyId)
  );
}
