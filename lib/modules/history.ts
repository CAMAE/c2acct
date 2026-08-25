import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Per-item response history ("Prerequisite Zero", Block A).
 *
 * This is the write path for ItemResponse. It exists as a function rather than
 * as inline prisma calls at future call sites because ONE invariant has to hold
 * everywhere, forever:
 *
 *   isCorrect is DERIVED SERVER-SIDE from ModuleItem.correctKey at write time.
 *
 * It is never read from a client payload. A grading flag supplied by the thing
 * being graded is not evidence, and every downstream number — item
 * discrimination, p-value, a firm's scoring pattern, the unlocks that pattern
 * drives — is computed from this column. Accepting it from the client would let
 * a caller author its own difficulty calibration.
 *
 * `itemRevisionAt` snapshots ModuleItem.updatedAt in the same read, so a later
 * edit to the item cannot silently rewrite what a past answer was an answer to.
 *
 * Flag-dark: nothing serves from this yet.
 */

export class ModuleHistoryError extends Error {
  constructor(
    public readonly code: "sitting_not_found" | "item_not_found" | "item_not_in_template" | "sitting_closed",
    message: string
  ) {
    super(message);
    this.name = "ModuleHistoryError";
  }
}

export interface RecordItemResponseInput {
  sittingId: string;
  itemId: string;
  /** The answer choice the respondent selected. NEVER a correctness claim. */
  responseKey: string;
  durationMs?: number | null;
  answeredAt?: Date;
}

export interface RecordedItemResponse {
  id: string;
  isCorrect: boolean;
  itemRevisionAt: Date;
}

/**
 * Record one answer. Idempotent per (sittingId, itemId): re-answering the same
 * item in the same sitting UPDATES that row rather than appending a second one,
 * which is what the @@unique([sittingId, itemId]) constraint encodes — one
 * sitting holds one answer per item, and history stays one-row-per-question.
 */
export async function recordItemResponse(
  input: RecordItemResponseInput
): Promise<RecordedItemResponse> {
  const sitting = await prisma.moduleSitting.findUnique({
    where: { id: input.sittingId },
    select: { id: true, companyId: true, templateId: true, status: true },
  });
  if (!sitting) {
    throw new ModuleHistoryError("sitting_not_found", `No ModuleSitting "${input.sittingId}".`);
  }
  if (sitting.status !== "IN_PROGRESS") {
    throw new ModuleHistoryError(
      "sitting_closed",
      `ModuleSitting "${input.sittingId}" is ${sitting.status}; refusing to record an answer against a closed sitting.`
    );
  }

  const item = await prisma.moduleItem.findUnique({
    where: { id: input.itemId },
    select: { id: true, templateId: true, correctKey: true, updatedAt: true },
  });
  if (!item) {
    throw new ModuleHistoryError("item_not_found", `No ModuleItem "${input.itemId}".`);
  }
  // An answer must belong to the template being sat. Without this a caller
  // could pollute one template's calibration with another's responses.
  if (item.templateId !== sitting.templateId) {
    throw new ModuleHistoryError(
      "item_not_in_template",
      `ModuleItem "${input.itemId}" belongs to template "${item.templateId}", not the sitting's "${sitting.templateId}".`
    );
  }

  // THE invariant: graded here, from the item's own correctKey.
  const isCorrect = input.responseKey === item.correctKey;

  const answeredAt = input.answeredAt ?? new Date();
  const row = await prisma.itemResponse.upsert({
    where: { sittingId_itemId: { sittingId: sitting.id, itemId: item.id } },
    create: {
      sittingId: sitting.id,
      itemId: item.id,
      companyId: sitting.companyId,
      responseKey: input.responseKey,
      isCorrect,
      answeredAt,
      durationMs: input.durationMs ?? null,
      itemRevisionAt: item.updatedAt,
    },
    update: {
      responseKey: input.responseKey,
      isCorrect,
      answeredAt,
      durationMs: input.durationMs ?? null,
      itemRevisionAt: item.updatedAt,
    },
    select: { id: true, isCorrect: true, itemRevisionAt: true },
  });

  return row;
}

/**
 * Score a sitting from its recorded responses and close it.
 *
 * The denominator is the SERVE MANIFEST, not the answer count: a firm that
 * skipped half the module scored on what it was shown, otherwise abandoning
 * hard items would inflate the score.
 */
export async function completeSitting(sittingId: string, completedAt: Date = new Date()) {
  const sitting = await prisma.moduleSitting.findUnique({
    where: { id: sittingId },
    select: { id: true, servedItemIds: true, status: true },
  });
  if (!sitting) {
    throw new ModuleHistoryError("sitting_not_found", `No ModuleSitting "${sittingId}".`);
  }

  const served = Array.isArray(sitting.servedItemIds) ? sitting.servedItemIds.length : 0;
  const correct = await prisma.itemResponse.count({ where: { sittingId, isCorrect: true } });
  const scorePercent = served > 0 ? Math.round((correct / served) * 10000) / 100 : 0;

  return prisma.moduleSitting.update({
    where: { id: sittingId },
    data: {
      status: "COMPLETED",
      completedAt,
      scoreRaw: correct,
      scorePercent,
    },
    select: { id: true, status: true, scoreRaw: true, scorePercent: true, scoreVersion: true },
  });
}

/** Narrow helper so callers can detect a unique-constraint collision explicitly. */
export function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
