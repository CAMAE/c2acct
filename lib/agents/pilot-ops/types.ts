export type ProvisioningState = "INVITED" | "PROVISIONING" | "ACTIVE" | "BLOCKED" | "ARCHIVED";

export interface PilotMemberSnapshot {
  id: string;
  kind: string; // VENDOR | FIRM | USER
  provisioningState: ProvisioningState;
  createdAtMs: number;
  displayName: string; // inviteEmail / user email / company — best available label
}

export interface HealthSummary {
  total: number;
  active: number;
  provisioning: number;
  invited: number;
  stalled: number; // INVITED longer than the stalled threshold
  blocked: number;
  archived: number;
  stalledMembers: string[];
  blockedMembers: string[];
}

export interface InvitationDraft {
  firm: string;
  to: string;
  subject: string;
  body: string;
}

export interface InvitationAction {
  executed: boolean;
  reason: string;
  draft?: InvitationDraft;
}
