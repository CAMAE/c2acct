"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { completeSitting, recordItemResponse } from "@/lib/modules/history";
import {
  assertTemplateUnlocked,
  loadSittingView,
  requireFirmModuleAccess,
  startOrResumeSitting,
} from "@/lib/modules/portal";

/**
 * Server actions for the firm module sitting flow.
 *
 * Every action re-runs requireFirmModuleAccess() itself. A server action is a
 * separately addressable POST endpoint — it does NOT inherit the page's gate —
 * so checking only on the page that renders the form would leave the mutation
 * reachable with the flag off or by a non-firm role.
 *
 * Writes go exclusively through recordItemResponse() / completeSitting(). No
 * direct prisma writes live here, so the server-side grading, closed-sitting,
 * and template-membership guards stay the single path they were built to be.
 */

export async function startModuleAction(formData: FormData): Promise<void> {
  const { companyId, userId } = await requireFirmModuleAccess();
  const templateId = String(formData.get("templateId") ?? "");
  // Confirms this firm's own pattern unlocked it; 404s otherwise.
  await assertTemplateUnlocked(companyId, templateId);

  const { sittingId } = await startOrResumeSitting({ companyId, userId, templateId });
  revalidatePath("/firm/modules");
  redirect(`/firm/modules/${templateId}?sitting=${sittingId}`);
}

export async function answerItemAction(formData: FormData): Promise<void> {
  const { companyId } = await requireFirmModuleAccess();
  const sittingId = String(formData.get("sittingId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const responseKey = String(formData.get("responseKey") ?? "");

  // Tenancy: loadSittingView 404s a sitting that is not this company's.
  const view = await loadSittingView(companyId, sittingId);

  if (responseKey) {
    // Duration is measured SERVER-SIDE, from the previous answer (or the
    // sitting start for the first one). A client-supplied elapsed time is
    // exactly as untrustworthy as a client-supplied isCorrect — and this value
    // feeds item calibration, so it has to be earned the same way.
    const durationMs = await elapsedSinceLastAnswer(sittingId);
    // NOTE: no correctness value is sent or accepted — recordItemResponse
    // grades against ModuleItem.correctKey server-side.
    await recordItemResponse({ sittingId, itemId, responseKey, durationMs });
  }

  revalidatePath(`/firm/modules/${view.templateId}`);
}

/** Wall-clock since the previous answer in this sitting, or since it started. */
async function elapsedSinceLastAnswer(sittingId: string): Promise<number | null> {
  const [sitting, previous] = await Promise.all([
    prisma.moduleSitting.findUnique({ where: { id: sittingId }, select: { startedAt: true } }),
    prisma.itemResponse.findFirst({
      where: { sittingId },
      orderBy: { answeredAt: "desc" },
      select: { answeredAt: true },
    }),
  ]);
  const since = previous?.answeredAt ?? sitting?.startedAt ?? null;
  if (!since) {
    return null;
  }
  const elapsed = Date.now() - since.getTime();
  return elapsed >= 0 ? elapsed : null;
}

export async function completeModuleAction(formData: FormData): Promise<void> {
  const { companyId } = await requireFirmModuleAccess();
  const sittingId = String(formData.get("sittingId") ?? "");
  const view = await loadSittingView(companyId, sittingId);

  await completeSitting(sittingId);
  revalidatePath(`/firm/modules/${view.templateId}`);
  redirect(`/firm/modules/${view.templateId}?sitting=${sittingId}`);
}
