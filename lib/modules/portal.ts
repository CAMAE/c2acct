import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { scoreBandFor } from "@/lib/bandLexicon";
import { canServeTemplate } from "@/lib/modules/serving";
import { planFinalExam, type ServableBankItem } from "@/lib/modules/qbankServing";
import { isAdaptiveModulesEnabled, resolveUnlocks } from "@/lib/modules/unlock";

/**
 * Firm-portal module surface — the server-side data layer for Block B.
 *
 * EVERY entry point goes through requireFirmModuleAccess(), which is the single
 * gate for three separate things:
 *   1. The flag. PAT_ENABLE_ADAPTIVE_MODULES off means notFound() — no route,
 *      not a hidden element. A `display:none` surface is still a served route.
 *   2. Role. Only a signed-in FIRM company reaches these pages. A consultant,
 *      vendor, or admin gets 404, NOT 403: a 403 confirms the route exists,
 *      which is itself a disclosure. They have no business knowing.
 *   3. Tenancy. companyId comes from the session, never from a URL parameter,
 *      so a firm cannot address another firm's modules by editing an id.
 *
 * The APPROVED wall is applied twice on purpose: resolveUnlocks() already
 * filters on it, and canServeTemplate() is re-asserted here at the serving edge.
 * Belt and braces — the serving guard is the documented single enforcement
 * point, and a future change to the resolver must not be able to quietly open
 * unpublished content.
 */

export interface FirmModuleAccess {
  companyId: string;
  userId: string;
}

/** The one gate. Throws Next's notFound() for flag-off, wrong role, or no company. */
export async function requireFirmModuleAccess(): Promise<FirmModuleAccess> {
  if (!isAdaptiveModulesEnabled()) {
    notFound();
  }
  const sessionUser = await getSessionUser();
  if (!sessionUser?.companyId) {
    notFound();
  }
  const company = await prisma.company.findUnique({
    where: { id: sessionUser.companyId },
    select: { id: true, type: true, deletedAt: true },
  });
  // Non-firm roles and soft-deleted tenants get 404, never 403.
  if (!company || company.type !== "FIRM" || company.deletedAt !== null) {
    notFound();
  }
  return { companyId: company.id, userId: sessionUser.id };
}

export type SittingStatusLabel = "Not started" | "In progress" | "Completed";

export interface FirmModuleCard {
  templateId: string;
  title: string;
  category: string;
  /** Customer-facing module type label. */
  moduleType: "Diagnostic" | "Strength" | "Remediation";
  itemCount: number;
  status: SittingStatusLabel;
  /** Present only when a sitting has completed. */
  scorePercent: number | null;
  scoreBandLabel: string | null;
  /**
   * The sitting this card's button should open — the in-progress one when a
   * module is open, or the completed one so "Review" shows the RESULT rather
   * than starting a fresh sitting over the top of it.
   */
  sittingId: string | null;
}

const MODULE_TYPE_LABEL: Record<string, FirmModuleCard["moduleType"]> = {
  DIAGNOSTIC: "Diagnostic",
  STRENGTH: "Strength",
  REMEDIATION: "Remediation",
};

/**
 * The cards a firm may see: exactly the templates resolveUnlocks() returns,
 * re-checked against the serving guard, decorated with this firm's own sitting
 * status. Locked modules are simply absent — no teasers, no locked-state cards.
 */
export async function listFirmModuleCards(companyId: string, now: Date = new Date()): Promise<FirmModuleCard[]> {
  const unlocked = await resolveUnlocks(companyId, now);
  if (unlocked.length === 0) {
    return [];
  }

  const templates = await prisma.moduleTemplate.findMany({
    where: { id: { in: unlocked.map((entry) => entry.templateId) } },
    select: {
      id: true,
      title: true,
      category: true,
      moduleType: true,
      reviewStatus: true,
      active: true,
      _count: { select: { ModuleItem: true } },
    },
  });

  // Belt and braces at the serving edge (see the module docblock).
  const servable = templates.filter((template) => canServeTemplate(template) && template.active);

  const sittings = await prisma.moduleSitting.findMany({
    where: { companyId, templateId: { in: servable.map((template) => template.id) } },
    orderBy: { startedAt: "desc" },
    select: { id: true, templateId: true, status: true, scorePercent: true },
  });
  // Newest sitting per template wins — the list is already newest-first.
  const latestByTemplate = new Map<string, (typeof sittings)[number]>();
  for (const sitting of sittings) {
    if (!latestByTemplate.has(sitting.templateId)) {
      latestByTemplate.set(sitting.templateId, sitting);
    }
  }

  const cards = servable.map((template) => {
    const sitting = latestByTemplate.get(template.id) ?? null;
    const status: SittingStatusLabel =
      sitting?.status === "COMPLETED" ? "Completed" : sitting?.status === "IN_PROGRESS" ? "In progress" : "Not started";
    const scorePercent = sitting?.status === "COMPLETED" ? (sitting.scorePercent ?? null) : null;

    return {
      templateId: template.id,
      title: template.title,
      category: template.category,
      moduleType: MODULE_TYPE_LABEL[template.moduleType] ?? "Diagnostic",
      itemCount: template._count.ModuleItem,
      status,
      scorePercent,
      scoreBandLabel: scorePercent === null ? null : scoreBandFor(scorePercent).label,
      // Both IN_PROGRESS and COMPLETED resolve to a sitting id: reviewing a
      // finished module must never re-enter the serving engine.
      sittingId: sitting && sitting.status !== "ABANDONED" ? sitting.id : null,
    } satisfies FirmModuleCard;
  });

  return cards.sort((left, right) => (left.title < right.title ? -1 : left.title > right.title ? 1 : 0));
}

/**
 * Confirm a template is unlocked FOR THIS FIRM before anything is served from
 * it. Called on every sitting route so a firm cannot reach a module by URL that
 * its own pattern never unlocked.
 */
export async function assertTemplateUnlocked(companyId: string, templateId: string, now: Date = new Date()) {
  const unlocked = await resolveUnlocks(companyId, now);
  if (!unlocked.some((entry) => entry.templateId === templateId)) {
    notFound();
  }
  const template = await prisma.moduleTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, title: true, category: true, moduleType: true, reviewStatus: true, active: true },
  });
  if (!template || !canServeTemplate(template) || !template.active) {
    notFound();
  }
  return template;
}

/**
 * Start or resume this firm's sitting for a template.
 *
 * ONE resumable sitting per (company, template): an existing IN_PROGRESS row is
 * returned as-is, manifest intact, so a refresh or a return visit continues the
 * same exam rather than redrawing it. A redraw would silently change what the
 * score means.
 */
/**
 * The newest sitting for this firm + template, whatever its status. Used by the
 * sitting route so an explicit visit lands on the existing result instead of
 * silently opening a new exam over a completed one.
 */
export async function findLatestSitting(companyId: string, templateId: string): Promise<string | null> {
  const sitting = await prisma.moduleSitting.findFirst({
    where: { companyId, templateId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  return sitting?.id ?? null;
}

export async function startOrResumeSitting(input: {
  companyId: string;
  userId: string;
  templateId: string;
}): Promise<{ sittingId: string; servedItemIds: string[] }> {
  const existing = await prisma.moduleSitting.findFirst({
    where: { companyId: input.companyId, templateId: input.templateId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true, servedItemIds: true },
  });
  if (existing) {
    return {
      sittingId: existing.id,
      servedItemIds: Array.isArray(existing.servedItemIds) ? (existing.servedItemIds as string[]) : [],
    };
  }

  const template = await prisma.moduleTemplate.findUniqueOrThrow({
    where: { id: input.templateId },
    select: { id: true, reviewStatus: true },
  });

  const bank = await prisma.moduleItem.findMany({
    where: { templateId: input.templateId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      key: true,
      difficulty: true,
      isAnchor: true,
      discriminationSeed: true,
      ModuleSource: { select: { id: true } },
    },
  });

  const idByKey = new Map(bank.map((item) => [item.key, item.id]));
  const servable: ServableBankItem[] = bank.map((item) => ({
    key: item.key,
    difficulty: item.difficulty,
    isAnchor: item.isAnchor,
    discriminationSeed: item.discriminationSeed,
    sources: item.ModuleSource,
  }));

  // The deterministic serving engine owns the draw — this route never invents
  // its own selection.
  const plan = planFinalExam(servable, input.userId, template, Math.min(bank.length, 30));
  if (!plan.servable) {
    notFound();
  }
  const servedItemIds = plan.items
    .map((item) => idByKey.get(item.key))
    .filter((id): id is string => typeof id === "string");

  const sitting = await prisma.moduleSitting.create({
    data: {
      companyId: input.companyId,
      templateId: input.templateId,
      userId: input.userId,
      servedItemIds,
    },
    select: { id: true },
  });
  return { sittingId: sitting.id, servedItemIds };
}

export interface SittingView {
  sittingId: string;
  templateId: string;
  title: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  total: number;
  answeredCount: number;
  scorePercent: number | null;
  scoreRaw: number | null;
  scoreBandLabel: string | null;
  /** The next unanswered item, or null when the sitting is finished. */
  currentItem: {
    id: string;
    index: number;
    stem: string;
    choices: Array<{ key: string; label: string }>;
  } | null;
}

/** Load a sitting for rendering. Tenancy-checked: the sitting must be this firm's. */
export async function loadSittingView(companyId: string, sittingId: string): Promise<SittingView> {
  const sitting = await prisma.moduleSitting.findUnique({
    where: { id: sittingId },
    select: {
      id: true,
      companyId: true,
      templateId: true,
      status: true,
      servedItemIds: true,
      scorePercent: true,
      scoreRaw: true,
      ModuleTemplate: { select: { title: true, reviewStatus: true, active: true } },
    },
  });
  // A sitting belonging to another company is unreachable, and indistinguishable
  // from one that does not exist.
  if (!sitting || sitting.companyId !== companyId) {
    notFound();
  }
  if (!canServeTemplate(sitting.ModuleTemplate) || !sitting.ModuleTemplate.active) {
    notFound();
  }

  const servedItemIds = Array.isArray(sitting.servedItemIds) ? (sitting.servedItemIds as string[]) : [];
  const answered = await prisma.itemResponse.findMany({
    where: { sittingId: sitting.id },
    select: { itemId: true },
  });
  const answeredIds = new Set(answered.map((row) => row.itemId));
  const nextItemId = servedItemIds.find((itemId) => !answeredIds.has(itemId)) ?? null;

  let currentItem: SittingView["currentItem"] = null;
  if (nextItemId && sitting.status === "IN_PROGRESS") {
    const item = await prisma.moduleItem.findUnique({
      where: { id: nextItemId },
      select: { id: true, stem: true, choices: true },
    });
    if (item) {
      currentItem = {
        id: item.id,
        index: servedItemIds.indexOf(item.id) + 1,
        stem: item.stem,
        // Choices carry NO correctness marker — the answer key never leaves the
        // server (grading happens in recordItemResponse).
        choices: Array.isArray(item.choices)
          ? (item.choices as Array<{ key: string; label: string }>).map((choice) => ({
              key: String(choice.key),
              label: String(choice.label),
            }))
          : [],
      };
    }
  }

  return {
    sittingId: sitting.id,
    templateId: sitting.templateId,
    title: sitting.ModuleTemplate.title,
    status: sitting.status,
    total: servedItemIds.length,
    answeredCount: answeredIds.size,
    scorePercent: sitting.scorePercent,
    scoreRaw: sitting.scoreRaw,
    scoreBandLabel: sitting.scorePercent === null ? null : scoreBandFor(sitting.scorePercent).label,
    currentItem,
  };
}
