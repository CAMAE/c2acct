"use server";

import { revalidatePath } from "next/cache";
import { requireConsultantSession } from "@/lib/consultantAccess";
import {
  upsertBriefEditChoiceForConsultant,
  type BriefEditChoiceInput,
  type BriefEditChoiceResult,
} from "@/lib/briefEditChoice";

/**
 * Phase-4 Day-17 server action wrapper for the BriefEditChoice API.
 *
 * Pulls consultantProfileId from the session so a client component can
 * never supply a forged consultant id. The wrapper then delegates to
 * lib/briefEditChoice.ts which enforces Invariant 3 (tenancy gate before
 * any write).
 *
 * Returns the same discriminated union the underlying API uses; clients
 * map { ok: true } / { ok: false, reason } to optimistic-revert UI.
 */
export async function submitBriefEditChoice(
  input: BriefEditChoiceInput
): Promise<BriefEditChoiceResult> {
  const access = await requireConsultantSession();
  if (!access) {
    return { ok: false, reason: "not-found" };
  }

  const result = await upsertBriefEditChoiceForConsultant(
    access.consultantProfileId,
    input
  );

  if (result.ok) {
    // Refresh the brief route on success so a same-tab reload picks up
    // the newly-applied choice from the read-side composition path
    // (Block 4). Components also apply optimistic state for sub-500ms
    // perceived latency.
    const path =
      input.briefKind === "vendor"
        ? `/consultants/ecosystems/${input.ecosystemId}/vendor-brief`
        : `/consultants/ecosystems/${input.ecosystemId}/firm/${input.briefId}`;
    revalidatePath(path);
  }

  return result;
}
