import prisma from "@/lib/prisma";

/**
 * Admin catalog loaders (Finish box, 2026-09-08 — Mythos ruling "admin list
 * ordering = fix by explicit orderBy"). Every list and every nested relation
 * carries an explicit order — stable key first, then the display name — so two
 * renders of /admin/modules or /admin/insights/rules produce the same order.
 * Before this, the nested rules/capabilities had no orderBy and their order
 * changed between server process starts. Pinned by
 * tests/admin-catalog-ordering.contract.test.ts.
 */
export async function loadAdminModulesCatalog() {
  const [modules, capabilityNodes] = await Promise.all([
    prisma.surveyModule.findMany({
      orderBy: { key: "asc" },
      include: {
        ModuleCapability: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
          orderBy: [{ nodeId: "asc" }, { CapabilityNode: { title: "asc" } }],
        },
        SurveySection: {
          orderBy: { order: "asc" },
          include: {
            SurveyQuestion: {
              orderBy: { order: "asc" },
              include: {
                SurveyQuestionCapability: {
                  include: {
                    CapabilityNode: {
                      select: { title: true },
                    },
                  },
                  orderBy: [{ nodeId: "asc" }, { CapabilityNode: { title: "asc" } }],
                },
              },
            },
          },
        },
      },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
  ]);
  return { modules, capabilityNodes };
}

export async function loadAdminInsightRules() {
  const [insights, capabilityNodes, badges] = await Promise.all([
    prisma.insight.findMany({
      orderBy: { key: "asc" },
      include: {
        InsightCapabilityRule: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
          orderBy: [{ nodeId: "asc" }, { CapabilityNode: { title: "asc" } }],
        },
        InsightUnlockRule: {
          include: {
            Badge: {
              select: { name: true },
            },
          },
          orderBy: [{ badgeId: "asc" }, { Badge: { name: "asc" } }],
        },
      },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.badge.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return { insights, capabilityNodes, badges };
}
